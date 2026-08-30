

from collections.abc import Callable
from typing import Protocol, Any
from queue import Queue

from threading import Thread

from .common_context import (
    context as context_global,
)



from .gc.jobs import gc as gc_jobs
from .err_logger import print_error

from .job_task_processors import job_task_processors





class Context(Protocol):
    jobs: dict
    job_message_queue: Queue
    iface: object

class Task(Protocol):
    action: str
    command: Any
    is_binary: None | bool

Processor = Callable[[Context, Task, Any], None]




def processor_handle_gc(context: Context, task: Task, job_id: Any) -> None:
    gc_jobs(context.jobs) # mutating


def processor_handle_job(context: Context, task: Task, job_id: Any) -> None:
    if job_id not in context.jobs:
        raise Exception(f'cli_proxy_caller: JobMessage: non-existent job_id (job_id: "{job_id}")') # this would kill the worker, obviously, and there's no alternative to it
    job = context.jobs[job_id]

    task_action_first_part, _, task_action_rest = task.action.partition(':')
    task.action = task_action_rest

    processor: Processor | None = job_task_processors.get(task_action_first_part,None)
    if not processor:
        raise Exception(f'cli_proxy_caller: JobTask: action not recognized ("{task.action}")') # this would kill the worker, obviously, and there's no alternative to it

    try:
        job.command = task.command
        job.is_binary = task.is_binary
        processor(context,task,job)
    except Exception as e:
        associated_info: dict | None = None
        # Diagnostic information is best-effort only.
        # noinspection broad-exception
        try:
            associated_info = dict(task=task, job_id=job_id)
            if context and context.jobs:
                associated_info['job'] = context.jobs.get(job_id)
        except Exception: # to catch all except system exit or keyboard interrupt
            pass
        with job.lock:
            job.status = "error"
            job.error = e
            print_error(e, associated_info)


task_processors: dict[str,Processor] = {
    'gc': processor_handle_gc,
    'job': processor_handle_job,
}



def worker():
    context = context_global # just assign to local variable to have uniform code, always referencing "context", so that it is copyable between funciton
    while True:
        message = context.job_message_queue.get()
        job_id, task = message.job_id, message.task

        task_action_first_part, _, task_action_rest = task.action.partition(':')
        task.action = task_action_rest

        try:
            processor = task_processors.get(task_action_first_part,None)
            if not processor:
                # we don't have any better way
                # to indicate failure here,
                # other than crash process completely -
                # we can\'t send response
                # along with job id,
                # cause we don't have job_id parsed here
                # the only what we can do is to crash the process completely - at least it is visible
                raise Exception(f'cli_proxy_caller: JobTask: action not recognized ("{task.action}")') # this would kill the worker, obviously, and there's no alternative to it

            processor(context,task,job_id)

        except Exception as e:
            print_error(
                e,
                {'message':message,'job_id':job_id,'task':task,'task_action_first_part':task_action_first_part,},
            )
            raise e
        finally:
            context.job_message_queue.task_done()




def initiate_worker_loop(config):
    thread = Thread(target=worker, daemon=True)
    thread.start()
    return thread
