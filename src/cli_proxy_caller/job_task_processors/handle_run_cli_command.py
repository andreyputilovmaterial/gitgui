
import uuid # for assigning new id to new binary bucket
from datetime import datetime, timedelta, timezone # for setting "created_at", "initiated_at", "last_polled_at"...
import subprocess




def handler(job,context):

    BinaryDataBucket = context.iface.BinaryDataBucket

    command = job.command
    is_binary = job.is_binary
    with job.lock:
        if job.status != "fresh":
            raise Exception(f'Can only call subprocess.run() on context.jobs with status "fresh" (job_id: "{job.job_id}")')
        job.status = "running"
        job.command = command
        job.is_continuous = False
        job.is_binary = is_binary
        job.execution_started_at = datetime.now(timezone.utc)
        job.last_activity_at = job.execution_started_at

    result = subprocess.run(
        command,
        capture_output=True,
        text = not is_binary,
        encoding = "utf-8" if not is_binary else None,
    )

    with job.lock:
        job.execution_finished_at = datetime.now(timezone.utc)
        job.last_activity_at = job.execution_finished_at
        job.status = "done"
        job.returncode = result.returncode
        if not is_binary:
            job.stdout = result.stdout
        else:
            binary_bucket_id = str(uuid.uuid4())
            binary_bucket = BinaryDataBucket(
                bucket_id = binary_bucket_id,
                data = result.stdout,
                job_belonging_to_id = job.job_id,
            )
            context.binary_responses_storage[binary_bucket_id] = binary_bucket
            job.stdout = binary_bucket_id
        if not is_binary:
            job.stderr = result.stderr
        else:
            stderr_txt = result.stderr.decode("utf-8", errors="replace")
            job.stderr = stderr_txt
