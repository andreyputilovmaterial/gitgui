

from datetime import datetime, timezone
import subprocess
import time # for sleep(5s) in collecting stderr loop
from threading import Thread # for stderr collector thread
from pathlib import Path # to set working folder to user profile's folder at init, not sure I need it, but will do
from dataclasses import dataclass, field
from threading import Lock
# from typing import Any
# from typing import Callable
import codecs # for partial reading and partially converting to utf-8 (for example, on stderr)



@dataclass
class JobInternalData:
    pipe_process: subprocess.Popen | None = field(default=None, repr=False)
    pipe_process_lock: Lock = field(default_factory = Lock, repr=False)
    stderr_reader_lock: Lock = field(default_factory = Lock, repr=False)
    stdout_reader_lock: Lock = field(default_factory = Lock, repr=False)



STDOUT_DEFAULT_READ_CHUNK_SIZE = 128 # 8192
STDERR_DEFAULT_READ_CHUNK_SIZE = 8 # 8192



def handler(context,task,job):

    pipe_process = None
    pipe_process_lock = None
    options = None
    with job.lock:
        if not job.job_data:
            job.job_data = JobInternalData()
        pipe_process = job.job_data.pipe_process
        pipe_process_lock = job.job_data.pipe_process_lock
        options = job.options # example: { stdout_chunk_size: 8, stderr_chunk_size: 4, }
    if not options:
        options = {}




    def handle_new_command():
        command = task.command
        is_binary = task.is_binary
        with job.lock:
            if job.status != "fresh":
                raise Exception(f'Can only call subprocess.Popen() on context.jobs with status "fresh" (job_id: "{job.job_id}")')
            job.status = "running"
            job.command = command
            job.is_interactive = True
            job.is_binary = is_binary
            job.execution_started_at = datetime.now(timezone.utc)
            job.last_activity_at = job.execution_started_at
        with job.job_data.pipe_process_lock:
            # print(f'[DEBUG-cli]: interactive task: process (pipe) created, command == {command}, job_id = {job.job_id}')
            process = subprocess.Popen(
                command,
                stdin = subprocess.PIPE,
                stdout = subprocess.PIPE,
                stderr = subprocess.PIPE,
                text = not is_binary,
                encoding = "utf-8" if not is_binary else None,
                bufsize = 0,
                cwd = Path.home(),
            )

            def consume_stderr():
                # print(f'[DEBUG-cli]: interactive task: stderr consumer task called, job_id = {job.job_id}')
                with job.lock:
                    if not job.job_data:
                        job.job_data = JobInternalData()
                    pipe_process = job.job_data.pipe_process
                    stderr_stream = pipe_process.stderr
                # stderr is read on its own pipe and must NOT take pipe_process_lock:
                # that lock serialises stdin writes / stdout reads / terminate, so
                # holding it while blocking here would deadlock every stdin request
                # (and terminate itself). stderr_reader_lock alone is sufficient.
                with job.job_data.stderr_reader_lock:
                    stderr_read_chunk_size = int(options.get('stderr_chunk_size', STDERR_DEFAULT_READ_CHUNK_SIZE))
                    decoder = codecs.getincrementaldecoder("utf-8")( errors="replace" ) if is_binary else None
                    while True:
                        # print(f'[DEBUG-cli]: interactive task: stderr consumer task read({stderr_read_chunk_size}), job_id = {job.job_id}')
                        chunk = stderr_stream.read(stderr_read_chunk_size)
                        if not chunk:
                            # Flush any incomplete UTF-8 sequence at EOF.
                            if decoder is not None:
                                text = decoder.decode(b"", final=True)
                                if text:
                                    with job.lock:
                                        job.stderr = (job.stderr or '') + text
                            break
                        chunk_txt = decoder.decode(chunk) if decoder is not None else chunk
                        if chunk_txt:
                            with job.lock:
                                job.stderr = (job.stderr or '') + chunk_txt
                                job.stderr = job.stderr[:10000000]  # let's limit to 10 mb
                    returncode = pipe_process.poll()
                    if returncode is not None:
                        # let's check if it's gone
                        with job.lock:
                            dt_now = datetime.now(timezone.utc)
                            job.status = "done"
                            job.returncode = returncode
                            if not job.execution_finished_at:
                                job.execution_finished_at = dt_now
                            job.last_activity_at = dt_now

            def worker_consume_stderr():
                # print( f'[DEBUG-cli]: interactive task: stderr consumer worker started, job_id = {job.job_id}')

                def check_if_alive():
                    with job.lock:
                        return not ( not process or (job.returncode is not None) or (not not job.execution_finished_at) )
                while True:
                    # print(f'[DEBUG-cli]: interactive task: stderr consumer, continue reading, job_id = {job.job_id}')
                    if not check_if_alive():
                        consume_stderr()  # final drain
                        break
                    consume_stderr()
                    time.sleep(1) # once per second
                # print( f'[DEBUG-cli]: interactive task: stderr consumer worker end, job_id = {job.job_id}')

            def stdout_reader():
                with job.job_data.stdout_reader_lock:
                    # stdout is different from stderr
                    # stderr is polled constantly in parallel thread
                    # stdout is not - the recipient must receive the reader and read it in more "sync" way
                    # but should anyway not be a blocker, because one of those 2 should be true:
                    #  1. either the pipe_process finishes at some time, and the pipe is closed, and stdout read is released
                    #  2. or the reader pipe_process knows how many bytes to read <- not the case,
                    #      as of now, we read in infinite loop, but this functionality will be added, to read arbitrary number of bytes

                    # lol lock used this way is useless...
                    # Anyway, I will not pass it back - to not overcomplicate;
                    # unix default strategy is to allow races, no exclusive access to files... I'll stick to same strategy
                    return process.stdout

            with job.lock:
                job.job_data.pipe_process = process
                job.last_activity_at = datetime.now(timezone.utc)
                if options.get('read_convention'):
                    # Batch (stdin request/response) process: its stdout is consumed
                    # frame-by-frame by per-request child jobs (exposed.send_input),
                    # so we must NOT expose a continuous stdout reader / download URL.
                    job.stdout_reader = None
                else:
                    job.stdout_reader = stdout_reader

            stderr_consumer_thread = Thread(target=worker_consume_stderr, daemon=True)
            stderr_consumer_thread.start() # will die normally when its infinite loop is over - will happen when stderr pipe is closed, it happens when this pipe_process stops, so will terminate normally



    def handle_terminate():
        # print(f'[DEBUG-cli]: interactive task: terminate task, job_id = {job.job_id}')
        with job.lock:
            job.last_activity_at = datetime.now(timezone.utc)
        if pipe_process is None:
            return
        with pipe_process_lock:
            returncode = pipe_process.poll()
        # handle_consume_stderr() # no parallel - there is an already running thread for this!
        if returncode is None:
            with pipe_process_lock:
                # print(f'[DEBUG-cli]: interactive task: terminate, call "terminate", job_id = {job.job_id}')
                pipe_process.terminate()
                try:
                    pipe_process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    # print(f'[DEBUG-cli]: interactive task: terminate, call "kill", job_id = {job.job_id}')
                    pipe_process.kill()
                    pipe_process.wait()
        with job.lock:
            dt_now = datetime.now(timezone.utc)
            job.status = "done"
            # print(f'[DEBUG-cli]: interactive task: terminate, set status to "done", job_id = {job.job_id}')
            job.returncode = returncode
            if not job.execution_finished_at:
                job.execution_finished_at = dt_now
            job.last_activity_at = dt_now



    if task.action=="new_command":
        # print(f'[DEBUG-cli]: interactive task: received "new command" task, job_id = {job.job_id}')
        return handle_new_command()

    elif task.action=="terminate":
        # print(f'[DEBUG-cli]: interactive task: received "terminate" task, job_id = {job.job_id}')
        return handle_terminate()

    # elif task.action=="stderr":
    #     return handle_consume_stderr()

    # elif task.action=="stdout":
    #     return handle_consume_stdout()

    else:
        raise Exception(f'cli: interactive command: task not recognized ({task.action})')
