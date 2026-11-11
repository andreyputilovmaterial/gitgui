from datetime import datetime, timedelta, timezone


JOB_TTL = timedelta(minutes=5)

# How often the periodic gc loop (gc/loop.py) scans context.jobs. A finished job
# is removed within JOB_TTL + GC_SCAN_INTERVAL at most, even when no new requests
# arrive in the meantime.
GC_SCAN_INTERVAL = timedelta(minutes=1)




def gc(jobs):
    """Mutating input object"""
    timestamp_now = datetime.now(timezone.utc)
    cutoff = timestamp_now - JOB_TTL

    for job_id, job in list(jobs.items()):
        with job.lock:
            finished_at = job.execution_finished_at

            if finished_at is not None and ( (job.flag_for_deletion) or (job.execution_finished_at <= cutoff) ):
                # pop() instead of del so concurrent gc passes (several workers
                # handling "gc" messages, plus the periodic loop) stay idempotent:
                # only the first one removes the entry, later ones are a no-op.
                jobs.pop(job_id, None)
