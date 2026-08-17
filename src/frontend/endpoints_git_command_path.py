


from urllib.parse import urlparse, parse_qs # to detect path within endpoints
import json # for responding, obviously
import sys # for printing error in cli commands
from pathlib import Path # for resolving paths to resources
import re # to check url params agains "1", "yes", "affirmative", etc...



from .common_functions import JSONEncoder






def handle_git_command(server_instance,config={},added_data=None):
    def prep_paylaod(f):
        return f
    def make_bytes_example(bytes):
        return [ n for n in bytes[:65] ]
    call_initiate_cli_command = config.get("initiate_cli_command")
    call_get_cli_command_status = config.get("get_cli_command_status")
    def sanitize_command(command,is_binary=False):
        args = [*command]
        assert args[0]=='git', f'Not a git command'
        # if len(args)>=2 and args[0]=='git' and args[1]=='error':
        #     raise ValueError('an error for testing')
        git_dir = Path(config.get("dir_git_repo")).resolve() / '.git'
        work_tree = Path(config.get("dir_work_tree")).resolve()
        args = [] \
            + [ args[0] ] \
            + [
                '--git-dir'
                ,git_dir,
                '--work-tree',
                work_tree,
            ] \
            + [
                '--no-pager',
            ] \
            + ( [
                '-c',
                'i18n.logOutputEncoding=utf-8',
            ] if not is_binary else [] ) \
            + \
            [ *args[1:] ]
        return args
    def render_initiate_new_command(server_instance):
        def detect_binary_str_value(flag):
            if re.match(r'^\s*\d+\s*$',flag):
                return not not int(flag)
            elif re.match(r'^\s*(?:yes|true)\s*$',flag,flags=re.I):
                return True
            elif re.match(r'^\s*(?:no|false)\s*$',flag,flags=re.I):
                return False
            else:
                return not not flag
        parsed = urlparse(server_instance.path)
        params = parse_qs(parsed.query)
        flag_is_binary = params.get('is_binary', ["0"])[0]
        flag_is_binary = flag_is_binary.strip()
        flag_is_binary = detect_binary_str_value(flag_is_binary)
        # Read Content-Length header
        length = int(server_instance.headers["Content-Length"])
        # Read exactly that many bytes
        body = server_instance.rfile.read(length)
        # Convert bytes -> str -> Python object
        payload = json.loads(body)
        command = prep_paylaod(payload)
        command = sanitize_command(command, is_binary = not not flag_is_binary)
        result = call_initiate_cli_command(command,config,is_binary=flag_is_binary)
        if 'payload' in result:
            if 'stdout_rawbytes' in result['payload']:
                url_get_rawbytes = f'{path[0]}/{path[1]}/{jobid}/rawbytes'
                result['payload']['stdout'] = url_get_rawbytes
                result['payload']['stdout_rawbytes'] = make_bytes_example(result['payload']['stdout_rawbytes'])
        payload = {
            'ok': True,
            'status': 'called',
            'result': result,
        }
        return WebResponse(
            status_code = 202,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = [],
        )
    def call_check_status(server_instance):
        path_with_query = server_instance.path
        path_parsed = f'{urlparse(path_with_query).path}'
        path = path_parsed.split('/')
        jobid = None
        if len(path)==3 and path[0]=='':
            jobid = path[2]
        elif len(path)>=4 and path[0]=='' and path[3]=='rawbytes':
            return call_get_data(server_instance)
        else:
            return WebResponse(
                status_code = 404,
                content_type = 'application/json',
                body = json.dumps({'status':'error','error':f'call_check_status: path not recognized'}, cls=JSONEncoder),
                headers = [],
            )
        if not jobid:
            return WebResponse(
                status_code = 404,
                content_type = 'application/json',
                body = json.dumps({'status':'error','error':f'call_check_status: jobid is missing'}, cls=JSONEncoder),
                headers = [],
            )
        result = call_get_cli_command_status(jobid,config)
        result = {
            'ok': True,
            'status': result.get("status"),
            'payload': result,
        }
        if 'stdout_rawbytes' in result['payload']:
            filename = Path('%FILENAME%').name
            url_get_rawbytes = f'{path[0]}/{path[1]}/{jobid}/rawbytes/{filename}'
            result['payload']['stdout'] = url_get_rawbytes
            result['payload']['stdout_rawbytes'] = make_bytes_example(result['payload']['stdout_rawbytes'])
        payload = result
        return WebResponse(
            status_code = 200,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = [],
        )
    def call_get_data(server_instance):
        path_with_query = server_instance.path
        path_parsed = f'{urlparse(path_with_query).path}'
        path = path_parsed.split('/')
        jobid = None
        if len(path)>=4 and path[0]=='' and path[3]=='rawbytes':
            jobid = path[2]
        else:
            return WebResponse(
                status_code = 404,
                content_type = 'application/json',
                body = json.dumps({'status':'error','error':f'call_get_data: path not recognized'}, cls=JSONEncoder),
                headers = [],
            )
        if not jobid:
            return WebResponse(
                status_code = 404,
                content_type = 'application/json',
                body = json.dumps({'status':'error','error':f'call_get_data: jobid is missing'}, cls=JSONEncoder),
                headers = [],
            )
        result = call_get_cli_command_status(jobid,config)
        payload = result.get("stdout_rawbytes") if "stdout_rawbytes" in result else result.get("stdout").encode(encoding='utf-8')
        return WebResponse(
            status_code = 200,
            content_type = 'application/octet-stream',
            body = payload,
            headers = [],
            is_binary = True,
        )
    WebResponse = config.get("WebResponse")
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    method = server_instance.command
    renderer = None
    payload = {}
    try:
        if method=='POST' and path_parsed=='/command':
            renderer = render_initiate_new_command
        elif method=='GET' and path_parsed.startswith('/command/'):
            renderer = call_check_status
        if not renderer:
            raise Exception(f'request not recognized: {method} {path_with_query}')
        return renderer(server_instance)
    except Exception as e:
        payload = {
            'ok': False,
            'status': 'error',
            'error': f'{e}',
        }
        print(e,file=sys.stderr)
        return WebResponse(
            status_code = 400,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = [],
        )
