

from datetime import datetime, timezone
import argparse
from pathlib import Path
from dotenv import load_dotenv # for loading .env
import os # for loading .env


from .webserver_engine.webserve.src.webserver import Webserver # a wrapper around python http.server - no flask or django
from .webserver_engine.webserve.src.webserver import HTTP403, HTTP404, WebResponse
from .browser_launcher import (
    BROWSER_MODE_DEFAULT,
    BROWSER_MODE_NOOP,
    BROWSER_MODE_PYWEBVIEW,
    launch_browser_for_mode,
)
from .cli_proxy_caller import (
    initiate_worker_loop as cli_initiate_worker_loop,
    initiate_gc_loop as cli_initiate_gc_loop,
    initiate_command as cli_command_initiate,
    initiate_from_function as cli_initiate_from_function,
    get_job as cli_command_get_job,
    get_job_stdout_reader as cli_command_get_job_stdout_reader,
    terminate_job as cli_command_terminate_job,
    send_input as cli_send_input,
    get_jobs_perf_stats,
)
from .cli_proxy_caller.read_conventions import (
    register_read_convention,
    read_newline,
    read_git_cat_file_batch,
)
from .textconv import (
    textconv_from_data,
    textconv_from_stream,
)
from .output_postprocessors import register_output_postprocessor, output_postprocessors #, get_output_postprocessor
from .output_postprocessors.tar import tar_output_processor
from .output_postprocessors.textconv import make_textconv_output_processor
from .GENERATED.VERSION import _VERSION as script_version
from .GENERATED.HELP import _HELP_MSG as help_md
# The licenses registry is bundled as a *structured* Python object at build
# time (build_templates.py --program bundle-json-into-py parses the JSON and
# writes the native dict via repr), so no json.loads is needed here. See that
# program's docstring for the alternative (embed the literal JSON string and
# parse it at runtime).
from .GENERATED.SOFTWARE_LICENSES import _SOFTWARE_LICENSES as software_licenses
from .GENERATED.CONFIG import GITIGNORE_PRESETS as gitignore_presets
from .helper_utilities import prettyprint_config, make_hash, is_in_pinliner, assess_python_ver
from .helper_webserve_logging import WebserveLogger
from .helper_backend_port import _resolve_port, PORT_START_WITH
from .get_app_home_dir import get_app_home_dir

from .endpoints import endpoints

if is_in_pinliner():
    from .GENERATED.HARDCODED import _CREDENTIALS_STR as credentials_str
    credentials_str = credentials_str.strip()
else:
    load_dotenv()
    credentials_str = os.getenv("CREDENTIALS", "-")



CONFIG_WEBSERVER_MULTITHREADED = True
CONFIG_CLI_COMMAND_EXEC_WORKERS = 3


script_version = f'{script_version}'.strip()

# STDOUT_COLOR_RED = "\033[91m"
STDOUT_COLOR_RED = "\033[31m"
STDOUT_COLOR_RESET = "\033[0m"
STDOUT_COLOR_GREEN = "\033[32m"







def main(*argcs,**kwargs):
    time_start = datetime.now(timezone.utc)
    script_name = 'gitgui script'

    parser = argparse.ArgumentParser(
        description="gitgui"
    )
    parser.add_argument(
        #'-1',
        '--working-tree',
        type=str,
        required=True
    )
    parser.add_argument(
        #'-1',
        '--git-directory-location',
        type=str,
        required=True
    )
    parser.add_argument(
        '--config-webserver-port',
        type=str,
        default=None,
        help=(
            'Port to run the backend webserver on. An integer uses that exact '
            'port (the program fails if it is already taken); "auto" uses the '
            f'first available port from {PORT_START_WITH} upwards (the default, '
            'incrementing by one); "auto:<N>" is the same search but starts at '
            '<N> instead.'
        )
    )
    parser.add_argument(
        '--browser',
        choices=[BROWSER_MODE_DEFAULT, BROWSER_MODE_NOOP, BROWSER_MODE_PYWEBVIEW],
        default=BROWSER_MODE_DEFAULT,
        help=(
            'How to open the UI once the backend webserver is running: '
            '"launch-system-default-browser" opens the OS default browser '
            '(the default), "no-op" starts headless without opening a browser '
            '(used by dev automation), and "pywebview" is reserved but not '
            'implemented yet.'
        )
    )
    args = parser.parse_args(*argcs,**kwargs)

    if args.browser == BROWSER_MODE_PYWEBVIEW:
        raise NotImplementedError(
            f'--browser {BROWSER_MODE_PYWEBVIEW} is not implemented yet'
        )

    print(f'{STDOUT_COLOR_GREEN}starting {script_name} at {time_start}{STDOUT_COLOR_RESET}')
    config = {
        'time_start': time_start,
        'script_name': script_name,
        'script_version': script_version,
        'credentials:year': f'{datetime.now().year}',
        'credentials:name': credentials_str,
        'credentials:version': script_version,

        'help_pages': help_md,
        'software_licenses': software_licenses,

        'working_tree': None,
        'git_directory_location': None,
        'git_directory': None,
        'git_paths_hash': None,
        'app_home_dir': None,

        'http_host': None,
        'http_port': None,
        'http_address': None,

        'gitignore_presets': gitignore_presets,

        'app_config': {
            'is_webserver_multithreaded': CONFIG_WEBSERVER_MULTITHREADED,
            'num_cli_command_exec_workers': CONFIG_CLI_COMMAND_EXEC_WORKERS,
        },

        'info': {},
        'warnings': [],

        'iface': {
            'cli_command_initiate': cli_command_initiate,
            'cli_initiate_from_function': cli_initiate_from_function,
            'cli_command_get_job': cli_command_get_job,
            'cli_command_get_job_stdout_reader': cli_command_get_job_stdout_reader,
            'cli_command_terminate_job': cli_command_terminate_job,
            'cli_send_input': cli_send_input,
            'get_jobs_perf_stats': get_jobs_perf_stats,
            'WebResponse': WebResponse,
            'HTTP403': HTTP403,
            'HTTP404': HTTP404,
            'textconv_from_data': textconv_from_data,
            'textconv_from_stream': textconv_from_stream,
            'output_postprocessors': output_postprocessors,
        },
    }

    verify_python_ver = assess_python_ver()
    config['info'].update(verify_python_ver)
    if verify_python_ver.get('is_not_supported'):
        config['warnings'].append(f'Warning: python {verify_python_ver.get("python_version")} is quite old and is beyond its EOL and is not receiving security updates. Please consider updating.')

    register_output_postprocessor('tar',tar_output_processor)
    register_output_postprocessor('textconv',make_textconv_output_processor(config))
    register_read_convention('newline',read_newline)
    register_read_convention('gitcatfile',read_git_cat_file_batch)

    if args.working_tree:
        working_tree = f'{args.working_tree}' # make sure it's text
        working_tree = Path(working_tree).resolve()
        config['working_tree'] = f'{working_tree}'
    else:
        # print(f'{STDOUT_COLOR_RED}working-tree-folder not specified{STDOUT_COLOR_RESET}')
        raise Exception('working-tree not specified')

    if args.git_directory_location:
        git_directory_location = f'{args.git_directory_location}' # make sure it's text
        git_directory_location = Path(git_directory_location).resolve()
        git_directory = git_directory_location / '.git'
        config['git_directory'] = f'{git_directory}'
        config['git_directory_location'] = f'{git_directory_location}'
    else:
        # print(f'{STDOUT_COLOR_RED}git-repo-folder not specified{STDOUT_COLOR_RESET}')
        raise Exception('git-directory-location not specified')

    config['git_paths_hash'] = make_hash(working_tree,git_directory)

    app_home_dir = get_app_home_dir()
    config['app_home_dir'] = f'{app_home_dir}'

    print('\npreparing git cli command loop...\n')
    for _ in range (0,CONFIG_CLI_COMMAND_EXEC_WORKERS):
        cli_initiate_worker_loop(config)
    cli_initiate_gc_loop(config)

    print('\npreparing webserver...\n')
    config['http_host'] = 'localhost'
    config['http_port'] = _resolve_port(args.config_webserver_port, config['http_host'])
    config['http_protocol'] = 'http'
    config['http_address'] = (
        f'{config["http_protocol"]}://'
        f'{config["http_host"]}:{config["http_port"]}'
    )

    cfg_to_print_verify = {
        "working-tree-folder":config.get("working_tree"),
        "git-repo-folder":config.get("git_directory"),
        "http address":config.get("http_address"),
    }
    print(f'CONFIG:\n{prettyprint_config(cfg_to_print_verify)}')
    print('\n')
    server = Webserver(config,is_threading=CONFIG_WEBSERVER_MULTITHREADED, logging_enabled=False) # a wrapper around python http.server - no flask or django
    server.assign_handlers(endpoints)

    # webserve's built-in console logging is off (logging_enabled=False above); we
    # re-implement it here by subscribing to webserve's events. The log records are
    # kept in a local variable and exposed through config['iface'] via a getter, so
    # the live (potentially large) list is never serialized as part of the config.
    webserve_logger = WebserveLogger(config)
    server.events.subscribe(webserve_logger.handle_event)
    webserve_log_records = webserve_logger.records
    config['iface']['get_webserve_log_records'] = lambda: webserve_log_records

    # print(f'{STDOUT_COLOR_GREEN}starting webserver at {config.get("http_address")}{STDOUT_COLOR_RESET}')

    launch_browser_for_mode(args.browser, f'{config.get("http_address")}/')
    server.run()


if __name__ == '__main__':
    main()
