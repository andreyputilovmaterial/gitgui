

import uuid # for assigning new id to new job

from .common_defs import (
    JobTask,
    JobMessage,
    BinaryDataBucket,
    Job,
)
from .common_context import (
    context,
)


def initiate_cli_command(command,config,is_binary=False):

    def sanitize_command(command):
        return command

    context.job_message_queue.put( JobMessage( job_id = None, task = JobTask( action = "gc", ) ) )
    job_id = str(uuid.uuid4())

    job = Job(
        job_id = job_id,
        status = 'fresh',
    )
    job.last_activity_at = job.created_at

    context.jobs[job_id] = job

    command = sanitize_command(command)
    context.job_message_queue.put(
        JobMessage(
            job_id = job_id,
            task = JobTask(
                action = "job:run_cli_command",
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
        raise HTTP404(f'get_cli_command_status: job_id is missing')
    elif job_id not in context.jobs:
        raise HTTP404(f'get_cli_command_status: job_id "{job_id}" not found')
    else:
        job = context.jobs[job_id].as_dict()

    context.job_message_queue.put( JobMessage( job_id = None, task = JobTask( action = "gc", ) ) )

    return job

def get_binary_data(job_id,binary_bucket_id,config):

    HTTP404 = config.get("iface").get("HTTP404")

    result = None
    if not job_id:
        raise HTTP404(f'get_binary_data: job_id is missing')
    elif job_id not in context.jobs:
        raise HTTP404(f'get_binary_data: job_id "{job_id}" not found')
    elif not binary_bucket_id:
        raise HTTP404(f'get_binary_data: binary_bucket_id is missing')
    elif binary_bucket_id not in context.binary_responses_storage:
        raise HTTP404(f'get_binary_data: binary_bucket_id "{binary_bucket_id}" not found')
    else:
        binary_bucket = context.binary_responses_storage[binary_bucket_id]
        with binary_bucket.lock:
            binary_bucket.accessed = True
            result = binary_bucket.data

    context.job_message_queue.put( JobMessage( job_id = None, task = JobTask( action = "gc", ) ) )

    return result
