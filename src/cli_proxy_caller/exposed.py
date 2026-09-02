

import uuid # for assigning new id to new job
from collections.abc import Callable

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
        A function to start new cli command.
        You will then have to call get_job repeatedly (in polling) to check for status updates, when it's "done".
        The command can be:
        1. binary or text - see is_binary flag
        2. sync or interactive - see "is_interactive" flag.

        If command is "sync" (is_interactive==False) - it means
        subprocess.run() is used,
        and you should not expect status updates until if finishes.

        If command is "interactive) (is_interactive==True) - it means
        subprocess.Popen() is used,
        and you can
        - check stderr while it is still running
          (warning: depending on chunk size - if printed piece of text is smaller,
          it is not updated, until there is enough stderr to fill up the whole chunk,
          or the process finishes; default chunk size is pretty small, 8 bytes, so
          that stderr outputs are delivered constantly;
           chunk size can be sent in stdout_chunk_size and stderr_chunk_size fields in "options" dict here
        - retrieve readr function and start streaming the response,
        - set output to pipe - for example, to tar to get outputs saved ot to textconv and get outputs streamed back as text
        - send stdin signals...
        - send terminate signal...


        Other options can be used to pass other config options - for example, preferred chunk size in stdout reader...
        Or something like that

        Will return job dict that contains new job id

        Receives: cli command to execute, is_binary flag, is_interactive flag, other request options

        Returns: job dict that contains new job id
    """

    def sanitize_command(command):
        return command

    if not options:
        options = {}

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

    context.job_message_queue.put( JobMessage( job_id = None, task = JobTask( action = "gc", ) ) )
    return job.as_dict()


def initiate_from_function(fn: Callable, args, inp, config, options: dict | None = None):
    """
        A helper function to be called for pipes

        Receives:
          - fn: a function to execute, instead of cli "command"
          - args: additional args, whatever is usually passed to tar, and whatever other handler
          - inp: data to be passed to function, playes same role of stdin
          - config: global congig object
          - options - options object, to provide a comforrtable way to set oather parameters

        Returns: job dict that contains new job id
    """

    if not options:
        options = {}

    job_id = str(uuid.uuid4())

    job = Job(
        job_id    = job_id,
        status    = 'fresh',
        options   = options,  # example: { stdout_chunk_size: 8, stderr_chunk_size: 4, }
    )
    job.last_activity_at = job.created_at

    context.jobs[job_id] = job

    context.job_message_queue.put(
        JobMessage(
            job_id = job_id,
            task = JobTask(
                action = "job:processor_from_function:new_command",
                command = (fn, args, inp,),
            )
        )
    )

    context.job_message_queue.put(JobMessage(job_id=None, task=JobTask(action="gc", )))
    return job.as_dict()





def get_job(job_id,config):
    """
        For polling
        Receives: job id to check status
        Returns: job object, suitable for JSON, with status field, stdout (for non-interactive), stderr, returncode...
        For interactive commands, stderr is populated as it is outputted from the process, and can be checked here from returned job object
        But stdout will be missing - please call get_job_stdout_reader to get stdout reader

        Receives: job id, global config object

        Returns: job dict
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

        Receives: job id, global config object

        Returns: empty response, it finishes without exception, it means signal is
           received and the process will temrinate soon
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
        A function to receive stdout stream reader
        Accepts job id, returns stream reader function

        Can be blocking if output is missing and process is still alive - should
            not be an issue if you control process lifecycle separately
            so, 2 scenarios here:
            1. you consume whatever is available in stdout, and you are okay that
               this function can get stuck in pending state for longer time, cause
               you know the process will finish at some time, and the pipe will
               be released, and this reader will finish
            2. The process does not stop by itself, but you can still send "terminate"
               signal - then it's similar, pipe is broken, reader process is released,
               reader function finishes normally.

               If you use other methods to send stdin, then you know how many bytes you need
               to read (not implemented as of 9/1/2026)

        Does not make much sense on non-interative jobs - please use job.stdout normally, it's easier

        Receives: job id, global config object

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


