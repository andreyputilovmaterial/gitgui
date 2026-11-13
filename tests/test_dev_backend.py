"""Tests for the cross-platform dev backend tooling (dev_backend.py)."""

import os
import shutil
import socket
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

import dev_backend


class _OkHandler(BaseHTTPRequestHandler):
    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, *args):
        pass


def _unused_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def test_venv_python_finds_windows_exe(tmp_path):
    scripts = tmp_path / ".venv" / "Scripts"
    scripts.mkdir(parents=True)
    exe = scripts / "python.exe"
    exe.write_text("")
    assert dev_backend.venv_python(tmp_path) == str(exe)


def test_venv_python_finds_posix_bin(tmp_path):
    bin_dir = tmp_path / ".venv" / "bin"
    bin_dir.mkdir(parents=True)
    exe = bin_dir / "python"
    exe.write_text("")
    assert dev_backend.venv_python(tmp_path) == str(exe)


def test_venv_python_none_when_missing(tmp_path):
    assert dev_backend.venv_python(tmp_path) is None


def test_pid_file_roundtrip(tmp_path):
    assert dev_backend.read_pid(tmp_path) is None
    dev_backend.write_pid(12345, tmp_path)
    assert dev_backend.read_pid(tmp_path) == 12345
    dev_backend.remove_pid(tmp_path)
    assert dev_backend.read_pid(tmp_path) is None


def test_read_pid_ignores_garbage(tmp_path):
    dev_backend.pid_file_path(tmp_path).write_text("not-a-number\n")
    assert dev_backend.read_pid(tmp_path) is None


def test_pid_is_alive_self():
    assert dev_backend.pid_is_alive(os.getpid()) is True


def test_pid_is_alive_bogus():
    assert dev_backend.pid_is_alive(999999999) is False
    assert dev_backend.pid_is_alive(0) is False
    assert dev_backend.pid_is_alive(-1) is False


def test_is_healthy_true_and_false():
    server = HTTPServer(("127.0.0.1", 0), _OkHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        ok, detail = dev_backend.is_healthy(port)
        assert ok is True
        assert "HTTP 200" in detail
    finally:
        server.shutdown()
        server.server_close()

    ok, detail = dev_backend.is_healthy(_unused_port())
    assert ok is False


@pytest.mark.skipif(os.name == "nt", reason="netstat parsing not exercised here")
@pytest.mark.skipif(shutil.which("lsof") is None, reason="lsof not available")
def test_find_pids_on_port_finds_self():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        s.listen(1)
        port = s.getsockname()[1]
        pids = dev_backend.find_pids_on_port(port)
    assert os.getpid() in pids


def test_parser_defaults():
    args = dev_backend.build_parser().parse_args(["status"])
    assert args.command == "status"
    assert args.port == dev_backend.DEFAULT_PORT
    assert args.working_tree == dev_backend.DEFAULT_WORKING_TREE
    assert args.git_directory_location == dev_backend.DEFAULT_GIT_DIRECTORY_LOCATION
    assert args.json is False


def test_parser_overrides():
    args = dev_backend.build_parser().parse_args(
        ["restart", "--working-tree", "wt", "--git-directory-location", "gd",
         "--port", "6000", "--json", "--lines", "10"]
    )
    assert args.command == "restart"
    assert args.working_tree == "wt"
    assert args.git_directory_location == "gd"
    assert args.port == 6000
    assert args.json is True
    assert args.lines == 10


def test_main_health_unhealthy_returns_1(capsys):
    assert dev_backend.main(["health", "--port", str(_unused_port())]) == 1


def test_main_status_not_running_returns_1(capsys):
    assert dev_backend.main(["status", "--port", str(_unused_port())]) == 1
