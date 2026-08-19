
from queue import Queue
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Thread, Lock
import subprocess
import uuid
# from pathlib import Path
from typing import Any
# import copy


from .gc import gc



@dataclass
class JobTask:
    action: str
    command: Any | None = None
    is_binary: bool | None = None

@dataclass
class JobMessage:
    job_id: Any
    task: JobTask
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

@dataclass
class Job:
    job_id: str
    status: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    lock: Lock = field(default_factory=Lock, repr=False)
    error: Any = None
    command: Any = None
    is_continuous: bool | None = None
    is_binary: bool | None = None
    execution_started_at: datetime | None = None
    execution_finished_at: datetime | None = None
    last_activity_at: datetime | None = None
    returncode: int | None = None
    stdout: str | None = None
    stdout_rawbytes: Any = None
    stdout_pipe: dict | None = None
    stderr: str | None = None
    pipe_process: subprocess.Popen | None = field(default=None, repr=False)
    def as_dict(self):
        with self.lock:
            return {
                'job_id': self.job_id,
                'status': self.status,
                'created_at': self.created_at,
                'error': self.error,
                'command': self.command,
                'is_continuous': self.is_continuous,
                'is_binary': self.is_binary,
                'execution_started_at': self.execution_started_at,
                'execution_finished_at': self.execution_finished_at,
                'last_activity_at': self.last_activity_at,
                'returncode': self.returncode,
                'stdout': self.stdout,
                'stdout_rawbytes': self.stdout_rawbytes,
                'stdout_pipe': self.stdout_pipe,
                'stderr': f'{self.stderr}',
            }



def read_stdout_per_convention_newline(process):
    data = process.stdout.readline()
    return data

def read_stdout_per_convention_gitcatfile(process):
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
    'newline': read_stdout_per_convention_newline,
    'gitcatfile': read_stdout_per_convention_gitcatfile,
}

def read_stdout_per_convention(process,read_convention):
    converter = read_conventions.get(read_convention,None)
    if converter:
        return converter(process)
    else:
        raise Exception(f'read_stdout: read convention is not supported: {read_convention}')



jobs = {}
job_message_queue = Queue()


def worker():
    while True:
        message = job_message_queue.get()
        job_id, task = message.job_id, message.task

        if task.action=="gc":
            gc(jobs) # mutating
            continue

        if job_id not in jobs:
            raise Exception(f'cli_proxy_caller: JobMessage: non-existent job_id ("{job_id}")') # this would kill the worker, obviously, and there's no alternative to it
        job = jobs[job_id]

        if task.action=="run_cli_command":

            try:
                command = task.command
                is_binary = task.is_binary
                with job.lock:
                    if job.status != "fresh":
                        raise Exception(f'Can only call subprocess.run() on jobs with status "fresh" ("{job_id}")')
                    job.status = "running"
                    job.command = command
                    job.is_continuous = False
                    job.is_binary = is_binary
                    job.execution_started_at = datetime.now(timezone.utc)
                    job.last_activity_at = job.execution_started_at

                result = None
                if not is_binary:
                    result = subprocess.run(
                        command,
                        capture_output=True,
                        text=True,
                        check=False,
                        encoding='utf-8',
                    )
                else:
                    result = subprocess.run(
                        command,
                        capture_output=True,
                        text=False,
                        check=False,
                    )

                with job.lock:
                    job.execution_finished_at = datetime.now(timezone.utc)
                    job.last_activity_at = job.execution_finished_at
                    job.status = "done"
                    job.returncode = result.returncode
                    if not is_binary:
                        job.stdout = result.stdout
                    else:
                        job.stdout = ""
                        job.stdout_rawbytes = result.stdout
                    if not is_binary:
                        job.stderr = result.stderr
                    else:
                        stderr_txt = result.stderr.decode("utf-8", errors="replace")
                        job.stderr = stderr_txt

            except Exception as ex:
                with job.lock:
                    job.status = "error"
                    job.error = ex

            finally:
                job_message_queue.task_done()

        elif task.action=="pipe_terminate":
            try:
                with job.lock:
                    job.last_activity_at = datetime.now(timezone.utc)
                process = job.pipe_process
                is_binary = job.is_binary
                if process is None:
                    return
                if not process or isinstance(process,int):
                    raise Exception(f'Can only call subprocess.poll() when process exists ("{job_id}")')
                returncode = process.poll()
                if returncode is None:
                    process.terminate()
                    try:
                        process.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
                for line in process.stderr:
                    stderr += line
                if is_binary:
                    stderr = stderr.decode("utf-8", errors="replace")
                with job.lock:
                    if not job.stderr:
                        job.stderr = ''
                    job.stderr += stderr
                with job.lock:
                    job.status = "done"
                    job.returncode = returncode
                    job.pipe_process = returncode
                    job.execution_finished_at = datetime.now(timezone.utc)
                    job.last_activity_at = job.execution_finished_at
            except Exception as ex:
                with job.lock:
                    job.status = "error"
                    job.error = ex
                    job.pipe_process = -1

            finally:
                job_message_queue.task_done()

        elif task.action=="pipe_check_stderr":
            try:
                process = job.pipe_process
                is_binary = job.is_binary
                stderr = ''
                if not process or isinstance(process,int):
                    raise Exception(f'Can only call subprocess.poll() when process exists ("{job_id}")')
                for line in process.stderr:
                    stderr += line
                if is_binary:
                    stderr = stderr.decode("utf-8", errors="replace")
                with job.lock:
                    if not job.stderr:
                        job.stderr = ''
                    job.stderr += stderr
                returncode = process.poll()
                if returncode is not None:
                    with job.lock:
                        job.status = "done"
                        job.returncode = returncode
                        job.pipe_process = returncode
                        job.execution_finished_at = datetime.now(timezone.utc)
                        job.last_activity_at = job.execution_finished_at
            except Exception as ex:
                with job.lock:
                    job.status = "error"
                    job.error = ex
                job_message_queue.put( JobMessage( job_id = job_id, task = JobTask( action = "pipe_terminate", ) ) )

            finally:
                job_message_queue.task_done()

        elif task.action=="pipe_open":
            try:
                command = task.command
                is_binary = task.is_binary
                with job.lock:
                    if job.status != "fresh":
                        raise Exception(f'Can only call subprocess.Popen() on jobs with status "fresh" ("{job_id}")')
                    job.status = "running"
                    job.command = command
                    job.is_continuous = True
                    job.is_binary = is_binary
                    job.execution_started_at = datetime.now(timezone.utc)
                    job.last_activity_at = job.execution_started_at
                promess = None
                if not is_binary:
                    process = subprocess.Popen(
                        command,
                        stdin=subprocess.PIPE,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        encoding="utf-8",
                        bufsize=1,
                    )
                else:
                    process = subprocess.Popen(
                        command,
                        stdin=subprocess.PIPE,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=False,
                        check=False,
                        bufsize=1,
                    )
                with job.lock:
                    job.pipe_process = process
                    stdout_pipe = {}
                    job.last_activity_at = datetime.now(timezone.utc)
                job_message_queue.put( JobMessage( job_id = job_id, task = JobTask( action = "pipe_terminate", ) ) )
            except Exception as ex:
                with job.lock:
                    job.status = "error"
                    job.error = ex

            finally:
                job_message_queue.put(
                    JobMessage(
                        job_id = job_id,
                        task = JobTask(
                            action = "pipe_check_stderr",
                        )
                    )
                )
                job_message_queue.task_done()

        elif task.action=="pipe_message":
            try:
                process = job.pipe_process
                is_binary = job.is_binary
                with job.lock:
                    job.last_activity_at = datetime.now(timezone.utc)
                if job.status != "running":
                    raise Exception(f'Can only call process.stdin.write() on jobs with status "running" ("{job_id}")')
                if not process or isinstance(process,int):
                    raise Exception(f'Can only call subprocess.stdin.write() when process exists ("{job_id}")')

                input_request_id, inp, read_convention = task.command

                process.stdin.write(inp.encode() + b"\n")
                process.stdin.flush()

                response = read_stdout_per_convention(process,read_convention)
                # ...

                raise NotImplementedError('cli_proxy_caller: pipe_message: not implemented')
            except Exception as ex:
                with job.lock:
                    job.status = "error"
                    job.error = ex

            finally:
                job_message_queue.put( JobMessage( job_id = job_id, task = JobTask( action = "pipe_check_stderr", ) ) )
                job_message_queue.task_done()

        else:
            raise Exception(f'cli_proxy_caller: JobTask: action not recognized ("{task.action}")') # this would kill the worker, obviously, and there's no alternative to it


def initiate_worker_loop(config):
    return Thread(target=worker, daemon=True).start()





def initiate_cli_command(command,config,is_binary=False):

    def sanitize_command(command):
        return command

    job_message_queue.put( JobMessage( job_id = None, task = JobTask( action = "gc", ) ) )
    job_id = str(uuid.uuid4())

    job = Job(
        job_id = job_id,
        status = 'fresh',
    )
    job.last_activity_at = job.created_at

    jobs[job_id] = job

    command = sanitize_command(command)
    job_message_queue.put(
        JobMessage(
            job_id = job_id,
            task = JobTask(
                action = "run_cli_command",
                command = command,
                is_binary = is_binary,
            )
        )
    )

    return job.as_dict()

def get_cli_command_status(job_id,config):

    HTTP404 = config.get("iface").get("HTTP404")

    job = None
    if not job_id:
        raise HTTP404(f'get_cli_command_status: job ID is missing')
    if job_id not in jobs:
        raise HTTP404(f'get_cli_command_status: job ID "{job_id}" not found')
    else:
        job = jobs[job_id].as_dict()

    job_message_queue.put( JobMessage( job_id = None, task = JobTask( action = "gc", ) ) )

    return job
