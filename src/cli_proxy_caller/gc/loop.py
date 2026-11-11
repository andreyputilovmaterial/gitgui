import time
from threading import Thread

from .jobs import gc as gc_jobs, GC_SCAN_INTERVAL
from ..common_context import context


def gc_loop():
    """Run gc() periodically, regardless of incoming requests.

    The workers already run gc() whenever a "gc" message is enqueued by the
    request-facing functions in exposed.py. This thread adds the complementary
    trigger: it scans context.jobs on a fixed interval so that stale finished
    jobs are removed even if no new request ever arrives.
    """
    while True:
        time.sleep(GC_SCAN_INTERVAL.total_seconds())
        gc_jobs(context.jobs)


def initiate_gc_loop(config=None):
    thread = Thread(target=gc_loop, daemon=True)
    thread.start()
    return thread
