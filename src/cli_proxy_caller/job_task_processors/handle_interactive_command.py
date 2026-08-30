

from datetime import datetime, timezone
import subprocess
import time # for sleep(5s) in collecting stderr loop
from threading import Thread # for stderr collector thread
from pathlib import Path # to set working folder to user profile's folder at init, not sure I need it, but will do
from dataclasses import dataclass, field
from threading import Lock
# from typing import Any
# from typing import Callable



@dataclass
class JobInternalData:
    pipe_process: subprocess.Popen | None = field(default=None, repr=False)
    pipe_process_lock: Lock = field(default_factory = Lock, repr=False)
    stderr_reader_lock: Lock = field(default_factory = Lock, repr=False)
    stdout_reader_lock: Lock = field(default_factory = Lock, repr=False)



STDOUT_DEFAULT_READ_CHUNK_SIZE = 128 # 8192
STDERR_DEFAULT_READ_CHUNK_SIZE = 8 # 8192



def read_arbitrary_stdout_per_convention_newline(process):
    data = process.stdout.readline()
    return data

def read_arbitrary_stdout_per_convention_gitcatfile(process):
    header = process.stdout.readline()
    parts = header.split()
    obj_type = parts[1]
    if obj_type == b"missing":
        return header
    size = parts[2]
    size = int(size)
    data = process.stdout.read(size)
    process.stdout.read(1)
    return header + data + b'\n'

read_conventions = {
    'newline': read_arbitrary_stdout_per_convention_newline,
    'gitcatfile': read_arbitrary_stdout_per_convention_gitcatfile,
}

def read_arbitrary_stdout_per_convention(process,read_convention):
    converter = read_conventions.get(read_convention,None)
    if converter:
        return converter(process)
    else:
        raise Exception(f'read_stdout: read convention is not supported: {read_convention}')




def handler(context,task,job):

    is_binary = job.is_binary
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
            job.stdout_pipe = {}
            job.command = command
            job.is_interactive = True
            job.is_binary = is_binary
            job.execution_started_at = datetime.now(timezone.utc)
            job.last_activity_at = job.execution_started_at
        with job.job_data.pipe_process_lock:
            print(f'[DEBUG-cli]: interactive task: process (pipe) created, command == {command}, job_id = {job.job_id}')
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
                with job.lock:
                    if not job.job_data:
                        job.job_data = JobInternalData()
                    pipe_process = job.job_data.pipe_process
                    pipe_process_lock = job.job_data.pipe_process_lock
                with job.job_data.stderr_reader_lock:
                    with pipe_process_lock:
                        # is_alive = not ( not pipe_process or (returncode is not None) or (not not execution_finished_at) )
                        # if not is_alive:
                        #     stderr = ''
                        #     with job.lock:
                        #         if not job.stderr:
                        #             job.stderr = ''
                        #         job.stderr = (job.stderr + stderr)[:10000000] # let's limit to 10 mb
                        stderr = '' if not is_binary else b''
                        while True:
                            chunk = pipe_process.stderr.read(int(options.get('stderr_chunk_size',STDERR_DEFAULT_READ_CHUNK_SIZE)))
                            if not chunk:
                                break
                            if chunk:
                                stderr += chunk
                        if is_binary:
                            stderr = stderr.decode("utf-8", errors="replace") # stderr always expected to be text; so, if in binary mode, we convert it to text
                        with job.lock:
                            if not job.stderr:
                                job.stderr = ''
                            job.stderr = (job.stderr + stderr)[:10000000] # let's limit to 10 mb
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
                print( f'[DEBUG-cli]: interactive task: stderr consumer worker started, job_id = {job.job_id}')

                def check_if_alive():
                    with job.lock:
                        return not ( not process or (job.returncode is not None) or (not not job.execution_finished_at) )
                while True:
                    print(f'[DEBUG-cli]: interactive task: stderr consumer, continue reading, job_id = {job.job_id}')
                    if not check_if_alive():
                        consume_stderr()  # final drain
                        break
                    consume_stderr()
                    time.sleep(1) # once per second
                print( f'[DEBUG-cli]: interactive task: stderr consumer worker end, job_id = {job.job_id}')

            def stdout_reader():
                with job.job_data.stdout_reader_lock:
                    # stdout is different from stderr
                    # stderr is polled constantly in parallel thread
                    # stdout is not - the recipient must receive the reader and read it in more "sync" way
                    # but should anyway not be a blocker, because one of those 2 should be true:
                    #  1. either the pipe_process finishes at some time, and the pipe is closed, and stdout read is released
                    #  2. or the reader pipe_process knows how many bytes to read <- not the case, as of now, we read in infinite loop, but this functionality will be added, to read arbitrary number of bytes
                    print(f'[DEBUG-cli]: interactive task: output reader called, job_id = {job.job_id}')
                    # result = '' if not is_binary else b''
                    while True:
                        print(f'[DEBUG-cli]: interactive task: output reader, reading..., job_id = {job.job_id}')
                        # chunk = '' if not is_binary else b''
                        chunk = process.stdout.read(int(options.get('stdout_chunk_size',STDOUT_DEFAULT_READ_CHUNK_SIZE)))
                        if not chunk:
                            break
                        # result += chunk
                        yield chunk
                    print(f'[DEBUG-cli]: interactive task: output reader reached the end, job_id = {job.job_id}')
                    # return result

            with job.lock:
                job.job_data.pipe_process = process
                job.last_activity_at = datetime.now(timezone.utc)
                job.stdout_reader = stdout_reader

            stderr_consumer_thread = Thread(target=worker_consume_stderr, daemon=True)
            stderr_consumer_thread.start() # will die normally when its infinite loop is over - will happen when stderr pipe is closed, it happens when this pipe_process stops, so will terminate normally



    def handle_terminate():
        print(f'[DEBUG-cli]: interactive task: terminate task, job_id = {job.job_id}')
        with job.lock:
            job.last_activity_at = datetime.now(timezone.utc)
        if pipe_process is None:
            return
        with pipe_process_lock:
            returncode = pipe_process.poll()
        # handle_consume_stderr() # no parallel - there is an already running thread for this!
        if returncode is None:
            with pipe_process_lock:
                print(f'[DEBUG-cli]: interactive task: terminate, call "terminate", job_id = {job.job_id}')
                pipe_process.terminate()
                try:
                    pipe_process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    print(f'[DEBUG-cli]: interactive task: terminate, call "kill", job_id = {job.job_id}')
                    pipe_process.kill()
                    pipe_process.wait()
        with job.lock:
            dt_now = datetime.now(timezone.utc)
            job.status = "done"
            print(f'[DEBUG-cli]: interactive task: terminate, set status to "done", job_id = {job.job_id}')
            job.returncode = returncode
            if not job.execution_finished_at:
                job.execution_finished_at = dt_now
            job.last_activity_at = dt_now



    def handle_new_input():
        print(f'[DEBUG-cli]: interactive task: new input, job_id = {job.job_id}')
        with job.job_data.pipe_process_lock:
            process = job.job_data.pipe_process
            with job.lock:
                job.last_activity_at = datetime.now(timezone.utc)
            if job.status != "running":
                raise Exception(f'Can only call pipe_process.stdin.write() on context.jobs with status "running" (job_id: "{job.job_id}")')
            if not process or isinstance(process,int): # storing returncode when finished - just to reset to something, it is not actually used
                raise Exception(f'Can only call subprocess.stdin.write() when pipe_process exists (job_id: "{job_id}")')

            input_request_id, inp, read_convention = task.command

            with job.lock:
                if input_request_id in job.stdout_pipe:
                    raise Exception(f'Can only call pipe_process.stdin.write() with new input id, input_id: "{input_request_id}" (job_id: "{job.job_id}")')
                job.stdout_pipe[input_request_id] = {
                    'stdin': inp,
                }
                job.last_activity_at = datetime.now(timezone.utc)

            if not is_binary:
                process.stdin.write(inp + "\n")
            else:
                process.stdin.write(inp.encode() + b"\n")
            process.stdin.flush()

            with job.job_data.stderr_reader_lock:
                response = read_arbitrary_stdout_per_convention(process,read_convention)
            with job.lock:
                raise Exception('/command cli: interactive: stdin not implemented yet')



    if task.action=="new_command":
        print(f'[DEBUG-cli]: interactive task: received "new command" task, job_id = {job.job_id}')
        return handle_new_command()

    elif task.action=="terminate":
        print(f'[DEBUG-cli]: interactive task: received "terminate" task, job_id = {job.job_id}')
        return handle_terminate()

    # elif task.action=="stderr":
    #     return handle_consume_stderr()

    # elif task.action=="stdout":
    #     return handle_consume_stdout()

    elif task.action=="input":
        print(f'[DEBUG-cli]: interactive task: received "new input" task, job_id = {job.job_id}')
        return handle_new_input()

    else:
        raise Exception(f'cli: interactive command: task not recognized ({task.action})')
