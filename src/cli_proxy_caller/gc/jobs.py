from datetime import datetime, timedelta, timezone


JOB_TTL = timedelta(minutes=5)



def subprocess_still_exists(job):
    process = job.pipe_process
    if process is None:
        return False
    if isinstance(process,int): # storing returncode when finished - just to reset to soemthing, it is not actually used
        return False
    return True

def gc(jobs):
    """Mutating input object"""
    timestamp_now = datetime.now(timezone.utc)
    cutoff = timestamp_now + JOB_TTL

    for job_id, job in list(jobs.items()):
        with job.lock:
            finished_at = job.execution_finished_at

            if finished_at is not None and ( (job.flag_for_deletion) or (job.execution_finished_at >= cutoff) ):
                if subprocess_still_exists(job):
                    raise Exception(f'gc: tried to clean a job with expired "finished_at" but it still has alive subprocess (job_id: "job_id")')
                del jobs[job_id]
