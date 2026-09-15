

from urllib.parse import urlparse, parse_qs # to detect path within endpoints
from pathlib import Path
import json
import re


from .common_functions import JSONEncoder






def handle_request_files_endpoint(net_request_handler, config: dict,added_data=None):
    WebResponse = config.get('iface').get('WebResponse')
    path_with_query = net_request_handler.path
    path_parsed = f'{urlparse(path_with_query).path}'
    path = path_parsed.split('/')
    method = net_request_handler.command
    file_path = '/'.join(path[2:])
    work_tree_folder = config.get("dir_work_tree")
    file_path = re.sub(r'^@/','',file_path)
    file_path = re.sub(r'^@$','',file_path)
    file_path = Path(work_tree_folder) / file_path
    # file_path = file_path.relative_to(work_tree_folder)
    if method=='GET':
        if file_path.is_dir():
            files = [ f.relative_to(work_tree_folder) for f in file_path.iterdir() ]
            return WebResponse(
                status_code = 200,
                content_type = 'application/json',
                body = json.dumps(files, cls=JSONEncoder),
                headers = [],
                is_binary = False,
            )
        else:
            return WebResponse(
                status_code = 200,
                content_type = 'application/json',
                body = json.dumps(file_path.relative_to(work_tree_folder), cls=JSONEncoder),
                headers = [],
                is_binary = False,
            )
    else:
        return WebResponse(
            status_code = 405,
            content_type = 'application/json',
            body = json.dumps({'status':'error','error':f'http method not supported'}, cls=JSONEncoder),
            headers = [],
            is_binary = False,
        )
    
