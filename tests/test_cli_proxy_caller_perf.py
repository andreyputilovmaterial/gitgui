"""Tests for src/cli_proxy_caller/perf.py.

These use small fixtures instead of multi-gigabyte buffers and assert the
*relationships* the walker must uphold — payloads are counted, closure captures
are counted, cycles terminate, shared objects are not double-counted, and
measuring never keeps an object alive. Those are the properties the production
memory-monitoring statements depend on, so verifying them on small inputs is
sufficient (the walker's behavior does not change with size, only the numbers).
"""

import gc
import io
import weakref

import pytest

from src.cli_proxy_caller.common_context import context
from src.cli_proxy_caller.common_defs import Job
from src.cli_proxy_caller.perf import deep_size, get_jobs_perf_stats


@pytest.fixture(autouse=True)
def _isolate_jobs():
    context.jobs.clear()
    yield
    context.jobs.clear()


class _Blob:
    pass


# --- deep_size -------------------------------------------------------------


def test_deep_size_counts_str_and_bytes_payloads():
    assert deep_size("x" * 5000) >= 5000
    assert deep_size(b"x" * 5000) >= 5000


def test_deep_size_counts_bytearray_buffer():
    # bytearray.__sizeof__ already includes its buffer, but we assert it here to
    # lock the behavior in.
    assert deep_size(bytearray(b"x" * 5000)) >= 5000


def test_deep_size_counts_bytesio_buffer():
    # BytesIO.__sizeof__ already includes its buffer, but assert it here to lock
    # the behavior in (an earlier attempt double-counted this).
    buf = io.BytesIO(b"x" * 5000)
    assert deep_size(buf) >= 5000


def test_deep_size_counts_memoryview_buffer():
    # Unlike BytesIO, sys.getsizeof(memoryview) is constant (~184) and does not
    # include the referenced data, so the walker must add nbytes explicitly.
    view = memoryview(b"x" * 5000)
    assert deep_size(view) >= 5000


def test_deep_size_walks_nested_containers():
    obj = {"a": ["y" * 3000, b"z" * 2000], "b": {"c": "w" * 1000}}
    assert deep_size(obj) >= 6000


def test_deep_size_walks_closure_captures():
    # The critical case: a stdout_reader closure pins a big buffer; the walker
    # must see through __closure__, otherwise the biggest single object is missed.
    payload = b"p" * 10000

    def make_reader(payload):
        def reader():
            return io.BytesIO(payload)
        return reader

    reader = make_reader(payload)
    assert deep_size(reader) >= 10000


def test_deep_size_terminates_on_cycles():
    a = []
    a.append(a)  # self-reference
    assert deep_size(a) >= 0

    d = {}
    d["self"] = d
    assert deep_size(d) >= 0


def test_deep_size_counts_shared_object_once():
    shared = b"s" * 5000
    obj = {"a": shared, "b": shared}
    # counted once, not twice: < 2 * payload + container overhead
    assert deep_size(obj) < (5000 * 2) + 1000


def test_deep_size_does_not_retain_references():
    holder = {"blob": _Blob()}
    ref = weakref.ref(holder["blob"])

    deep_size(holder)  # measuring must not keep it alive

    del holder["blob"]
    gc.collect()
    assert ref() is None


def test_exclude_parameter_skips_subtree():
    big = b"b" * 5000
    container = {"big": big, "other": "x"}

    assert deep_size(container) >= 5000
    assert deep_size(container, exclude=(id(big),)) < 5000


# --- get_jobs_perf_stats ---------------------------------------------------


def test_get_jobs_perf_stats_reports_jobs():
    job = Job(job_id="job-1", status="done")
    job.stdout = "out" * 1000  # 3000 chars
    job.stderr = ""
    context.jobs["job-1"] = job

    stats = get_jobs_perf_stats()

    assert stats["jobs_count"] == 1
    assert stats["total_bytes"] > 0
    entry = stats["jobs"][0]
    assert entry["job_id"] == "job-1"
    assert entry["status"] == "done"
    assert entry["fields"]["stdout"] >= 3000


def test_get_jobs_perf_stats_flags_field_over_threshold():
    job = Job(job_id="job-1", status="done")
    job.stdout = ""
    job.stderr = "e" * 5000
    context.jobs["job-1"] = job

    stats = get_jobs_perf_stats(thresholds={"stderr": 100})

    entry = stats["jobs"][0]
    assert entry["fields"]["stderr"] >= 5000
    assert entry["flagged"] is True


def test_get_jobs_perf_stats_does_not_flag_small_fields():
    job = Job(job_id="job-1", status="done")
    job.stdout = "hi"
    job.stderr = ""
    context.jobs["job-1"] = job

    stats = get_jobs_perf_stats(thresholds={"stderr": 100, "stdout": 100})

    assert stats["jobs"][0]["flagged"] is False


def test_get_jobs_perf_stats_does_not_retain_jobs():
    job = Job(job_id="job-1", status="done")
    context.jobs["job-1"] = job
    ref = weakref.ref(job)

    get_jobs_perf_stats()

    del context.jobs["job-1"]
    del job
    gc.collect()
    assert ref() is None


def test_get_jobs_perf_stats_is_json_safe():
    job = Job(job_id="job-1", status="done")
    job.stdout = "text"
    job.stderr = ""
    context.jobs["job-1"] = job

    import json

    json.dumps(get_jobs_perf_stats())


def test_get_jobs_perf_stats_uses_given_jobs_dict():
    job = Job(job_id="job-1", status="done")
    custom = {"job-1": job}

    stats = get_jobs_perf_stats(jobs=custom)

    assert stats["jobs_count"] == 1
    assert stats["jobs"][0]["job_id"] == "job-1"
