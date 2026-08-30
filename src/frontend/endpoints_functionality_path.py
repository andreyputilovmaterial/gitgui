

from urllib.parse import urlparse #, parse_qs # to detect path within endpoints
import json # for responding, obviously
from pathlib import Path # for resolving paths to resources
import os # accessing physical files - gitignore, gitattributes, work-tree path, git repo path...
import subprocess # execute git rev-parse
from datetime import datetime # format dates in json responses
import re


from .common_functions import JSONEncoder, get_matching_endpoint











def not_found(server_instance,config:dict,added_data=None):
    WebResponse = config.get('iface').get('WebResponse')
    payload = {'status':'error','error':'not found'}
    return WebResponse(
        status_code = 404,
        content_type = 'application/json',
        body = json.dumps(payload, cls=JSONEncoder),
        headers = [],
    )



def handle_gitignore(server_instance, config: dict,added_data=None):
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
    WebResponse = config.get('iface').get('WebResponse')
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

def handle_gitattributes(server_instance, config: dict,added_data=None):
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
    WebResponse = config.get('iface').get('WebResponse')
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

def handle_config(server_instance, config: dict,added_data=None):
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
    WebResponse = config.get('iface').get('WebResponse')
    config_sanitized = json.loads(json.dumps(clean_config(config),cls=JSONEncoder))
    payload = config_sanitized
    return WebResponse(
        status_code = 200,
        content_type = 'application/json',
        body = json.dumps(payload, cls=JSONEncoder),
        headers = [],
    )

def handle_isup(server_instance, config: dict,added_data=None):
    WebResponse = config.get('iface').get('WebResponse')
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
            status_code = 405,
            content_type = 'application/json',
            body = json.dumps(payload, cls=JSONEncoder),
            headers = [],
        )

def handle_is_git_repo(server_instance, config: dict,added_data=None):
    WebResponse = config.get('iface').get('WebResponse')
    def pend_git_repo_status():
        def sanitize_command(command):
            args = [*command]
            assert args[0]=='git', f'Not a git command'
            git_dir = Path(config.get("dir_git_repo")).resolve() / '.git'
            work_tree = Path(config.get("dir_work_tree")).resolve()
            args = [args[0],'--git-dir',git_dir,'--work-tree',work_tree,'--no-pager',*args[1:]]
            return args
        # I am not making it async - should not take long to execute
        result = subprocess.run(
            sanitize_command(['git','rev-parse','--show-toplevel']),
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode==128:
            return False
        elif not not result.stderr and len(result.stderr.strip())>0:
            return False
        elif result.returncode==0 and not not result.stdout and len(result.stdout.strip())>0:
            return True
        else:
            return result.returncode==0
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

def handle_fspath(server_instance, config: dict,added_data=None):
    path_fs = Path(added_data).resolve()
    WebResponse = config.get('iface').get('WebResponse')
    method = server_instance.command
    if method=='HEAD':
        if not path_fs.exists():
            return WebResponse(
                status_code = 404,
                content_type = 'application/json', body = json.dumps('', cls=JSONEncoder), headers = [],
            )
        if not path_fs.is_dir():
            return WebResponse(
                status_code = 404,
                content_type = 'application/json', body = json.dumps('', cls=JSONEncoder), headers = [],
            )
        if not os.access(path_fs, os.R_OK):
            return WebResponse(
                status_code = 403,
                content_type = 'application/json', body = json.dumps('', cls=JSONEncoder), headers = [],
            )
        return WebResponse(
            status_code = 200,
                content_type = 'application/json', body = json.dumps('', cls=JSONEncoder), headers = [],
        )
    elif method=='GET':
        return WebResponse(
            status_code = 405,
                content_type = 'application/json', body = json.dumps('', cls=JSONEncoder), headers = [],
        )
    elif method=='POST':
        raise NotImplementedError('not implemented')
    elif method=='PUT':
        return WebResponse(
            status_code = 405,
                content_type = 'application/json', body = json.dumps('', cls=JSONEncoder), headers = [],
        )
    elif method=='DELETE':
        return WebResponse(
            status_code = 403,
                content_type = 'application/json', body = json.dumps('', cls=JSONEncoder), headers = [],
        )
    else:
        return WebResponse(
            status_code = 405,
                content_type = 'application/json', body = json.dumps('', cls=JSONEncoder), headers = [],
        )



def handle_fspath_worktree(server_instance, config: dict,added_data=None):
    path_fs = config.get("dir_work_tree")
    return handle_fspath(server_instance,config,added_data=path_fs)

def handle_fspath_gitrepodir(server_instance, config: dict,added_data=None):
    path_fs = config.get("dir_git_repo")
    return handle_fspath(server_instance,config,added_data=path_fs)

def handle_git_list_pack_files(server_instance, config: dict,added_data=None):
    WebResponse = config.get('iface').get('WebResponse')
    method = server_instance.command
    path_git_repo = Path(config.get("dir_git_repo")).resolve()
    path_fs = path_git_repo / '.git' / 'objects' / 'pack'
    if method=='GET':
        files = [ f'{f.relative_to(path_git_repo)}' for f in path_fs.rglob("*.idx") ]
        return WebResponse(
            status_code = 200,
                content_type = 'application/json', body = json.dumps(files, cls=JSONEncoder), headers = [],
        )
    else:
        return WebResponse(
            status_code = 405,
                content_type = 'application/json', body = json.dumps('', cls=JSONEncoder), headers = [],
        )

def handle_dir_sizeof_files(server_instance, config: dict,added_data=None):
    def parse_path(path_parts):
        return path_parts[3]
    WebResponse = config.get('iface').get('WebResponse')
    method = server_instance.command
    path_git_repo = Path(config.get("dir_git_repo")).resolve()
    path_worktree = Path(config.get("dir_work_tree")).resolve()
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    path_parts = path_parsed.split('/')
    resource_id = None
    path_fs = None
    try:
        resource_id = parse_path(path_parts)
    except:
        resource_id = None
    if not resource_id:
        return WebResponse(
            status_code = 404,
                content_type = 'application/json', body = json.dumps(None, cls=JSONEncoder), headers = [],
        )
    if resource_id=='git_repo':
        path_fs = path_git_repo
    elif resource_id=='worktree':
        path_fs = path_worktree
    elif resource_id=='git_pack_objects':
        path_fs = path_git_repo / '.git' / 'objects' / 'pack'
    if not path_fs:
        return WebResponse(
            status_code = 404,
                content_type = 'application/json', body = json.dumps(None, cls=JSONEncoder), headers = [],
        )
    if method=='GET':
        size = sum(file.stat().st_size for file in path_fs.rglob("*") if file.is_file())
        return WebResponse(
            status_code = 200,
                content_type = 'application/json', body = json.dumps(size, cls=JSONEncoder), headers = [],
        )
    else:
        return WebResponse(
            status_code = 405,
                content_type = 'application/json', body = json.dumps('', cls=JSONEncoder), headers = [],
        )


endpoints = {
    # for each path, we need to know: 1. which command to execute, 2. how to process results (note: command is platform-dependent)
    '/is-git-repo': handle_is_git_repo,
    '/gitignore': handle_gitignore, # .git/info/exclude
    '/gitattributes': handle_gitattributes, # .git/info/attributes
    '/dir-work-tree': handle_fspath_worktree,
    '/dir-git-repo-dir': handle_fspath_gitrepodir,
    '/git-ls-pack-files': handle_git_list_pack_files,
    re.compile(r'^/dir-sizeof\b.*'): handle_dir_sizeof_files,
    '/config': handle_config,
    '/isup.txt': handle_isup,
}

def handle_request_functionality_endpoint(server_instance, config: dict,added_data=None):
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
