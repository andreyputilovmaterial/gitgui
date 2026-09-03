
from datetime import datetime, timezone # for setting "created_at", "initiated_at", "last_polled_at"...
from dataclasses import dataclass
from typing import Any, Callable
import io
from contextlib import redirect_stdout, redirect_stderr


@dataclass
class JobInternalData:
    fn: Callable
    args: Any
    inp: Any
    stdout_buf: io.StringIO = io.StringIO()
    stderr_buf: io.StringIO = io.StringIO()


def handler(context,task,job):

    fn, args, inp = job.command
    options = None
    stdout_buf: io.StringIO = io.StringIO()
    stderr_buf: io.StringIO = io.StringIO()
    with job.lock:
        if job.status != "fresh":
            raise Exception(f'Can only call new task on context.jobs with status "fresh" (job_id: "{job.job_id}")')
        job.status = "running"
        job.command = fn.__name__
        job.is_binary = False
        job.execution_started_at = datetime.now(timezone.utc)
        job.last_activity_at = job.execution_started_at
        job.job_data = JobInternalData(
            fn = fn,
            args = args,
            inp = inp,
            stdout_buf = stdout_buf,
            stderr_buf = stderr_buf,
        )
        options = job.options # example: { stdout_chunk_size: 8, stderr_chunk_size: 4, }
        job.stdout = ''
        job.stderr = ''
    if not options:
        options = {}

    try:
        try:
            with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
                fn(inp,*args)
                with job.lock:
                    job.status = "done"
                    job.returncode = 0
                    if not job.is_binary:
                        job.stdout += stdout_buf.getvalue()
                        job.stderr += stderr_buf.getvalue()
                        job.stdout_reader = None
                    else:
                        def stdout_reader():
                            # # # result = '' if not is_binary else b''
                            # # # while True:
                            # # #     chunk = result.stdout.read(8192)
                            # # #     if not chunk:
                            # # #         break
                            # # #     result += chunk
                            # # # return result
                            # # chunks = [result.stdout]
                            # # yield from chunks
                            # result.stdout.encode('utf-8')
                            with job.lock:
                                return job.job_data.stdout_buf

                        job.stdout_reader = stdout_reader

        except Exception as e:
            job.returncode = -999
            job.stderr += str(e)
            job.stdout += stdout_buf.getvalue()
            job.stderr += stderr_buf.getvalue()

    finally:
        with job.lock:
            job.execution_finished_at = datetime.now(timezone.utc)
            job.last_activity_at = job.execution_finished_at

