"""Tests for src/cli_proxy_caller/gc/jobs.py.

These exercise the GC's observable contract: only finished jobs that are stale
(beyond ``JOB_TTL``) or explicitly flagged for deletion are removed, everything
else stays, and the pass is idempotent / safe under concurrent invocations.
"""

from datetime import datetime, timedelta, timezone
import threading

import pytest

from src.cli_proxy_caller.common_context import context
from src.cli_proxy_caller.common_defs import Job
from src.cli_proxy_caller.gc.jobs import gc, JOB_TTL, GC_SCAN_INTERVAL


@pytest.fixture(autouse=True)
def _isolate_jobs():
    context.jobs.clear()
    yield
    context.jobs.clear()


def _job(job_id, *, finished_ago=None, flag_for_deletion=None):
    finished_at = None
    if finished_ago is not None:
        finished_at = datetime.now(timezone.utc) - finished_ago
    return Job(
        job_id=job_id,
        status="done" if finished_at is not None else "running",
        execution_finished_at=finished_at,
        flag_for_deletion=flag_for_deletion,
    )


def test_gc_removes_finished_job_older_than_ttl():
    context.jobs["stale"] = _job("stale", finished_ago=JOB_TTL + timedelta(seconds=1))

    gc(context.jobs)

    assert "stale" not in context.jobs


def test_gc_keeps_finished_job_within_ttl():
    context.jobs["recent"] = _job("recent", finished_ago=JOB_TTL - timedelta(seconds=1))

    gc(context.jobs)

    assert "recent" in context.jobs


def test_gc_keeps_running_job():
    context.jobs["running"] = _job("running")  # execution_finished_at is None

    gc(context.jobs)

    assert "running" in context.jobs


def test_gc_removes_finished_job_flagged_for_deletion_even_if_recent():
    context.jobs["flagged"] = _job(
        "flagged",
        finished_ago=timedelta(seconds=1),
        flag_for_deletion=True,
    )

    gc(context.jobs)

    assert "flagged" not in context.jobs


def test_gc_scan_interval_is_positive():
    assert GC_SCAN_INTERVAL.total_seconds() > 0


def test_gc_is_idempotent():
    context.jobs["stale"] = _job("stale", finished_ago=JOB_TTL + timedelta(seconds=1))

    gc(context.jobs)
    gc(context.jobs)  # second pass must be a no-op, not raise

    assert "stale" not in context.jobs


def test_gc_is_safe_under_concurrent_invocations():
    for i in range(20):
        context.jobs[f"stale-{i}"] = _job(
            f"stale-{i}", finished_ago=JOB_TTL + timedelta(seconds=1)
        )

    errors = []

    def run():
        try:
            gc(context.jobs)
        except Exception as e:  # pragma: no cover - we assert it never happens
            errors.append(e)

    threads = [threading.Thread(target=run) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert errors == []
    assert context.jobs == {}
