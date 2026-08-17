from datetime import datetime, timedelta, timezone


JOB_TTL = timedelta(minutes=5)



def gc(jobs):
    """Mutating input object"""
    timestamp_now = datetime.now(timezone.utc)
    cutoff = timestamp_now + JOB_TTL

    for job_id, job in list(jobs.items()):
        finished_at = job.get("execution_finished_at")

        if finished_at is not None and (job.get("execution_finished_at") >= cutoff):
            del jobs[job_id]
