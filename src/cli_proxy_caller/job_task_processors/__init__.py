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

"""

from .handle_run_cli_command import handler as process_run_cli_command
from .handle_interactive_command import handler as process_interactive_commands
from .handle_task_from_function import handler as process_task_from_function


job_task_processors = {
    'new_command': process_run_cli_command,
    'interactive': process_interactive_commands,
    'processor_from_function': process_task_from_function,
}
