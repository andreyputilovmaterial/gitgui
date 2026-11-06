"""
    This module will...

    Mental model:

    1. run normal, "sync", command:
        - request reaches endpoint in /frontend/endpoints
        - the callback is called, implemented in cli
        - in cli, it generates job id and puts a message "new command" to queue
        - when finishes, worker thread updates the job object
        - polling can request the job object
        simple as is

    2. start "interactive" (piped) command:
        - same, request reaches... blahblahblah
        - in cli, it generates job id and puts a message "interactive: new command" to queue
        - "interactive" handler is caled
        ...somewhat similar, but async

    3. for pipes
        - similar infrastructure, keeping commands in same job dict, accessible from frontend
        - but is implemented from arbitrary function passed in argument
        - for example, the function that handles tar, or textconv

    All three kinds look identical to the frontend: a job object with an id, a
    status, and (for streamed output) a stdout reader. A "pipe" is a chain of such
    jobs where each participant consumes the previous participant's stdout. Every
    participant runs concurrently, so whoever wires the pipe must start draining
    the next participant's output *before* awaiting the current one's completion —
    otherwise the producer fills its OS pipe buffer and blocks. See
    docs/streaming-jobs.md for the full model.
"""

from .handle_run_cli_command import handler as process_run_cli_command
from .handle_interactive_command import handler as process_interactive_commands
from .handle_task_from_function import handler as process_task_from_function


job_task_processors = {
    'new_command': process_run_cli_command,
    'interactive': process_interactive_commands,
    'processor_from_function': process_task_from_function,
}
