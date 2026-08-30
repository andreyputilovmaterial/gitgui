

import uuid # for assigning new id to new job

from .common_defs import (
    JobTask,
    JobMessage,
    Job,
)
from .common_context import (
    context,
)


def initiate_command(command,config,is_binary=False,is_interactive=False,options:dict|None=None):
    """
        Receives: command, and couple more conditional flags - is_binary, is_interactive
        Returns: new job id
    """

    def sanitize_command(command):
        return command

    if not options:
        options = {}

    context.job_message_queue.put( JobMessage( job_id = None, task = JobTask( action = "gc", ) ) )

    job_id = str(uuid.uuid4())

    job = Job(
        job_id = job_id,
        status = 'fresh',
        options = options, # example: { stdout_chunk_size: 8, stderr_chunk_size: 4, }
    )
    job.last_activity_at = job.created_at

    context.jobs[job_id] = job

    command = sanitize_command(command)
    if not is_interactive:
        context.job_message_queue.put(
            JobMessage(
                job_id = job_id,
                task = JobTask(
                    action = "job:new_command",
                    command = command,
                    is_binary = is_binary,
                )
            )
        )
    else:
        context.job_message_queue.put(
            JobMessage(
                job_id = job_id,
                task = JobTask(
                    action = "job:interactive:new_command",
                    command = command,
                    is_binary = is_binary,
                )
            )
        )

    return job.as_dict()



def get_job(job_id,config):
    """
        For polling
        Receives: job id to check
        Returns: job object, suitable for JSON, with status field, stdout (for non-interactive), stderr, returncode...
        For interative commands, stderr is populated as it is outputted from the process, and can be checked here from returned job object
        But stdout will be missing - please call get_job_stdout_reader to get stdout reader
    """

    HTTP404 = config.get("iface").get("HTTP404")

    job = None
    if not job_id:
        raise HTTP404(f'cli_command_get_job: job_id is missing')
    elif job_id not in context.jobs:
        raise HTTP404(f'cli_command_get_job: job_id "{job_id}" not found')
    else:
        job_data = context.jobs[job_id].as_dict()

    context.job_message_queue.put( JobMessage( job_id = None, task = JobTask( action = "gc", ) ) )

    return job_data



def terminate_job(job_id,config):
    """
        Asks to terminate a job, and delete job object
        I don't think I will use this, jobs should normally finish naturally...
        But will definitely need for continues processes listening for stdin, like git --cat-file --batch
        Returns... Just something. I think, None is returned, and can be sent as payload
    """

    HTTP404 = config.get("iface").get("HTTP404")

    job = None
    if not job_id:
        raise HTTP404(f'cli_command_get_job: job_id is missing')
    elif job_id not in context.jobs:
        raise HTTP404(f'cli_command_get_job: job_id "{job_id}" not found')
    else:
        job = context.jobs[job_id]

    with job.lock:
        job.flag_for_deletion = True

    if job.is_interactive:
        context.job_message_queue.put(
            JobMessage(
                job_id = job_id,
                task = JobTask(
                    action = "job:interactive:terminate",
                )
            )
        )

    context.job_message_queue.put( JobMessage( job_id = None, task = JobTask( action = "gc", ) ) )
    return None



def get_job_stdout_reader(job_id,config):
    """
        Receives stdout stream reader

        Can be blocking if output is missing and process is still alive - should
            not be an issue if you control process lifecycle separately

        Will not return a reader on non-interative jobs - please use job.stdout normally

        Receives: job id

        Returns: reader function
    """

    HTTP404 = config.get("iface").get("HTTP404")

    reader = None
    if not job_id:
        raise HTTP404(f'cli_command_get_job: job_id is missing')
    elif job_id not in context.jobs:
        raise HTTP404(f'cli_command_get_job: job_id "{job_id}" not found')
    else:
        job = context.jobs[job_id]
        with job.lock:
            # I probably don't need a lock, but I'll keep
            # it here for pattern, and to not forget
            # that it exists if I need more lines;
            # sorry for little overhead for
            # "locking", but I believe it will not have such big impact on performance
            reader = job.stdout_reader

    context.job_message_queue.put( JobMessage( job_id = None, task = JobTask( action = "gc", ) ) )

    if not reader:
        # hmm, do I have an option of returning something else, other than 404? Not sure
        raise HTTP404(f'cli_command_get_job: job does not provide stdout reader "{job_id}"')

    return reader
