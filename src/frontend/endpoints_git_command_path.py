


from urllib.parse import urlparse, parse_qs # to detect path within endpoints
import json # for responding, obviously
from pathlib import Path # for resolving paths to resources
import re # to check url params against "1", "yes", "affirmative", etc...



from .common_functions import JSONEncoder






def handle_git_command(net_request_handler, config: dict, added_data=None):

    def prep_payload(f):
        return f

    # def make_bytes_example(bytes):
    #     if bytes is None:
    #         return None
    #     return [ n for n in bytes[:65] ]

    def make_download_url(path_parts,job_id,filename):
        return f'{path_parts[0]}/{path_parts[1]}/{job_id}/stdout/{filename}'

    WebResponse = config.get('iface').get('WebResponse')
    call_cli_command_initiate = config.get('iface').get('cli_command_initiate')
    call_cli_command_get_job = config.get('iface').get('cli_command_get_job')
    call_cli_command_terminate_job = config.get('iface').get('cli_command_terminate_job')
    call_cli_command_get_job_stdout_reader = config.get('iface').get('cli_command_get_job_stdout_reader')

    def sanitize_command(command,is_binary=False):
        def startswith(seq, prefix):
            return seq[:len(prefix)] == prefix
        command = [*command]
        is_allowed = startswith(command,['git']) or startswith(command,['python','~/test.py'])
        if not is_allowed:
            raise Exception(f'Not a git command')
        if startswith(command,['python','~/test.py']):
            return ['python',Path.home() / 'test.py'] + command[2:]
        config_git_dir: str | Path | None = config.get("dir_git_repo")
        config_work_tree: str | Path | None = config.get("dir_work_tree")
        if config_git_dir is None: # to make linter happy
            raise ValueError(f'execute git command: config.dir_git_repo is required')
        if config_work_tree is None: # to make linter happy
            raise ValueError(f'execute git command: config.dir_work_tree is required')
        git_dir = Path(config_git_dir).resolve() / '.git'
        work_tree = Path(config_work_tree).resolve()
        command = [] \
            + [ command[0] ] \
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
            [ *command[1:] ]
        return command

    def handle_initiate_new_command(net_request_handler):

        def detect_binary_str_value(flag):
            if re.match(r'^\s*\d+\s*$',flag):
                return not not int(flag)
            elif re.match(r'^\s*(?:yes|true)\s*$',flag,flags=re.I):
                return True
            elif re.match(r'^\s*(?:no|false)\s*$',flag,flags=re.I):
                return False
            else:
                return not not flag

        method = net_request_handler.command
        path_with_query = net_request_handler.path
        path_parsed = f'{urlparse(path_with_query).path}'
        path_parts = path_parsed.split('/')
        params = parse_qs(urlparse(path_with_query).query)
        params_flattened = { key: values[-1] for key, values in params.items() }
        flag_is_binary = params_flattened.get('is_binary', "0")
        flag_is_binary = flag_is_binary.strip()
        flag_is_binary = detect_binary_str_value(flag_is_binary)
        flag_is_interactive = params_flattened.get('is_interactive', "0")
        flag_is_interactive = flag_is_interactive.strip()
        flag_is_interactive = detect_binary_str_value(flag_is_interactive)
        # params_flattened: example: { stdout_chunk_size: 8, stderr_chunk_size: 4, }
        # Read Content-Length header
        length = int(net_request_handler.headers["Content-Length"])
        # Read exactly that many bytes
        body = net_request_handler.rfile.read(length)
        # Convert bytes -> str -> Python object
        payload = json.loads(body)
        command = prep_payload(payload)
        try:
            command = sanitize_command(command, is_binary = flag_is_binary)
        except Exception as e:
            return WebResponse(
                status_code=403,
                content_type='application/json',
                body=json.dumps({'error':f'{e}'}, cls=JSONEncoder),
                headers=[],
            )

        job_dict = call_cli_command_initiate(command,config,is_binary=flag_is_binary,is_interactive=flag_is_interactive,options=params_flattened)
        job_id = job_dict.get('job_id')

        headers = []
        need_add_downloadurl = True
        if need_add_downloadurl:
            filename = Path('%FILENAME%').name
            url_get_rawbytes = make_download_url(path_parts, job_id,
                                                 filename)  # f'{path_parts[0]}/{path_parts[1]}/{job_id}/rawbytes/{filename}'
            job_dict['download_url'] = url_get_rawbytes
            headers.append(('Location', f'{url_get_rawbytes}',))
        return WebResponse(
            status_code = 202,
            content_type = 'application/json',
            body = json.dumps(job_dict, cls=JSONEncoder),
            headers = headers,
        )

    def handle_job_status(net_request_handler):

        def parse_path(path_parts):
            # path_parts[0] == ''
            # path_parts[1] == 'command'
            # path_parts[2] == job_id
            job_id = path_parts[2]
            return job_id

        method = net_request_handler.command
        path_with_query = net_request_handler.path
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
                body = json.dumps({'status':'error','error':f'handle_job_status: job_id not found: "{job_id}'}, cls=JSONEncoder),
                headers = [],
            )
        if method=='GET':
            job_dict = call_cli_command_get_job(job_id,config)
            headers = []
            need_add_downloadurl = True
            if need_add_downloadurl:
                filename = Path('%FILENAME%').name
                url_get_rawbytes = make_download_url(path_parts,job_id,filename) # f'{path_parts[0]}/{path_parts[1]}/{job_id}/rawbytes/{filename}'
                job_dict['download_url'] = url_get_rawbytes
                headers.append(('Location',f'{url_get_rawbytes}',))
            return WebResponse(
                status_code = 200,
                content_type = 'application/json',
                body = json.dumps(job_dict, cls=JSONEncoder),
                headers = headers,
            )
        elif method=='DELETE':
            call_cli_command_terminate_job(job_id,config)
            return WebResponse(
                status_code = 204,
                content_type = 'application/json',
                body = json.dumps(None, cls=JSONEncoder),
                headers = [],
            )
        else:
            return WebResponse(
                status_code = 405,
                content_type = 'application/json',
                body = json.dumps({'status':'error','error':f'renderer for {method} {path_parsed} is not recognized'}, cls=JSONEncoder),
                headers = [],
            )

    def handle_send_binary_data(net_request_handler):

        def parse_path(path_parts):
            # path_parts[0] == ''
            # path_parts[1] == 'command'
            # path_parts[2] == job_id
            # path_parts[3] == 'rawbytes'
            # path_parts[4] == filename # <- useless, only helps browser derive file name if this is saved directly
            job_id = path_parts[2]
            return job_id

        path_with_query = net_request_handler.path
        path_parsed = f'{urlparse(path_with_query).path}'
        path_parts = path_parsed.split('/')
        job_id = None
        try:
            job_id = parse_path(path_parts)
        except:
            job_id = None, None
        if not job_id:
            return WebResponse(
                status_code = 404,
                content_type = 'application/json',
                body = json.dumps({'status':'error','error':f'handle_send_binary_data: job not found: {job_id}'}, cls=JSONEncoder),
                headers = [],
            )
        binary_data_reader = call_cli_command_get_job_stdout_reader(job_id,config)
        if not binary_data_reader:
            return WebResponse(
                status_code = 415,
                content_type = 'application/json',
                body = json.dumps({'status':'error','error':f'job does not provide reader, maybe it was launched in non-binary (text) mode? {job_id}'}, cls=JSONEncoder),
                headers = [],
            )
        job_dict = call_cli_command_get_job(job_id, config)
        is_binary = job_dict.get('is_binary',None)
        headers = []
        headers.append(( 'Cache-control',       'no-cache',    ))
        headers.append(( 'Connection',          'keep-alive',  ))
        headers.append(( 'Transfer-Encoding',   'chunked',     ))
        # data = binary_data_reader()
        response = WebResponse(
            is_stream = True,
            status_code = 200,
            content_type = 'application/octet-stream' if is_binary else 'text/plain',
            body = binary_data_reader(),
            headers = headers,
            is_binary = is_binary,
        )
        return response

    path_with_query = net_request_handler.path
    path_parsed = f'{urlparse(path_with_query).path}'
    method = net_request_handler.command
    renderer = None
    try:
        if method=='POST' and path_parsed=='/command':
            renderer = handle_initiate_new_command
        elif method=='GET' and path_parsed.startswith('/command/'):
            if method=='GET' and re.match(r'^/command/[^/]*/stdout\b.*',path_parsed):
                renderer = handle_send_binary_data
            else:
                renderer = handle_job_status
        if not renderer:
            return WebResponse(
                status_code = 405,
                content_type = 'application/json',
                body = json.dumps({'status':'error','error':f'renderer for {method} {path_parsed} is not recognized'}, cls=JSONEncoder),
                headers = [],
            )
        return renderer(net_request_handler)

    except Exception as e:
        raise e
