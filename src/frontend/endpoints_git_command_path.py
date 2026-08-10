


from urllib.parse import urlparse, parse_qs # to detect path within endpoints
import json # for responding, obviously
import sys # for printing error in cli commands
from pathlib import Path # for resolving paths to resources



from .common_functions import JSONEncoder






def handle_git_command(server_instance,config={},added_data=None):
    def prep_paylaod(f):
        return f
    call_initiate_cli_command = config.get("initiate_cli_command")
    call_get_cli_command_status = config.get("get_cli_command_status")
    def sanitize_command(command):
        args = [*command]
        assert args[0]=='git', f'Not a git command'
        # if len(args)>=2 and args[0]=='git' and args[1]=='error':
        #     raise ValueError('an error for testing')
        git_dir = Path(config.get("dir_git_repo")).resolve() / '.git'
        work_tree = Path(config.get("dir_working_tree")).resolve()
        args = [
            args[0],
            '--git-dir'
            ,git_dir,
            '--work-tree',
            work_tree,
            '--no-pager',
            '-c',
            'i18n.logOutputEncoding=utf-8',
            *args[1:]
        ]
        return args
    def render_initiate_new_command(server_instance):
        # Read Content-Length header
        length = int(server_instance.headers["Content-Length"])
        # Read exactly that many bytes
        body = server_instance.rfile.read(length)
        # Convert bytes -> str -> Python object
        payload = json.loads(body)
        command = prep_paylaod(payload)
        command = sanitize_command(command)
        jobid = call_initiate_cli_command(command,config)
        return {
            'ok': True,
            'status': 'called',
            'jobId': jobid,
        }
    def call_check_status(server_instance):
        path_with_query = server_instance.path
        path_parsed = f'{urlparse(path_with_query).path}'
        path = path_parsed.split('/')
        jobid = None
        if len(path)==3 and path[0]=='' and path[1]=='command':
            jobid = path[2]
        else:
            raise config.HTTP404()
        result = call_get_cli_command_status(jobid,config)
        result = {
            'ok': True,
            'status': result.get("status"),
            'payload': result,
        }
        return result
    WebResponse = config.get("WebResponse")
    content_type = 'application/json'
    status_code = 200
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    method = server_instance.command
    renderer = None
    payload = {}
    try:
        if method=='POST' and path_parsed=='/command':
            renderer = render_initiate_new_command
            status_code = 202 # unnecessary beaitying
        elif method=='GET' and path_parsed.startswith('/command/'):
            renderer = call_check_status
        if not renderer:
            raise Exception(f'request not recognized: {method} {path_with_query}')
        payload = renderer(server_instance)
    except Exception as e:
        status_code = 400
        payload = {
            'ok': False,
            'status': 'error',
            'error': f'{e}',
        }
        print(e,file=sys.stderr)
    try:
        if payload.get("status")=='error':
            status_code = 400
    except:
        pass
    return WebResponse(
        status_code = status_code,
        content_type = content_type,
        body = json.dumps(payload, cls=JSONEncoder),
        headers = [],
    )
