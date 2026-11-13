#!/usr/bin/env python3
"""Cross-platform developer tooling for the gitgui dev backend (localhost:5180).

The desktop app is a Python web server + browser UI. While developing against
the Vite dev server (which hard-codes ``http://localhost:5180`` as its proxy
target) the backend must stay on port 5180. This script is the single source of
truth for checking, starting, stopping, restarting and health-checking that
backend — for humans and agents alike — using **only the Python stdlib** (Python
is already a hard requirement of the app), so it behaves identically on
Windows, macOS and Linux.

Usage:
    python dev_backend.py status    [--working-tree PATH] [--git-directory-location PATH] [--port N] [--json]
    python dev_backend.py start     [--working-tree PATH] [--git-directory-location PATH] [--port N]
    python dev_backend.py stop      [--port N]
    python dev_backend.py restart   [--working-tree PATH] [--git-directory-location PATH] [--port N]
    python dev_backend.py health    [--port N] [--json]
    python dev_backend.py logs      [--lines N]

Exit codes: 0 = success / healthy / running, 1 = error / not running, so callers
and agents can chain with ``&&`` / ``||``.

Design:
- A pid file (``.gitgui-dev-backend.pid``, gitignored) is the authoritative record
  of the process *this tool* started, so ``stop``/``restart`` kill exactly that
  process — fully portable, no ``lsof`` guessing.
- Only as a *fallback* (a backend started outside this tool, e.g. the VS Code
  debugger) do we locate whatever is listening on the port. That is the only
  OS-specific code (netstat on Windows, lsof elsewhere).
- ``start`` is idempotent (already running -> no-op) and starts the backend
  headlessly (``--browser no-op``), so it never pops open a browser tab.
- ``start`` pins the port with ``--config-webserver-port 5180`` (fixed: fail if
  occupied) so the backend never silently drifts off the Vite proxy port.
- The default working tree / git directory is the repo itself (``.``), so a
  fresh checkout can be served without pointing at any external project.
- Backend output goes to ``.gitgui-dev-backend.log`` (gitignored); ``logs`` tails it.
- Success messages print green and the key failure message prints red on an
  interactive terminal (respecting ``NO_COLOR``); piped output stays plain.
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import socket
import subprocess
import sys
import time
from http.client import HTTPConnection
from pathlib import Path

DEFAULT_PORT = 5180
DEFAULT_WORKING_TREE = "."
DEFAULT_GIT_DIRECTORY_LOCATION = "."
PID_FILE_NAME = ".gitgui-dev-backend.pid"
LOG_FILE_NAME = ".gitgui-dev-backend.log"
HEALTH_PATH = "/health"
HEALTH_TIMEOUT_SECONDS = 2.0
START_WAIT_SECONDS = 15.0
START_POLL_SECONDS = 0.25

# ANSI colors for human-readable success/failure messages. They are emitted only
# when stdout is an interactive terminal (and not suppressed via NO_COLOR), so
# piped or agent-parsed output stays clean.
GREEN = "\033[32m"
RED = "\033[31m"
RESET = "\033[0m"


def _colors_enabled() -> bool:
    """Whether ANSI colors should be emitted on stdout right now."""
    if os.environ.get("NO_COLOR"):
        return False
    if not sys.stdout.isatty():
        return False
    if os.name == "nt":
        # Best-effort enable virtual-terminal processing on Windows 10+ consoles;
        # harmless on older consoles (the escape codes are simply ignored).
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            stdout_handle = kernel32.GetStdHandle(-11)  # STD_OUTPUT_HANDLE
            mode = ctypes.c_uint32()
            if kernel32.GetConsoleMode(stdout_handle, ctypes.byref(mode)):
                # ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004
                kernel32.SetConsoleMode(stdout_handle, mode.value | 0x0004)
        except Exception:
            pass
    return True


def _paint(text: str, color: str) -> str:
    if not _colors_enabled():
        return text
    return f"{color}{text}{RESET}"


def _success(text: str) -> str:
    return _paint(text, GREEN)


def _error(text: str) -> str:
    return _paint(text, RED)


def repo_root() -> Path:
    """Directory this script lives in (the repo root)."""
    return Path(__file__).resolve().parent


def venv_python(root: Path | None = None) -> str | None:
    """Path to the project venv Python, or ``None`` if the venv is missing."""
    root = root or repo_root()
    for rel in (".venv/Scripts/python.exe", ".venv/bin/python"):
        candidate = root / rel
        if candidate.is_file():
            return str(candidate)
    return None


def pid_file_path(root: Path | None = None) -> Path:
    return (root or repo_root()) / PID_FILE_NAME


def log_file_path(root: Path | None = None) -> Path:
    return (root or repo_root()) / LOG_FILE_NAME


def read_pid(root: Path | None = None) -> int | None:
    try:
        text = pid_file_path(root).read_text(encoding="utf-8").strip()
        return int(text) if text else None
    except (OSError, ValueError):
        return None


def write_pid(pid: int, root: Path | None = None) -> None:
    pid_file_path(root).write_text(f"{pid}\n", encoding="utf-8")


def remove_pid(root: Path | None = None) -> None:
    try:
        pid_file_path(root).unlink()
    except OSError:
        pass


def pid_is_alive(pid: int) -> bool:
    """Cross-platform check that a process with this pid still exists."""
    if not isinstance(pid, int) or pid <= 0:
        return False
    if os.name == "nt":
        try:
            result = subprocess.run(
                ["tasklist", "/FI", f"PID eq {pid}", "/NH"],
                capture_output=True, text=True, timeout=5,
            )
            return str(pid) in result.stdout
        except (OSError, subprocess.SubprocessError):
            return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except (PermissionError, OSError):
        return True
    return True


def is_healthy(
    port: int = DEFAULT_PORT,
    path: str = HEALTH_PATH,
    timeout: float = HEALTH_TIMEOUT_SECONDS,
) -> tuple[bool, str]:
    """HTTP probe: is a backend answering HTTP 200 on ``localhost:port``?

    gitgui's ``/health`` endpoint returns 200 only for a HEAD request (anything
    else is 405), so the probe sends HEAD. Tries ``localhost`` then
    ``127.0.0.1`` to be robust to IPv4/IPv6 mismatch.
    """
    last_error = "no connection attempted"
    for host in ("localhost", "127.0.0.1"):
        connection = HTTPConnection(host, port, timeout=timeout)
        try:
            connection.request("HEAD", path)
            response = connection.getresponse()
            response.read()
            if response.status == 200:
                return True, f"HTTP 200 ({host})"
            return False, f"HTTP {response.status} (expected 200)"
        except OSError as exc:
            last_error = f"{host}: {exc}"
        finally:
            connection.close()
    return False, last_error


def find_pids_on_port(port: int) -> list[int]:
    """Best-effort PIDs listening on ``port`` (fallback when there is no pid file)."""
    pids: list[int] = []
    if os.name == "nt":
        try:
            out = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True, text=True, timeout=10,
            ).stdout
        except (OSError, subprocess.SubprocessError):
            return pids
        for line in out.splitlines():
            if "LISTENING" not in line.upper():
                continue
            tokens = line.split()
            if len(tokens) < 2:
                continue
            if tokens[1].endswith(f":{port}"):
                try:
                    pids.append(int(tokens[-1]))
                except (ValueError, IndexError):
                    pass
    else:
        try:
            out = subprocess.run(
                ["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN", "-t"],
                capture_output=True, text=True, timeout=10,
            ).stdout
        except (OSError, subprocess.SubprocessError):
            return pids
        for line in out.splitlines():
            line = line.strip()
            if line.isdigit():
                pids.append(int(line))
    return sorted(set(pids))


def terminate_pid(pid: int) -> None:
    """Terminate a process (and, on Windows, its child tree)."""
    if pid <= 0:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(pid), "/T", "/F"],
            capture_output=True, timeout=10,
        )
        return
    for sig in (signal.SIGTERM, signal.SIGKILL):
        try:
            os.kill(pid, sig)
        except OSError:
            return
        for _ in range(50):  # up to ~5s of grace
            if not pid_is_alive(pid):
                return
            time.sleep(0.1)


def stop_backend(port: int = DEFAULT_PORT, root: Path | None = None) -> tuple[bool, str]:
    """Stop the backend (idempotent). Returns ``(stopped_something, message)``."""
    messages: list[str] = []
    stopped = False

    pid = read_pid(root)
    if pid is not None:
        if pid_is_alive(pid):
            terminate_pid(pid)
            stopped = True
            messages.append(f"stopped pid {pid} (from pid file)")
        remove_pid(root)

    for candidate in find_pids_on_port(port):
        if candidate == os.getpid():
            continue
        terminate_pid(candidate)
        stopped = True
        messages.append(f"stopped pid {candidate} (listening on port {port})")

    if not stopped:
        messages.append("backend was not running")
    return stopped, "; ".join(messages)


def _spawn(command: list[str], root: Path) -> subprocess.Popen:
    """Detach a child process with stdout/stderr redirected to the log file."""
    log_handle = open(log_file_path(root), "a", encoding="utf-8")
    kwargs = {
        "cwd": str(root),
        "stdout": log_handle,
        "stderr": subprocess.STDOUT,
        "start_new_session": os.name != "nt",
    }
    if os.name == "nt":
        kwargs["creationflags"] = (
            subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
        )
    try:
        return subprocess.Popen(command, **kwargs)
    finally:
        log_handle.close()


def start_backend(
    working_tree: str = DEFAULT_WORKING_TREE,
    git_directory_location: str = DEFAULT_GIT_DIRECTORY_LOCATION,
    port: int = DEFAULT_PORT,
    root: Path | None = None,
    wait: float = START_WAIT_SECONDS,
) -> tuple[bool, str]:
    """Start the backend on ``port`` if it is not already healthy (idempotent)."""
    root = root or repo_root()

    python = venv_python(root)
    if not python:
        return False, (
            "no project venv found — run `./build.sh` once to create .venv "
            "and install dependencies"
        )

    wt = Path(working_tree)
    if not wt.is_absolute():
        wt = root / wt
    if not wt.is_dir():
        return False, f"working tree not found: {working_tree}"

    gitloc = Path(git_directory_location)
    if not gitloc.is_absolute():
        gitloc = root / gitloc
    if not (gitloc / ".git").is_dir():
        return False, (
            f"git directory not found (expected {gitloc / '.git'}): "
            f"{git_directory_location}"
        )

    healthy, detail = is_healthy(port)
    if healthy:
        return True, f"already running on port {port} ({detail})"

    # Port busy by a stale/non-healthy process: clear it before starting.
    for candidate in find_pids_on_port(port):
        if candidate != os.getpid():
            terminate_pid(candidate)

    command = [
        python, "-m", "src.launcher", "--program", "gitgui",
        "--working-tree", str(wt),
        "--git-directory-location", str(gitloc),
        "--browser", "no-op",
        # Pin the port: a fixed `5180` (no "+") means "fail if occupied", which
        # keeps Vite's hard-coded localhost:5180 proxy target honest instead of
        # silently drifting to 5181+.
        "--config-webserver-port", str(port),
    ]
    process = _spawn(command, root)
    write_pid(process.pid, root)

    deadline = time.monotonic() + wait
    while time.monotonic() < deadline:
        healthy, detail = is_healthy(port)
        if healthy:
            return True, f"started pid {process.pid} on http://localhost:{port} ({detail})"
        if process.poll() is not None:
            remove_pid(root)
            return False, (
                f"backend process {process.pid} exited early with code "
                f"{process.returncode}; see `python dev_backend.py logs`"
            )
        time.sleep(START_POLL_SECONDS)

    return False, (
        f"backend pid {process.pid} did not become healthy on port {port} "
        f"within {wait:.0f}s; see `python dev_backend.py logs`"
    )


def backend_status(port: int = DEFAULT_PORT, root: Path | None = None) -> dict:
    pid = read_pid(root)
    healthy, detail = is_healthy(port)
    return {
        "port": port,
        "pid": pid,
        "pid_alive": pid_is_alive(pid) if pid is not None else False,
        "healthy": healthy,
        "detail": detail,
        "listeners": find_pids_on_port(port),
        "running": healthy,
    }


def _print_status(status: dict, as_json: bool) -> int:
    if as_json:
        print(json.dumps(status, indent=2))
    else:
        state = "running/healthy" if status["healthy"] else "not running"
        state_line = f"port {status['port']}: {state}"
        print(_success(state_line) if status["healthy"] else _error(state_line))
        print(f"  pid: {status['pid']} (alive: {status['pid_alive']})")
        print(f"  health: {status['detail']}")
        if status["listeners"]:
            print(f"  listeners: {status['listeners']}")
    return 0 if status["healthy"] else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="dev_backend.py",
        description=f"Manage the gitgui dev backend (localhost:{DEFAULT_PORT}).",
    )
    parser.add_argument(
        "command",
        choices=["status", "start", "stop", "restart", "health", "logs"],
    )
    parser.add_argument("--working-tree", default=DEFAULT_WORKING_TREE)
    parser.add_argument("--git-directory-location", default=DEFAULT_GIT_DIRECTORY_LOCATION)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--lines", type=int, default=50)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    command = args.command

    if command == "status":
        return _print_status(backend_status(args.port), args.json)

    if command == "health":
        healthy, detail = is_healthy(args.port)
        if args.json:
            print(json.dumps({"port": args.port, "healthy": healthy, "detail": detail}))
        else:
            message = (
                f"port {args.port}: "
                + ("healthy (HTTP 200)" if healthy else f"unhealthy — {detail}")
            )
            print(_success(message) if healthy else _error(message))
        return 0 if healthy else 1

    if command == "start":
        ok, message = start_backend(args.working_tree, args.git_directory_location, args.port)
        print(_success(message) if ok else _error(message))
        return 0 if ok else 1

    if command == "stop":
        stopped, message = stop_backend(args.port)
        print(_success(message) if stopped else message)
        return 0

    if command == "restart":
        stop_backend(args.port)
        time.sleep(0.3)  # give the OS a beat to release the listen socket
        ok, message = start_backend(args.working_tree, args.git_directory_location, args.port)
        print(_success(message) if ok else _error(message))
        return 0 if ok else 1

    if command == "logs":
        try:
            lines = log_file_path().read_text(encoding="utf-8").splitlines()
        except OSError:
            print(_error(f"no log file at {log_file_path()}"))
            return 1
        print("\n".join(lines[-args.lines:]) if lines else "(empty log)")
        return 0

    build_parser().error(f"unknown command: {command}")
    return 1


if __name__ == "__main__":
    sys.exit(main())