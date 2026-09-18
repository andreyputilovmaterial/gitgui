

from urllib.parse import urlparse, parse_qs, unquote # to detect path within endpoints
from pathlib import Path
import json
import re
from dataclasses import dataclass, asdict
from datetime import datetime, timezone


from .common_functions import JSONEncoder



known_namespaces = {
    'worktree': lambda config: config.get("working_tree"),
}



def resolve_namespace(path,config):
    matches = re.match(r'^(\w+):(.*)$',path)
    if not matches:
        raise Exception(f'path must be formed as namespace:/path/within/namespace.ext definition: {path}')
    namespace, path_within = matches[1], matches[2]
    namespace_resolver = known_namespaces.get(namespace,None)
    if not namespace_resolver:
        raise Exception(f'namespace not supported: {namespace_resolver}')
    namespace_root_path = Path(namespace_resolver(config))
    return namespace_root_path, namespace_root_path / path_within




def handle_request_files_endpoint(net_request_handler, config: dict,added_data=None):
    WebResponse = config.get('iface').get('WebResponse')
    path_with_query = net_request_handler.path
    path_parsed = f'{urlparse(path_with_query).path}'
    path = [ unquote(p) for p in path_parsed.split('/') ]
    method = net_request_handler.command
    file_path = '/'.join(path[2:])
    namespace_root, file_path = resolve_namespace(file_path,config)

    @dataclass
    class FileInfo:
        name: object | None = None
        full_path: object | None = None
        type: str | None = None
        size: int | None = None
        modified_at: str | None = None
        metadata_changed_at: str | None = None
        created_at: str | None = None

        def __init__(self,path):
            def detect_type(path):
                if not path.exists():
                    return 'error'
                elif path.is_file():
                    return 'file'
                elif path.is_dir():
                    return 'directory'
                elif path.is_symlink():
                    return 'other'
                else:
                    return 'other'
            name = path.relative_to(namespace_root)
            self.name = name
            self.full_path = path
            self.type = detect_type(path)
            stat = path.stat()
            self.size = stat.st_size
            self.modified_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
            self.metadata_changed_at = datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc).isoformat()
            if hasattr(stat,'st_birthtime'):
                self.created_at = datetime.fromtimestamp(stat.st_birthtime, tz=timezone.utc).isoformat()
            

    if method=='GET':
        if file_path.is_dir():
            def sorter(file_info):
                dir_first_key = 0 if file_info.type=='directory' else 1 if file_info.type=='file' else 999
                str_path = str(file_info.name)
                return ( dir_first_key, str_path.lower(), str_path )
            files = sorted(
                [ FileInfo(f) for f in file_path.iterdir() ],
                key = sorter,
            )
            return WebResponse(
                status_code = 200,
                content_type = 'application/json',
                body = json.dumps([ asdict(f) for f in files ], cls=JSONEncoder),
                headers = [],
                is_binary = False,
            )
        else:
            return WebResponse(
                status_code = 200,
                content_type = 'application/json',
                body = json.dumps(asdict(FileInfo(file_path)), cls=JSONEncoder),
                headers = [],
                is_binary = False,
            )
    if method=='DOWNLOAD':
        params = parse_qs(urlparse(path_with_query).query)
        params_flattened = { key: values[-1] for key, values in params.items() }
        options = params_flattened
        headers = []
        headers.append(( 'Cache-control',       'no-cache',    ))
        headers.append(( 'Connection',          'keep-alive',  ))
        headers.append(( 'Transfer-Encoding',   'chunked',     ))
        is_binary = True
        return WebResponse(
            is_stream = True,
            status_code = 200,
            content_type = 'application/octet-stream' if is_binary else 'text/plain',
            body = Path(file_path).open("rb"),
            headers = headers,
            is_binary = is_binary,
            options = options,
        )
    else:
        return WebResponse(
            status_code = 405,
            content_type = 'application/json',
            body = json.dumps({'status':'error','error':f'http method not supported'}, cls=JSONEncoder),
            headers = [],
            is_binary = False,
        )
    
