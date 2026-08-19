


from urllib.parse import urlparse, parse_qs # to detect path within endpoints
import json # for responding, obviously
import sys # for printing error in cli commands
from pathlib import Path # for resolving paths to resources
import re # to check url params agains "1", "yes", "affirmative", etc...



from .common_functions import JSONEncoder






def handle_git_command(server_instance,config={},added_data=None):
    def prep_paylaod(f):
        return f
    # def make_bytes_example(bytes):
    #     if bytes is None:
    #         return None
    #     return [ n for n in bytes[:65] ]
    def make_download_url(path_parts,job_id,binary_bucket_id,filename):
        return f'{path_parts[0]}/{path_parts[1]}/{job_id}/rawbytes/{binary_bucket_id}/{filename}'
    WebResponse = config.get('iface').get('WebResponse')
    call_initiate_cli_command = config.get('iface').get('cli_initiate_cli_command')
    call_get_cli_command_status = config.get('iface').get('cli_get_cli_command_status')
    call_get_binary_data = config.get('iface').get('cli_get_binary_data')
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
        headers = []
        if 'payload' in result:
            if result['payload']['is_binary'] and not not result['payload']['stdout']:
                filename = Path('%FILENAME%').name
                binary_bucket_id = result['payload']['stdout']
                url_get_rawbytes = make_download_url(path,job_id,binary_bucket_id,filename)# f'{path[0]}/{path[1]}/{job_id}/rawbytes/{filename}'
                result['payload']['stdout'] = url_get_rawbytes
                headers.append(('Location',f'{url_get_rawbytes}',))
                result['payload']['stdout_rawbytes'] = '<binary>' # make_bytes_example(result['payload']['stdout_rawbytes'])
        payload = {
            'ok': True,
            'status': 'called',
            'result': result,
        }
        return WebResponse(
            status_code = 202,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = headers,
        )
    def call_check_status(server_instance):
        def parse_path(path_parts):
            # path_parts[0] == ''
            # path_parts[1] == 'command'
            # path_parts[2] == job_id
            job_id = path_parts[2]
            return job_id
        path_with_query = server_instance.path
        path_parsed = f'{urlparse(path_with_query).path}'
        path_parts = path_parsed.split('/')
        job_id = None
        try:
            job_id = parse_path(path_parts)
        except:
            job_id = None
        if not job_id:
            return WebResponse(
                status_code = 404,
                content_type = 'application/json',
                body = json.dumps({'status':'error','error':f'call_check_status: job_id not found: "{job_id}'}, cls=JSONEncoder),
                headers = [],
            )
        result = call_get_cli_command_status(job_id,config)
        result = {
            'ok': True,
            'status': result.get("status"),
            'payload': result,
        }
        headers = []
        if result['payload']['is_binary'] and not not result['payload']['stdout']:
            filename = Path('%FILENAME%').name
            binary_bucket_id = result['payload']['stdout']
            url_get_rawbytes = make_download_url(path_parts,job_id,binary_bucket_id,filename)# f'{path_parts[0]}/{path_parts[1]}/{job_id}/rawbytes/{filename}'
            result['payload']['stdout'] = url_get_rawbytes
            headers.append(('Location',f'{url_get_rawbytes}',))
            result['payload']['stdout_rawbytes'] = '<binary>' # make_bytes_example(result['payload']['stdout_rawbytes'])
        payload = result
        return WebResponse(
            status_code = 200,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = headers,
        )
    def call_get_data(server_instance):
        def parse_path(path_parts):
            # path_parts[0] == ''
            # path_parts[1] == 'command'
            # path_parts[2] == job_id
            # path_parts[3] == 'rawbytes'
            # path_parts[4] == binary_bucket_id
            # path_parts[5] == filename # <- useless, only helps browser derive file name if this is saved directly
            job_id = path_parts[2]
            binary_bucket_id = path_parts[4]
            return job_id, binary_bucket_id
        path_with_query = server_instance.path
        path_parsed = f'{urlparse(path_with_query).path}'
        path_parts = path_parsed.split('/')
        job_id = None
        binary_bucket_id = None
        try:
            job_id, binary_bucket_id = parse_path(path_parts)
        except:
            job_id, binary_bucket_id = None, None
        if not job_id or not binary_bucket_id:
            return WebResponse(
                status_code = 404,
                content_type = 'application/json',
                body = json.dumps({'status':'error','error':f'call_get_data: not found'}, cls=JSONEncoder),
                headers = [],
            )
        result = call_get_binary_data(job_id,binary_bucket_id,config)
        payload = result
        return WebResponse(
            status_code = 200,
            content_type = 'application/octet-stream',
            body = payload,
            headers = [],
            is_binary = True,
        )
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    method = server_instance.command
    renderer = None
    payload = {}
    try:
        if method=='POST' and path_parsed=='/command':
            renderer = render_initiate_new_command
        elif method=='GET' and path_parsed.startswith('/command/'):
            if method=='GET' and re.match(r'^/command/[^/]*/rawbytes\b.*',path_parsed):
                renderer = call_get_data
            else:
                renderer = call_check_status
        if not renderer:
            raise Exception(f'request not recognized: {method} {path_with_query}')
        return renderer(server_instance)
    except Exception as e:
        # payload = {
        #     'ok': False,
        #     'status': 'error',
        #     'error': f'{e}',
        # }
        raise e
