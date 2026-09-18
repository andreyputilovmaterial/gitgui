

from datetime import datetime, timezone
import argparse
from pathlib import Path
from dotenv import load_dotenv # for loading .env
import os # for loading .env


from .webserver_engine.webserve.src.webserver import Webserver # a wrapper around python http.server - no flask or django
from .webserver_engine.webserve.src.webserver import HTTP403, HTTP404, WebResponse
from .webserver_engine.webserve.src.find_free_port import find_free_port
from .webserver_engine.webserve.src.launch_browser import launch_browser
from .cli_proxy_caller import (
    initiate_worker_loop as cli_initiate_worker_loop,
    initiate_command as cli_command_initiate,
    initiate_from_function as cli_initiate_from_function,
    get_job as cli_command_get_job,
    get_job_stdout_reader as cli_command_get_job_stdout_reader,
    terminate_job as cli_command_terminate_job,
)
from .textconv import (
    textconv_from_data,
    textconv_from_stream,
)
from .output_postprocessors import register_output_postprocessor, output_postprocessors #, get_output_postprocessor
from .output_postprocessors.tar import tar_output_processor
from .GENERATED.VERSION import _VERSION as script_version
from .GENERATED.HELP import _MD as help_md
from .GENERATED.CONFIG import GITIGNORE_PRESETS as gitignore_presets
from .helper_utilities import prettyprint_config, make_hash, is_in_pinliner, assess_python_ver

from .endpoints import endpoints

if is_in_pinliner():
    from .GENERATED.HARDCODED import _CREDENTIALS_STR as credentials_str
    credentials_str = credentials_str.strip()
else:
    load_dotenv()
    credentials_str = os.getenv("CREDENTIALS", "-")



CONFIG_WEBSERVER_MULTITHREADED = True
CONFIG_CLI_COMMAND_EXEC_WORKERS = 3
PORT_START_WITH = 5180


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
    args = parser.parse_args(*argcs,**kwargs)

    print(f'{STDOUT_COLOR_GREEN}starting {script_name} at {time_start}{STDOUT_COLOR_RESET}')
    config = {
        'time_start': time_start,
        'script_name': script_name,
        'script_version': script_version,
        'credentials:year': f'{datetime.now().year}',
        'credentials:name': credentials_str,
        'credentials:version': script_version,

        'help_pages': help_md,

        'working_tree': None,
        'git_directory_location': None,
        'git_directory': None,
        'git_paths_hash': None,

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
    register_output_postprocessor('textconv',textconv_from_stream)

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

    print('\npreparing git cli command loop...\n')
    for _ in range (0,CONFIG_CLI_COMMAND_EXEC_WORKERS):
        cli_initiate_worker_loop(config)

    print('\npreparing webserver...\n')
    config['http_host'] = 'localhost'
    config['http_port'] = find_free_port(config['http_host'], start=PORT_START_WITH)
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
    server = Webserver(config,is_threading=CONFIG_WEBSERVER_MULTITHREADED) # a wrapper around python http.server - no flask or django
    server.assign_handlers(endpoints)
    # print(f'{STDOUT_COLOR_GREEN}starting webserver at {config.get("http_address")}{STDOUT_COLOR_RESET}')

    launch_browser(f'{config.get("http_address")}/')
    server.run()
