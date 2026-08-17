
from queue import Queue
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Thread
import subprocess
import uuid
# from pathlib import Path
from typing import Any
import copy


from .gc import gc



@dataclass
class Job:
    job_id: Any
    command: Any
    is_binary: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))



jobs = {}
job_queue = Queue()


def worker():
    while True:
        job_from_queue = job_queue.get()
        job_id, command, is_binary = job_from_queue.job_id, job_from_queue.command, job_from_queue.is_binary

        job = jobs[job_id]
        job["status"] = "running"
        job["command"] = command
        job["execution_started_at"] = datetime.now(timezone.utc)

        try:
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

            job["execution_finished_at"] = datetime.now(timezone.utc)
            job["status"] = "done"
            job["returncode"] = result.returncode
            if not is_binary:
                job["stdout"] = result.stdout
            else:
                job["stdout"] = ""
                job["stdout_rawbytes"] = result.stdout
            if not is_binary:
                job["stderr"] = result.stderr
            else:
                stderr_txt = result.stderr.decode("utf-8", errors="replace")
                job["stderr"] = stderr_txt

        except Exception as ex:
            job["status"] = "error"
            job["error"] = str(ex)

        finally:
            job_queue.task_done()


def initiate_worker_loop(config):
    return Thread(target=worker, daemon=True).start()





def initiate_cli_command(command,config,is_binary=False):

    def sanitize_command(command):
        return command

    gc(jobs) # mutating
    job_id = str(uuid.uuid4())

    job = {
        "job_id": job_id,
        "status": "queued",
        "created_at": datetime.now(timezone.utc),
    }

    jobs[job_id] = job

    command = sanitize_command(command)
    job_queue.put(Job(job_id=job_id, command=command, is_binary=is_binary))

    return copy.deepcopy(job)

def get_cli_command_status(job_id,config):

    HTTP404 = config.get("HTTP404")

    job = None
    if not job_id:
        raise HTTP404(f'get_cli_command_status: Job ID is missing')
    if job_id not in jobs:
        raise HTTP404(f'get_cli_command_status: Job ID "{job_id}" not found')
    else:
        job = copy.deepcopy(jobs[job_id])

    gc(jobs) # mutating

    return job
