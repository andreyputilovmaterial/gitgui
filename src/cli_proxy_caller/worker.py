

from threading import Thread


from .common_defs import (
    JobTask,
    JobMessage,
    BinaryDataBucket,
    Job,
)
from .common_context import (
    context,
)


from .gc_jobs import gc as gc_jobs
from .gc_binary_responses_storage import gc as gc_binary_responses_storage
from .err_logger import print_error

from .job_task_processors import job_task_processors






def processor_handle_gc(context,task=None,job_id=None):
    gc_jobs(context.jobs) # mutating
    gc_binary_responses_storage(context.binary_responses_storage,context.jobs) # mutating


def processor_handle_job(context,task,job_id):
    if job_id not in context.jobs:
        raise Exception(f'cli_proxy_caller: JobMessage: non-existent job_id (job_id: "{job_id}")') # this would kill the worker, obviously, and there's no alternative to it
    job = context.jobs[job_id]

    task_action_first_part, _, task_action_rest = task.action.partition(':')
    task.action = task_action_rest

    processor = job_task_processors.get(task_action_first_part,None)
    if not processor:
        raise Exception(f'cli_proxy_caller: JobTask: action not recognized ("{task.action}")') # this would kill the worker, obviously, and there's no alternative to it

    try:
        job.command = task.command
        job.is_binary = task.is_binary
        processor(job,context)
    except Exception as e:
        with job.lock:
            job.status = "error"
            job.error = e
            print_error(e)


task_processors = {
    'gc': processor_handle_gc,
    'job': processor_handle_job,
}



def worker():
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
    return Thread(target=worker, daemon=True).start()
