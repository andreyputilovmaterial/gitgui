
import html
from urllib.parse import urlparse, parse_qs
import re
import json
import sys
from pathlib import Path
import os
import subprocess



from .common_functions import wrap_div
from .template.make_html import make_banner, make_meta, make_asset_jsembed, make_asset_cssembed, make_asset_jslink, make_asset_csslink, make_asset, make_section, make_html
from .template.GENERATED.TEMPLATE_COMPILED.ASSETS import common_css, common_js, normalize_css, app_js, vue_js






def renderer_home(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")

    title = f'git - {html.escape(config.get("dir_working_tree"))}'
    page_h1 = f'git - {html.escape(config.get("dir_working_tree"))}'

    page_body = make_html(
        title = title,
        page = 'home',
        h1 = page_h1,
        meta = {
            'git-gui:datetime-process-started': config.get("time_start"),
            'git-gui:script-name': config.get("script_name"),
            'git-gui:script-version': config.get("script_version"),
            'git-gui:git-work-tree-folder': config.get("dir_working_tree"),
            'git-gui:git-repo-folder': config.get("dir_git_repo"),
        },
        assets = [('js-link','/assets/vue.js',),('js-link-module','/assets/app.js',),],
        cssclasses = ['gitgui','gitgui-page-home',],
        banners = [
            f'<div class="banner-global-folder-props"><p class="mdmreport-prop-row">{html.escape("git-work-tree-folder: "+config.get("dir_working_tree"))}</p><p class="mdmreport-prop-row">{html.escape("git-repo-folder: "+config.get("dir_git_repo"))}</p></div>',
        ],
        sections = ['<div class="container"><div id="gitui_app"></div></div>'],
    )

    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = page_body,
        headers = [],
    )






def render_assets(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    content_type = 'text/plain'
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    if re.match(r'.*\.css\s*$',path_parsed,flags=re.I):
        content_type = 'text/css'
    elif re.match(r'.*\.m?js\s*$',path_parsed,flags=re.I):
        content_type = 'text/javascript'
    # method = server_instance.command
    payload = added_data
    return WebResponse(
        status_code = 200,
        content_type = content_type, #'text/css',
        body = payload,
        headers = [],
    )
def render_assets_common_css(server_instance,config={},added_data=None):
    payload = common_css
    return render_assets(server_instance,config,added_data=payload)

def render_assets_normalize_css(server_instance,config={},added_data=None):
    payload = normalize_css
    return render_assets(server_instance,config,added_data=payload)

def render_assets_common_js(server_instance,config={},added_data=None):
    payload = common_js
    return render_assets(server_instance,config,added_data=payload)

def render_assets_app_js(server_instance,config={},added_data=None):
    payload = app_js
    return render_assets(server_instance,config,added_data=payload)

def render_assets_vue_js(server_instance,config={},added_data=None):
    payload = vue_js
    return render_assets(server_instance,config,added_data=payload)







def renderer_version(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    version = config.get("script_version")
    version = f'{version}'.strip()

    title = f'git ui - version'
    page_h1 = f'git ui - version'

    page_body = make_html(
        title = title,
        page = 'Version page',
        h1 = page_h1,
        meta = {
            'git-gui:datetime-process-started': config.get("time_start"),
            'git-gui:script-name': config.get("script_name"),
            'git-gui:script-version': config.get("script_version"),
            'git-gui:git-work-tree-folder': config.get("dir_working_tree"),
            'git-gui:git-repo-folder': config.get("dir_git_repo"),
        },
        assets = [],
        cssclasses = ['gitgui','gitgui-page-version',],
        banners = [
            f'<div class="banner-global-folder-props"><p class="mdmreport-prop-row">{html.escape("git-work-tree-folder: "+config.get("dir_working_tree"))}</p><p class="mdmreport-prop-row">{html.escape("git-repo-folder: "+config.get("dir_git_repo"))}</p></div>',
        ],
        sections = [f'<div class="container"><span>Version: <span class="version-string">{version}</span></span></div>'],
    )

    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = page_body,
        headers = [],
    )





def handle_git_command(server_instance,config={},added_data=None):
    def prep_paylaod(f):
        return f
    call_initiate_cli_command = config.get("initiate_cli_command")
    call_get_cli_command_status = config.get("get_cli_command_status")
    def sanitize_command(command):
        args = [*command]
        assert args[0]=='git', f'Not a git command'
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
    return WebResponse(
        status_code = status_code,
        content_type = content_type,
        body = json.dumps(payload),
        headers = [],
    )







def not_implemented(*args,**argv):
    raise NotImplementedError('not implemented')

def functionality_path_gitignore(server_instance,config):
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
    fname = Path(config.get("dir_git_repo")).resolve() / '.git' / 'info' / 'exclude'
    method = server_instance.command
    if method=='GET':
        return read(fname), [], 200
    elif method=='PUT':
        # Read Content-Length header
        length = int(server_instance.headers["Content-Length"])
        # Read exactly that many bytes
        body = server_instance.rfile.read(length)
        # Convert bytes -> str -> Python object
        payload = json.loads(body)
        txt = payload
        return write(fname,txt), [], 200
    elif method=='HEAD':
        if not Path(fname).is_file():
            raise FileNotFoundError(f'{fname}": file not found"')
        fsize = os.path.getsize(fname)
        return '', ('Content-Length',str(fsize),), 200
    else:
        return not_implemented()

def functionality_path_gitattributes(server_instance,config):
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
    fname = Path(config.get("dir_git_repo")).resolve() / '.git' / 'info' / 'attributes'
    method = server_instance.command
    if method=='GET':
        return read(fname), [], 200
    elif method=='PUT':
        # Read Content-Length header
        length = int(server_instance.headers["Content-Length"])
        # Read exactly that many bytes
        body = server_instance.rfile.read(length)
        # Convert bytes -> str -> Python object
        payload = json.loads(body)
        txt = payload
        return write(fname,txt), [], 200
    elif method=='HEAD':
        if not Path(fname).is_file():
            raise FileNotFoundError(f'{fname}": file not found"')
        fsize = os.path.getsize(fname)
        return '', ('Content-Length',str(fsize),), 200
    else:
        return not_implemented()


def is_git_repo(server_instance,config):
    def pend_git_repo_status():
        def sanitize_command(command):
            args = [*command]
            assert args[0]=='git', f'Not a git command'
            git_dir = Path(config.get("dir_git_repo")).resolve() / '.git'
            work_tree = Path(config.get("dir_working_tree")).resolve()
            args = [args[0],'--git-dir',git_dir,'--work-tree',work_tree,'--no-pager',*args[1:]]
            return args
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
    method = server_instance.command
    if method=='HEAD' or method=='GET':
        if pend_git_repo_status():
            return '', [], 200
        else:
            return '', [], 400
    else:
        return not_implemented()


def handle_request_functionality_endpoint(server_instance,config={},added_data=None):
    HTTP404 = config.get("HTTP404")
    def not_found(*args,**argv):
        raise HTTP404()
    functionality_paths = {
        # for each functionality_path, we need to know: 1. which command to execute, 2. how to process results (note: command is platform-dependent)
        'worktree': not_implemented,
        'repodir': not_implemented,
        'is-git-repo': is_git_repo,
        'git-ls-tracked-files': not_implemented,
        'gitignore': functionality_path_gitignore, # .git/info/exclude
        'gitattributes': functionality_path_gitattributes, # .git/info/attributes
    }
    WebResponse = config.get("WebResponse")
    content_type = 'application/json'
    status_code = 200
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    path = path_parsed.split('/')
    jobid = None
    if len(path)>=3 and path[0]=='':
        functionality_path = path[2]
        renderer = functionality_paths.get(functionality_path,not_found)
    else:
        renderer = not_found
    payload, headers = None, []
    try:
        payload, headers, http_statuscode = renderer(server_instance,config)
        status_code = http_statuscode
    except FileNotFoundError:
        raise HTTP404()
    return WebResponse(
        status_code = status_code,
        content_type = content_type,
        body = json.dumps(payload),
        headers = headers,
    )
