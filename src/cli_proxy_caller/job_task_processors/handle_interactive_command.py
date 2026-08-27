

from datetime import datetime, timedelta, timezone
import subprocess
import time # for sleep(5s) in collecting stderr loop
from threading import Thread # for stderr collector thread



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
    process = job.pipe_process



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
        with job.pipe_process_lock:
            process = subprocess.Popen(
                command,
                stdin = subprocess.PIPE,
                stdout = subprocess.PIPE,
                stderr = subprocess.PIPE,
                text = not is_binary,
                encoding = "utf-8" if not is_binary else None,
                bufsize = 0,
            )

            def consume_stderr():
                with job.pipe_process_lock:
                    process = job.pipe_process
                    # is_alive = not ( not process or (returncode is not None) or (not not execution_finished_at) )
                    # if not is_alive:
                    #     stderr = ''
                    #     with job.lock:
                    #         if not job.stderr:
                    #             job.stderr = ''
                    #         job.stderr = (job.stderr + stderr)[:10000000] # let's limit to 10 mb
                    while True:
                        chunk = process.stderr.read(8192)
                        if not chunk:
                            break
                        stderr += chunk
                    if is_binary:
                        stderr = stderr.decode("utf-8", errors="replace") # stderr always expected to be text; so, if in binary mode, we convert it to text
                    with job.lock:
                        if not job.stderr:
                            job.stderr = ''
                        job.stderr = (job.stderr + stderr)[:10000000] # let's limit to 10 mb
                    returncode = process.poll()
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
                def check_if_alive():
                    return not ( not process or (returncode is not None) or (not not execution_finished_at) )
                while True:
                    if not check_if_alive():
                        consume_stderr()  # final drain
                        break
                    consume_stderr()
                    time.sleep(1) # once per second

            def stdout_reader():
                # stdout is different from stderr
                # stderr is polled constantly in parallel thread
                # stdout is not - the recipient must receive the reader and read it in more "sync" way
                # but should anyway not be a blocker, because one of those 2 should be true:
                #  1. either the process finishes at some time, and the pipe is closed, and stdout read is released
                #  2. or the reader process knows how many bytes to read
                result = '' if not is_binary else b''
                while True:
                    chunk = process.stdout.read(8192)
                    if not chunk:
                        break
                    result += chunk
                return result

            stderr_consumer_thread = Thread(target=worker_consume_stderr, daemon=True)
            stderr_consumer_thread.start() # will die normally when its infinite loop is over - will happen when stderr pipe is closed, it happens when this process stops, so will terminate normally

            with job.lock:
                job.pipe_process = process
                job.last_activity_at = datetime.now(timezone.utc)
                job.stdout_reader = stdout_reader



    def handle_terminate():
        with job.lock:
            job.last_activity_at = datetime.now(timezone.utc)
        if process is None:
            return
        returncode = process.poll()
        # handle_consume_stderr() # no parallel - there is an already running thread for this!
        if returncode is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        with job.lock:
            dt_now = datetime.now(timezone.utc)
            job.status = "done"
            job.returncode = returncode
            if not job.execution_finished_at:
                job.execution_finished_at = dt_now
            job.last_activity_at = dt_now



    def handle_new_input():
        with job.pipe_process_lock:
            process = job.pipe_process
            with job.lock:
                job.last_activity_at = datetime.now(timezone.utc)
            if job.status != "running":
                raise Exception(f'Can only call process.stdin.write() on context.jobs with status "running" (job_id: "{job.job_id}")')
            if not process or isinstance(process,int): # storing returncode when finished - just to reset to something, it is not actually used
                raise Exception(f'Can only call subprocess.stdin.write() when process exists (job_id: "{job_id}")')

            input_request_id, inp, read_convention = task.command

            with job.lock:
                if input_request_id in job.stdout_pipe:
                    raise Exception(f'Can only call process.stdin.write() with new input id, input_id: "{input_request_id}" (job_id: "{job.job_id}")')
                job.stdout_pipe[input_request_id] = {
                    'stdin': inp,
                }
                job.last_activity_at = datetime.now(timezone.utc)

            if not is_binary:
                process.stdin.write(inp + "\n")
            else:
                process.stdin.write(inp.encode() + b"\n")
            process.stdin.flush()

            response = read_arbitrary_stdout_per_convention(process,read_convention)
            with job.lock:
                raise Exception('/command cli: interactive: stdin not implemented yet')



    if task.action=="new_command":
        return handle_new_command()

    elif task.action=="terminate":
        return handle_terminate()

    # elif task.action=="stderr":
    #     return handle_consume_stderr()

    # elif task.action=="stdout":
    #     return handle_consume_stdout()

    elif task.action=="input":
        return handle_new_input()

    else:
        raise Exception(f'cli: interactive command: task not recognized ({task.action})')
