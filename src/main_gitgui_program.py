

from datetime import datetime, timezone
import argparse
from pathlib import Path
from dotenv import load_dotenv # for loading .env
import os # for loading .env


from .webserver_engine.webserver import Webserver # a wrapper around python http.server - no flask or django
from .webserver_engine.webserver import HTTP403, HTTP404, WebResponse
from .webserver_engine.find_free_port import find_free_port
from .webserver_engine.launch_browser import launch_browser
from .cli_proxy_caller import initiate_worker_loop, initiate_cli_command, get_cli_command_status, get_binary_data
from .GENERATED.VERSION import _VERSION as script_version
from .GENERATED.HELP import _MD as help_md
from .GENERATED.CONFIG import GITIGNORE_PRESETS as gitignore_presets
from .helper_utilities import prettyprint_config, make_hash, is_in_pinliner

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
        '--work-tree-folder',
        type=str,
        required=True
    )
    parser.add_argument(
        #'-1',
        '--git-repo-folder',
        type=str,
        required=True
    )
    args = parser.parse_args(*argcs,**kwargs)

    config = {
        'time_start': time_start,
        'script_name': script_name,
        'script_version': script_version,
        'credentials:year': f'{datetime.now().year}',
        'credentials:name': credentials_str,
        'credentials:version': script_version,

        'help_pages': help_md,

        'dir_work_tree': None,
        'dir_git_repo': None,
        'git_paths_hash': None,

        'http_host': None,
        'http_port': None,
        'http_address': None,

        'gitignore_presets': gitignore_presets,

        'app_config': {
            'is_webserver_multithreaded': CONFIG_WEBSERVER_MULTITHREADED,
            'num_cli_command_exec_workers': CONFIG_CLI_COMMAND_EXEC_WORKERS,
        },

        'iface': {
            'cli_initiate_cli_command': initiate_cli_command,
            'cli_get_cli_command_status': get_cli_command_status,
            'cli_get_binary_data': get_binary_data,
            'WebResponse': WebResponse,
            'HTTP403': HTTP403,
            'HTTP404': HTTP404,
        },
    }

    if args.work_tree_folder:
        work_tree_folder = f'{args.work_tree_folder}' # make sure it's text
        work_tree_folder = Path(work_tree_folder).resolve()
        config['dir_work_tree'] = f'{work_tree_folder}'
    else:
        # print(f'{STDOUT_COLOR_RED}working-tree-folder not specified{STDOUT_COLOR_RESET}')
        raise Exception('working-tree-folder not specified')

    if args.git_repo_folder:
        git_repo_folder = f'{args.git_repo_folder}' # make sure it's text
        git_repo_folder = Path(git_repo_folder).resolve()
        config['dir_git_repo'] = f'{git_repo_folder}'
    else:
        # print(f'{STDOUT_COLOR_RED}git-repo-folder not specified{STDOUT_COLOR_RESET}')
        raise Exception('git-repo-folder not specified')

    config['git_paths_hash'] = make_hash(work_tree_folder,git_repo_folder)

    print('\npreparing git cli command loop...\n')
    for _ in range (0,CONFIG_CLI_COMMAND_EXEC_WORKERS):
        initiate_worker_loop(config)

    print('\npreparing webserver...\n')
    config['http_host'] = 'localhost'
    config['http_port'] = find_free_port(config['http_host'],start=5180)
    config['http_address'] = f'http://{config.get("http_host")}:{config.get("http_port")}'

    print(f'{STDOUT_COLOR_GREEN}starting {script_name} at {time_start}{STDOUT_COLOR_RESET}')
    cfg_to_print_verify = {
        "working-tree-folder":config.get("dir_work_tree"),
        "git-repo-folder":config.get("dir_git_repo"),
        "http address":config.get("http_address"),
    }
    print(f'CONFIG:\n{prettyprint_config(cfg_to_print_verify)}')
    print('\n')
    server = Webserver(config,is_threading=CONFIG_WEBSERVER_MULTITHREADED) # a wrapper around python http.server - no flask or django
    server.assign_handlers(endpoints)
    # print(f'{STDOUT_COLOR_GREEN}starting webserver at {config.get("http_address")}{STDOUT_COLOR_RESET}')

    launch_browser(f'{config.get("http_address")}/')
    server.run()
