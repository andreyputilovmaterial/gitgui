"""Tests for stdin support in src/cli_proxy_caller.

These cover the three layers the feature adds:

1. the read-conventions registry + its built-in framing readers (unit tests),
2. ``send_input`` — the "each stdin request is a child job" model, exercised
   end-to-end against a real long-lived ``cat`` process,
3. the safety invariants the async model depends on: a child's stdout reader can
   only be consumed once, invalid requests fail loudly, and termination leaves
   jobs in a finished state that GC can collect.
"""

import time

import pytest

from src.cli_proxy_caller.common_context import context
from src.cli_proxy_caller.common_defs import Job
from src.cli_proxy_caller import (
    initiate_command,
    initiate_worker_loop,
    get_job_stdout_reader,
    send_input,
    terminate_job,
)
from src.cli_proxy_caller.read_conventions import (
    register_read_convention,
    read_newline,
    read_git_cat_file_batch,
)


class _HTTP404(Exception):
    pass


def _config():
    return {"iface": {"HTTP404": _HTTP404}}


@pytest.fixture(scope="session", autouse=True)
def _register_conventions_and_start_worker():
    register_read_convention("newline", read_newline)
    register_read_convention("gitcatfile", read_git_cat_file_batch)
    initiate_worker_loop(None)
    yield


@pytest.fixture(autouse=True)
def _isolate_jobs():
    context.jobs.clear()
    yield
    context.jobs.clear()


def _wait_until(fn, timeout=10, interval=0.02):
    deadline = time.time() + timeout
    while time.time() < deadline:
        value = fn()
        if value:
            return value
        time.sleep(interval)
    raise AssertionError("condition not met within timeout")


# --- read conventions (framing contracts) -----------------------------------


class _FakeStdout:
    def __init__(self, data):
        self._data = data
        self._pos = 0

    def readline(self):
        index = self._data.find(b"\n", self._pos)
        if index == -1:
            chunk = self._data[self._pos :]
            self._pos = len(self._data)
            return chunk
        line = self._data[self._pos : index + 1]
        self._pos = index + 1
        return line

    def read(self, n=-1):
        if n == -1:
            chunk = self._data[self._pos :]
            self._pos = len(self._data)
            return chunk
        chunk = self._data[self._pos : self._pos + n]
        self._pos += n
        return chunk


class _FakeProcess:
    def __init__(self, data):
        self.stdout = _FakeStdout(data)


def test_read_newline_reads_one_line():
    process = _FakeProcess(b"hello\nworld\n")
    assert read_newline(process) == b"hello\n"


def test_read_git_cat_file_batch_reads_header_plus_exact_payload():
    payload = b"abc123 blob 5\nhello\n"
    process = _FakeProcess(payload)

    frame = read_git_cat_file_batch(process)

    # header + exactly the declared 5 bytes + trailing newline
    assert frame == payload
    assert process.stdout._pos == len(payload)  # nothing left unread, nothing overread


def test_read_git_cat_file_batch_handles_missing():
    process = _FakeProcess(b"abc123 missing\n")
    assert read_git_cat_file_batch(process) == b"abc123 missing\n"


def test_read_git_cat_file_batch_rejects_malformed_header():
    process = _FakeProcess(b"abc123 blob\n")
    with pytest.raises(Exception):
        read_git_cat_file_batch(process)


# --- send_input (child-job model) -------------------------------------------


def _start_echo_batch():
    # A long-lived process that reads a line from stdin and echoes it back to
    # stdout (unbuffered via `python -u`). `cat` would be the obvious choice,
    # but `cat` block-buffers its stdout when it is a pipe, so a reader waiting
    # on readline() would never see the reply. `python -u` flushes immediately.
    job = initiate_command(
        ["python3", "-u", "-c", "import sys\nwhile True:\n    line = sys.stdin.readline()\n    if not line:\n        break\n    sys.stdout.write(line)"],
        _config(),
        is_binary=True,
        is_interactive=True,
        options={"read_convention": "newline"},
    )
    job_id = job["job_id"]
    _wait_until(
        lambda: context.jobs[job_id].status == "running"
        and context.jobs[job_id].job_data is not None
        and context.jobs[job_id].job_data.pipe_process is not None
    )
    return job_id


def _read_child_stdout(child_id):
    _wait_until(lambda: context.jobs[child_id].status == "done")
    reader = get_job_stdout_reader(child_id, _config())
    buf = reader()
    return buf.read()


def test_send_input_creates_child_job_and_streams_response():
    parent_id = _start_echo_batch()

    child = send_input(parent_id, "hello", _config())
    child_id = child["job_id"]
    assert child_id != parent_id

    assert _read_child_stdout(child_id) == b"hello\n"

    # The parent process stays alive between requests.
    assert context.jobs[parent_id].status == "running"


def test_send_input_supports_multiple_sequential_requests():
    parent_id = _start_echo_batch()

    first = send_input(parent_id, "one", _config())["job_id"]
    second = send_input(parent_id, "two", _config())["job_id"]

    assert _read_child_stdout(first) == b"one\n"
    assert _read_child_stdout(second) == b"two\n"
    assert context.jobs[parent_id].status == "running"


def test_child_stdout_reader_can_only_be_consumed_once():
    parent_id = _start_echo_batch()
    child_id = send_input(parent_id, "hello", _config())["job_id"]
    _wait_until(lambda: context.jobs[child_id].status == "done")

    reader = get_job_stdout_reader(child_id, _config())
    assert reader() is not None
    with pytest.raises(Exception):
        reader()  # second consumer must be rejected loudly


def test_send_input_fails_loudly_for_unknown_job():
    with pytest.raises(_HTTP404):
        send_input("does-not-exist", "hello", _config())


def test_send_input_fails_loudly_when_parent_not_running():
    job = Job(job_id="fresh-parent", status="fresh")
    job.is_interactive = True
    job.options = {"read_convention": "newline"}
    context.jobs["fresh-parent"] = job

    with pytest.raises(Exception, match="not running"):
        send_input("fresh-parent", "hello", _config())


def test_send_input_fails_loudly_without_read_convention():
    job = Job(job_id="no-convention", status="running")
    job.is_interactive = True
    job.options = {}
    context.jobs["no-convention"] = job

    with pytest.raises(Exception, match="read_convention"):
        send_input("no-convention", "hello", _config())


def test_send_input_fails_loudly_for_non_interactive_job():
    job = Job(job_id="non-interactive", status="running")
    job.is_interactive = False
    job.options = {"read_convention": "newline"}
    context.jobs["non-interactive"] = job

    with pytest.raises(Exception, match="not interactive"):
        send_input("non-interactive", "hello", _config())


# --- termination & cleanup --------------------------------------------------


def test_terminate_finishes_job_and_gc_collects_it():
    parent_id = _start_echo_batch()
    assert context.jobs[parent_id].status == "running"

    terminate_job(parent_id, _config())

    # terminate flags the job for deletion and marks it finished; the worker's gc
    # pass then removes it from memory. Waiting for removal proves the whole
    # chain (finished + flagged + collected), which is the property that matters.
    _wait_until(lambda: parent_id not in context.jobs, timeout=10)
    assert parent_id not in context.jobs


def test_terminate_after_process_already_exited_does_not_raise():
    parent_id = _start_echo_batch()
    job = context.jobs[parent_id]

    # Make the process exit on its own (EOF on stdin), then terminate. This is
    # the "terminate after crash/exit" race: handle_terminate must skip the
    # terminate()/kill() path gracefully instead of raising and killing a worker.
    job.job_data.pipe_process.stdin.close()
    job.job_data.pipe_process.wait(timeout=5)

    terminate_job(parent_id, _config())
    _wait_until(lambda: parent_id not in context.jobs, timeout=10)
    assert parent_id not in context.jobs

