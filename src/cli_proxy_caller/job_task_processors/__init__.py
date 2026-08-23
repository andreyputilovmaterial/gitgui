

from .handle_run_cli_command import handler as processed_run_cli_command_job
from .handle_piped_command import handler as process_piped_jobs


job_task_processors = {
    'run_cli_command': processed_run_cli_command_job,
    'pipe': process_piped_jobs,
}
