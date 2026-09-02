
from datetime import datetime, timedelta, timezone # for setting "created_at", "initiated_at", "last_polled_at"...
import subprocess
from pathlib import Path # to set working folder to user profile's folder at init, not sure I need it, but will do
from dataclasses import dataclass
from typing import Any, Callable
import io # for stdout_reader



@dataclass
class JobInternalData:
    fn: Callable
    args: Any
    inp: Any



def handler(context,task,job):

    fn, args, inp = job.command
    options = None
    with job.lock:
        if job.status != "fresh":
            raise Exception(f'Can only call new task on context.jobs with status "fresh" (job_id: "{job.job_id}")')
        job.status = "running"
        job.command = fn.__name__
        job.execution_started_at = datetime.now(timezone.utc)
        job.last_activity_at = job.execution_started_at
        job.job_data = JobInternalData(
            fn = fn,
            args = args,
            inp = inp,
        )
        options = job.options # example: { stdout_chunk_size: 8, stderr_chunk_size: 4, }
    if not options:
        options = {}

    try:
        result = fn(args,inp,options)
    finally:
        with job.lock:
            job.execution_finished_at = datetime.now(timezone.utc)
            job.last_activity_at = job.execution_finished_at

    with job.lock:
        job.status = "done"
        job.returncode = result.returncode
        if not job.is_binary:
            job.stdout = result.stdout
            job.stdout_reader  = None
        else:
            def stdout_reader():
                # # result = '' if not is_binary else b''
                # # while True:
                # #     chunk = result.stdout.read(8192)
                # #     if not chunk:
                # #         break
                # #     result += chunk
                # # return result
                # chunks = [result.stdout]
                # yield from chunks
                io.BytesIO(result.stdout if is_binary else result.stdout.encode('utf-8'))
            # job.stdout = None
            job.stdout_reader = stdout_reader
        if not job.is_binary:
            job.stderr = result.stderr
        else:
            stderr_txt = result.stderr.decode("utf-8", errors="replace")
            job.stderr = stderr_txt
