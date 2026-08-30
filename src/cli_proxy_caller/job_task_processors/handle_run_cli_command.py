
from datetime import datetime, timedelta, timezone # for setting "created_at", "initiated_at", "last_polled_at"...
import subprocess
from pathlib import Path # to set working folder to user profile's folder at init, not sure I need it, but will do
from dataclasses import dataclass



@dataclass
class JobInternalData:
    pass



def handler(context,task,job):

    command = job.command
    is_binary = job.is_binary
    options = None
    with job.lock:
        if job.status != "fresh":
            raise Exception(f'Can only call subprocess.run() on context.jobs with status "fresh" (job_id: "{job.job_id}")')
        job.status = "running"
        job.command = command
        job.is_interactive = False
        job.is_binary = is_binary
        job.execution_started_at = datetime.now(timezone.utc)
        job.last_activity_at = job.execution_started_at
        job.job_data = JobInternalData()
        options = job.options # example: { stdout_chunk_size: 8, stderr_chunk_size: 4, }
    if not options:
        options = {}

    if None in command:
        raise Exception(f'cli proxy caller: Invalid arguments passed to subprocess.run(): {repr(command)}')

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text = not is_binary,
            encoding = "utf-8" if not is_binary else None,
            cwd=Path.home(),
        )
    finally:
        with job.lock:
            job.execution_finished_at = datetime.now(timezone.utc)
            job.last_activity_at = job.execution_finished_at

    with job.lock:
        job.status = "done"
        job.returncode = result.returncode
        if not is_binary:
            job.stdout = result.stdout
            job.stdout_reader  = None
        else:
            def stdout_reader():
                # result = '' if not is_binary else b''
                # while True:
                #     chunk = result.stdout.read(8192)
                #     if not chunk:
                #         break
                #     result += chunk
                # return result
                chunks = [result.stdout]
                yield from chunks
            # job.stdout = None
            job.stdout_reader = stdout_reader
        if not is_binary:
            job.stderr = result.stderr
        else:
            stderr_txt = result.stderr.decode("utf-8", errors="replace")
            job.stderr = stderr_txt
