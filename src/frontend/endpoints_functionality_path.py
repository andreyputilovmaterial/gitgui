

from urllib.parse import urlparse, parse_qs # to detect path within endpoints
import json # for responding, obviously
import sys # for printing error in cli commands
from pathlib import Path # for resolving paths to resources
import os # getsize for gitignore and gitattributes - open for debate
import subprocess # execute git rev-parse
from datetime import datetime # format dates in json responses



from .common_functions import JSONEncoder, get_matching_endpoint









def not_implemented(*args,**argv):
    raise NotImplementedError('not implemented')



def not_found(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    payload = {'status':'error','error':'not found'}
    return WebResponse(
        status_code = 404,
        content_type = 'application/json',
        body = json.dumps(payload, cls=JSONEncoder),
        headers = [],
    )



def handle_gitignore(server_instance,config={},added_data=None):
    def read(fname):
        if not Path(fname).is_file():
            raise FileNotFoundError(f'{fname}": file not found"')
        with open(fname,'r',encoding='utf-8') as f:
            txt = f.read()
            return txt
    def write(fname,txt):
        with open(fname,'w',encoding='utf-8') as f:
            txt = f.write(txt)
            return txt
    WebResponse = config.get("WebResponse")
    fname = Path(config.get("dir_git_repo")).resolve() / '.git' / 'info' / 'exclude'
    method = server_instance.command
    if method=='GET':
        payload = read(fname)
        return WebResponse(
            status_code = 200,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = [],
        )
    elif method=='PUT':
        # Read Content-Length header
        length = int(server_instance.headers["Content-Length"])
        # Read exactly that many bytes
        body = server_instance.rfile.read(length)
        # Convert bytes -> str -> Python object
        payload = json.loads(body)
        txt = payload
        txt = write(fname,txt), [], 200
        payload = '' # txt
        return WebResponse(
            status_code = 200,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = [],
        )
    elif method=='HEAD':
        if not Path(fname).is_file():
            raise FileNotFoundError(f'{fname}": file not found"')
        fsize = os.path.getsize(fname)
        paylaod = ''
        return WebResponse(
            status_code = 200,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = ('Content-Length',str(fsize),),
        )
    else:
        return WebResponse(
            status_code = 405,
            content_type = 'application/json',
            body = json.dumps('', cls=JSONEncoder),
            headers = [],
        )

def handle_gitattributes(server_instance,config={},added_data=None):
    def read(fname):
        if not Path(fname).is_file():
            raise FileNotFoundError(f'{fname}": file not found"')
        with open(fname,'r',encoding='utf-8') as f:
            txt = f.read()
            return txt
    def write(fname,txt):
        with open(fname,'w',encoding='utf-8') as f:
            txt = f.write(txt)
            return txt
    WebResponse = config.get("WebResponse")
    fname = Path(config.get("dir_git_repo")).resolve() / '.git' / 'info' / 'attributes'
    method = server_instance.command
    if method=='GET':
        payload = read(fname)
        return WebResponse(
            status_code = 200,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = [],
        )
    elif method=='PUT':
        # Read Content-Length header
        length = int(server_instance.headers["Content-Length"])
        # Read exactly that many bytes
        body = server_instance.rfile.read(length)
        # Convert bytes -> str -> Python object
        payload = json.loads(body)
        txt = payload
        write(fname,txt)
        payload = '' # txt
        return WebResponse(
            status_code = 200,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = [],
        )
    elif method=='HEAD':
        if not Path(fname).is_file():
            raise FileNotFoundError(f'{fname}": file not found"')
        fsize = os.path.getsize(fname)
        payload = ''
        return WebResponse(
            status_code = 200,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = ('Content-Length',str(fsize),),
        )
    else:
        return WebResponse(
            status_code = 405,
            content_type = 'application/json',
            body = json.dumps('', cls=JSONEncoder),
            headers = [],
        )

def handle_config(server_instance,config={},added_data=None):
    def clean_config(obj, path="root"):
        if isinstance(obj, Path):
            return str(obj)

        if isinstance(obj, datetime):
            return obj.isoformat()

        if isinstance(obj, dict):
            return {
                key: clean_config(value, f"{path}.{key}")
                for key, value in obj.items()
            }

        if isinstance(obj, (list, tuple)):
            return [
                clean_config(value, f"{path}[{index}]")
                for index, value in enumerate(obj)
            ]

        if (
            obj is None
            or isinstance(obj, (str, int, float, bool))
        ):
            return obj

        if callable(obj):
            return '[ callable ]';

        raise TypeError(
            f"Object of type {type(obj).__name__} "
            f"is not JSON serializable at {path}"
        )
    WebResponse = config.get("WebResponse")
    config_sanitized = json.loads(json.dumps(clean_config(config),cls=JSONEncoder))
    payload = config_sanitized
    return WebResponse(
        status_code = 200,
        content_type = 'application/json',
        body = json.dumps(payload, cls=JSONEncoder),
        headers = [],
    )

def handle_isup(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    method = server_instance.command
    payload = ''
    if method=='HEAD':
        return WebResponse(
            status_code = 200,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = [],
        )
    else:
        return WebResponse(
            status_code = 400,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = [],
        )

def handle_is_git_repo(server_instance,config={},added_data=None):
    def pend_git_repo_status():
        def sanitize_command(command):
            args = [*command]
            assert args[0]=='git', f'Not a git command'
            git_dir = Path(config.get("dir_git_repo")).resolve() / '.git'
            work_tree = Path(config.get("dir_working_tree")).resolve()
            args = [args[0],'--git-dir',git_dir,'--work-tree',work_tree,'--no-pager',*args[1:]]
            return args
        # I am not making it async - should not take long to execute
        result = subprocess.run(
            sanitize_command(['git','rev-parse','--show-toplevel']),
            capture_output=True,
            text=True,
            check=False,
        )
        # print(f'\n\ngit rev-parse result:\n\nreturncode:\n{result.returncode}\n\nstderr:\n{result.stderr}\n\nstdout:\n{result.stdout}\n\n')
        if result.returncode==128:
            return False
        elif not not result.stderr and len(result.stderr.strip())>0:
            return False
        elif result.returncode==0 and not not result.stdout and len(result.stdout.strip())>0:
            return True
        else:
            return (result.returncode==0)
    WebResponse = config.get("WebResponse")
    method = server_instance.command
    if method=='HEAD' or method=='GET':
        payload = ''
        if pend_git_repo_status():
            return WebResponse(
                status_code = 200,
                content_type = 'application/json',
                body = json.dumps(payload, cls=JSONEncoder),
                headers = [],
            )
        else:
            return WebResponse(
                status_code = 400,
                content_type = 'application/json',
                body = json.dumps(payload, cls=JSONEncoder),
                headers = [],
            )
    else:
        return WebResponse(
            status_code = 405,
            content_type = 'application/json',
            body = json.dumps('', cls=JSONEncoder),
            headers = [],
        )


endpoints = {
    # for each path, we need to know: 1. which command to execute, 2. how to process results (note: command is platform-dependent)
    '/is-git-repo': handle_is_git_repo,
    '/git-ls-tracked-files': not_implemented,
    '/gitignore': handle_gitignore, # .git/info/exclude
    '/gitattributes': handle_gitattributes, # .git/info/attributes
    '/config': handle_config,
    '/isup.txt': handle_isup,
}

def handle_request_functionality_endpoint(server_instance,config={},added_data=None):
    # HTTP404 = config.get("HTTP404")
    # def not_found(*args,**argv):
    #     raise HTTP404() # hmm, maybe simply returning statuscode 404 is simpler... but webserver engine handles this exact exception
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    path = path_parsed.split('/')
    if len(path)>=3 and path[0]=='':
        path = '/'.join([]+['']+path[2:])
        renderer = get_matching_endpoint(path,endpoints) or not_found
    else:
        renderer = not_found
    try:
        return renderer(server_instance,config,added_data)
    except FileNotFoundError:
        return not_found(server_instance,config,added_data)
    except Exception as e:
        raise e # for readability - to make it clear any exception normally passes up to webserver engine
