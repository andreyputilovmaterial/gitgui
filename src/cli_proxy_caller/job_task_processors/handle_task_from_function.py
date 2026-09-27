
from datetime import datetime, timezone # for setting "created_at", "initiated_at", "last_polled_at"...
from dataclasses import dataclass
from typing import Any, Callable
# import io # we do not use classes from io, cause we do not want outputs to be accumulated in memory - we want all streamed
import os
# from contextlib import redirect_stdout, redirect_stderr # piece of shit, it is grabbing all from all threads - it just temporarily substitutes sys.stdout - no way to capture output from one function isolated
from threading import Lock
from dataclasses import field

@dataclass
class JobInternalData:
    fn: Callable
    args: Any
    inp: Any
    stdout_reader_lock: Lock = field(default_factory=Lock, repr=False)
    stdout_writable_buf: Any | None = None
    stdout_readonly_buf: Any | None = None
    stderr_writable_buf: Any | None = None
    stderr_readonly_buf: Any | None = None
    def __del__(self):
        try:
            self.stdout_readonly_buf.close()
        except:
            pass
        try:
            self.stderr_readonly_buf.close()
        except:
            pass
        print(f'[DEBUG]: cli: handle_task_from_function: stdout_readonly_buf.close()')


def consume_all(buffer, is_binary):
    chunks = []
    while True:
        chunk = buffer.read()
        if not chunk:
            break
        chunks.append(chunk)
    return (b'' if is_binary else '').join(chunks)


def handler(context,task,job):

    fn, args, inp = job.command
    options = None

    try:
        with job.lock:
            # set initial properties on job, before start
            if job.status != "fresh":
                raise Exception(f'Can only call new task on context.jobs with status "fresh" (job_id: "{job.job_id}")')
            job.status = "running"
            job.command = fn.__name__
            job.is_binary = False # do I have to force False???
            job.execution_started_at = datetime.now(timezone.utc)
            job.last_activity_at = job.execution_started_at

            # stdout_writable_buf: io.StringIO = io.StringIO()
            # stderr_readonly_buf: io.StringIO = io.StringIO()
            stdout_read_fd, stdout_write_fd = os.pipe()
            stderr_read_fd, stderr_write_fd = os.pipe()
            # stdin_fd = os.pipe()
            stdout_writable_buf = os.fdopen(
                stdout_write_fd,
                "w",
                encoding = "utf-8",
                buffering = 1,
            ) if not job.is_binary else os.fdopen(
                stdout_write_fd,
                "wb",
                buffering = 1,
            )
            stdout_readonly_buf = os.fdopen(
                stdout_read_fd,
                "r",
                encoding = "utf-8",
            ) if not job.is_binary else os.fdopen(
                stdout_read_fd,
                "rb",
            )
            stderr_writable_buf = os.fdopen(
                stderr_write_fd,
                "w",
                encoding = "utf-8",
                buffering = 1,
            ) if not job.is_binary else os.fdopen(
                stderr_write_fd,
                "wb",
                buffering = 1,
            )
            stderr_readonly_buf = os.fdopen(
                stderr_read_fd,
                "r",
                encoding = "utf-8",
            ) if not job.is_binary else os.fdopen(
                stderr_read_fd,
                "rb",
            )
            # stdin_buf = os.fdopen(stdin_fd, "r", encoding="utf-8")

            job.job_data = JobInternalData(
                fn = fn,
                args = args,
                inp = inp,
                stdout_writable_buf = stdout_writable_buf,
                stdout_readonly_buf = stdout_readonly_buf,
                stderr_writable_buf = stderr_writable_buf,
                stderr_readonly_buf = stderr_readonly_buf,
            )
            options = job.options # example: { stdout_chunk_size: 8, stderr_chunk_size: 4, }
            job.stdout = ''
            job.stderr = ''
        if not options:
            options = {}

        try:
            try:
                stdout_requested_data = {
                    'counter': 0,
                }
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
                    with job.job_data.stdout_reader_lock:
                        if stdout_requested_data['counter']>0:
                            raise Exception('repeatedly requested stdout_reader on pipe: pipe should only be consumed once; please investigate')
                        stdout_requested_data['counter'] += 1
                        # stdout_readonly_buf.seek(0)
                        return job.job_data.stdout_readonly_buf

                with job.lock:
                    job.stdout_reader = stdout_reader
                try:
                    try:
                        # with redirect_stdout(stdout_writable_buf), redirect_stderr(stderr_writable_buf):
                        fn(inp,stdout_writable_buf,stderr_writable_buf,*args)
                    finally:
                        try:
                            stdout_writable_buf.close()
                        except:
                            pass
                        try:
                            stderr_writable_buf.close()
                        except:
                            pass
                    with job.lock:
                        job.status = "done"
                        job.returncode = 0
                        job.stderr += consume_all(stderr_readonly_buf,is_binary=False) # stderr_readonly_buf.getvalue()
                        # if not job.is_binary:
                        #     stdout_readonly_buf.seek(0)
                        #     job.stdout = consume_all(stdout_readonly_buf,is_binary=job.is_binary)
                except Exception as e:
                    with job.lock:
                        job.status = "done"
                        job.returncode = -999
                        job.stderr += str(e)
                        job.stdout += consume_all(stdout_readonly_buf,is_binary=job.is_binary)
                        job.stderr += consume_all(stderr_readonly_buf,is_binary=False)

            except Exception as e:
                with job.lock:
                    job.status = "error"
                    job.returncode = -999
                    job.stderr += str(e)
                    job.stdout += consume_all(stdout_readonly_buf,is_binary=job.is_binary)
                    job.stderr += consume_all(stderr_readonly_buf,is_binary=False)
        
        finally:
            with job.lock:
                job.execution_finished_at = datetime.now(timezone.utc)
                job.last_activity_at = job.execution_finished_at
    
    finally:
        pass
        # # do not close buffers now - reader will be retrieved later
        # try:
        #     stdout_readonly_buf.close()
        # except:
        #     pass
        # try:
        #     stderr_readonly_buf.close()
        # except:
        #     pass


