

from datetime import datetime
import argparse
from pathlib import Path


from .webserver_engine.webserver import Webserver # a wrapper around python http.server - no flask or django
from .webserver_engine.webserver import HTTP403, HTTP404, WebResponse
from .webserver_engine.find_free_port import find_free_port
from .webserver_engine.launch_browser import launch_browser
from .git_proxy_caller import initiate_worker_loop, initiate_git_command, get_git_command_status
from .frontend import renderer_home, renderer_version, handle_command, wrap_div, render_assets_common_css, render_assets_normalize_css, render_assets_common_js
from .GENERATED._VERSION import _VERSION as script_version
from .helper_utilities import print_config


# STDOUT_COLOR_RED = "\033[91m"
STDOUT_COLOR_RED = "\033[31m"
STDOUT_COLOR_RESET = "\033[0m"
STDOUT_COLOR_GREEN = "\033[32m"


def main(*argcs,**kwargs):
    time_start = datetime.now()
    script_name = 'gitgui script'

    parser = argparse.ArgumentParser(
        description="gitgui"
    )
    parser.add_argument(
        #'-1',
        '--working-tree-folder',
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

        'dir_working_tree': None,
        'dir_git_repo': None,

        'http_host': None,
        'http_port': None,
        'http_address': None,

        'initiate_git_command': initiate_git_command,
        'get_git_command_status': get_git_command_status,
        'WebResponse': WebResponse,
        'HTTP403': HTTP403,
        'HTTP404': HTTP404,
        'renderer_functions': {
            'wrap_div': wrap_div,
        },

    }

    if args.working_tree_folder:
        working_tree_folder = f'{args.working_tree_folder}' # make sure it's text
        working_tree_folder = Path(working_tree_folder).resolve()
        config['dir_working_tree'] = f'{working_tree_folder}'
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

    print('\npreparing git cli command loop...\n')
    initiate_worker_loop(config)

    print('\npreparing webserver...\n')
    config['http_host'] = 'localhost'
    config['http_port'] = find_free_port(start=5180)
    config['http_address'] = f'http://{config.get("http_host")}:{config.get("http_port")}'

    print(f'{STDOUT_COLOR_GREEN}starting {script_name} at {time_start}{STDOUT_COLOR_RESET}')
    print(f'CONFIG:\n{print_config({
        "working-tree-folder":config.get("dir_working_tree"),
        "git-repo-folder":config.get("dir_git_repo"),
        "http address":config.get("http_address"),
    })}')
    print('\n')
    endpoints = {
        '/': renderer_home,
        '/common.css': render_assets_common_css,
        '/normalize.css': render_assets_normalize_css,
        '/common.js': render_assets_common_js,
        '/command': handle_command,
        '/version': renderer_version,
    }
    server = Webserver(config) # a wrapper around python http.server - no flask or django
    server.assign_handlers(endpoints)
    # print(f'{STDOUT_COLOR_GREEN}starting webserver at {config.get("http_address")}{STDOUT_COLOR_RESET}')

    launch_browser(f'{config.get("http_address")}/')
    server.run()
