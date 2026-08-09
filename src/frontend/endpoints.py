
import html
from urllib.parse import urlparse, parse_qs
import re
import json
import sys
from pathlib import Path
import os
import subprocess
import random

from datetime import datetime



from .common_functions import JSONEncoder
from .template.make_html import make_html
from .template.GENERATED.TEMPLATE_COMPILED.ASSETS import \
    common_css, \
    common_js, \
    normalize_css
from .GENERATED.ASSETS import \
    app_js, \
    app_css, \
    project_specific_styles_css, \
    vendorlibs_vue_js, \
    vendorlibs_marked_js, \
    vendorlibs_dompurify_js, \
    _ASSETS_VENDORLIBS_FONTS_IBMPLEXSANS, \
    _ASSETS_VENDORLIBS_FONTS_IBMPLEXMONO
from .icon import make_icon



def render_block_banner_config_git_folders(config):
    return f'''
<div class="banner-global-folder-props">
    <p class="mdmreport-prop-row">Git work tree folder: <code>{html.escape(""+config.get("dir_working_tree"))}</code></p>
    <p class="mdmreport-prop-row">Git repo folder: <code>{html.escape(""+config.get("dir_git_repo"))}</code></p>
</div>
'''


def render_block_header_nav():
    return '''
<div class="gitgui-html-page-navigation">
    <ul>
        <li navigation-role="home"><a href="/" target="_blank">Home</a></li>
        <li navigation-role="about"><a href="/about" target="_blank">About</a></li>
        <li navigation-role="version"><a href="/version" target="_blank">Version</a></li>
        <li navigation-role="help"><a href="/help" target="_blank">Help</a></li>
    </ul>
</div>
'''


def render_block_html_page_navigatation_block(pagename,config):
    banner_gitguiapp_folders_config = render_block_banner_config_git_folders(config)
    nav = render_block_header_nav()
    return f'''
<div class="gitgui-html-page-header-outer">
    <div class="gitgui-html-page-header">
        <div class="gitgui-html-pagename">{pagename}</div>
        {nav}
    </div>
    {banner_gitguiapp_folders_config}
</div>
'''


def check_query_string_flag(server_instance,param_name):
    parsed = urlparse(server_instance.path)
    params = parse_qs(parsed.query)
    flag = params.get(param_name, ["0"])[0]
    flag = flag.strip()
    if re.match(r'^\s*\d+\s*$',flag):
        return not not int(flag)
    elif re.match(r'^\s*(?:yes|true)\s*$',flag,flags=re.I):
        return True
    elif re.match(r'^\s*(?:no|false)\s*$',flag,flags=re.I):
        return False
    else:
        return not not flag


def renderer_page_home(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    year = f'{datetime.now().year}'

    title = f'git - {html.escape(config.get("dir_working_tree"))}'
    page_h1 = f'git - {html.escape(config.get("dir_working_tree"))}'

    page_body = make_html(
        title = title,
        header_block = render_block_html_page_navigatation_block(pagename='git-gui app', config=config),
        footer_block = f'@AP 2026-{html.escape(year)}',
        h1 = page_h1,
        assets = [
            ('icon',(make_icon(),),),
            ('meta',('git-gui:datetime-process-started',config.get("time_start"),)),
            ('meta',('git-gui:script-name',config.get("script_name"),)),
            ('meta',('git-gui:script-version',config.get("script_version"),)),
            ('meta',('git-gui:git-work-tree-folder',config.get("dir_working_tree"),)),
            ('meta',('git-gui:git-repo-folder',config.get("dir_git_repo"),)),
            ('js-link',('/assets/vendorlibs/vue.js',),),
            ('css-link',('/assets/vendorlibs/fonts/ibm-plex-sans/css/ibm-plex-sans-all.css',),),
            ('css-link',('/assets/vendorlibs/fonts/ibm-plex-mono/css/ibm-plex-mono-all.css',),),
            ('css-link',('/assets/project-specific.css',),),
            ('js-link-module',('/assets/app.js',),),
            ('css-link',('/assets/app.css',),),
        ],
        cssclasses = ['gitgui','gitgui-page-home','gitui-embed' if check_query_string_flag(server_instance,'embed') else '',],
        banners = [
            # render_block_banner_config_git_folders(config),
        ],
        sections = ['<div class="container"><div id="gitui_app"></div></div>'],
    )

    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = page_body,
        headers = [],
    )



def renderer_page_version(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    version = config.get("script_version")
    version = f'{version}'.strip()
    year = f'{datetime.now().year}'

    title = f'git ui - version'
    page_h1 = f'Version'

    page_body = make_html(
        title = title,
        header_block = render_block_html_page_navigatation_block(pagename='Version', config=config),
        footer_block = f'@AP 2026-{html.escape(year)}',
        h1 = page_h1,
        assets = [
            ('icon',(make_icon(),),),
            ('meta',('git-gui:datetime-process-started',config.get("time_start"),)),
            ('meta',('git-gui:script-name',config.get("script_name"),)),
            ('meta',('git-gui:script-version',config.get("script_version"),)),
            ('meta',('git-gui:git-work-tree-folder',config.get("dir_working_tree"),)),
            ('meta',('git-gui:git-repo-folder',config.get("dir_git_repo"),)),
            ('css-link',('/assets/vendorlibs/fonts/ibm-plex-sans/css/ibm-plex-sans-all.css',),),
            ('css-link',('/assets/vendorlibs/fonts/ibm-plex-mono/css/ibm-plex-mono-all.css',),),
            ('css-link',('/assets/project-specific.css',),),
        ],
        cssclasses = ['gitgui','gitgui-page-version','gitui-embed' if check_query_string_flag(server_instance,'embed') else '',],
        banners = [
            # render_block_banner_config_git_folders(config),
        ],
        sections = [f'<div class="container"><span>Version: <span class="version-string">{version}</span></span></div>'],
    )

    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = page_body,
        headers = [],
    )



def renderer_page_about(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    version = config.get("script_version")
    version = f'{version}'.strip()
    year = f'{datetime.now().year}'
    myname = 'Andrey.Putilov@materialplus.io'

    title = f'git ui - about'
    page_h1 = f'About'

    page_body = make_html(
        title = title,
        header_block = render_block_html_page_navigatation_block(pagename='About', config=config),
        footer_block = f'@AP 2026-{html.escape(year)}',
        h1 = page_h1,
        assets = [
            ('icon',(make_icon(),),),
            ('meta',('git-gui:datetime-process-started',config.get("time_start"),)),
            ('meta',('git-gui:script-name',config.get("script_name"),)),
            ('meta',('git-gui:script-version',config.get("script_version"),)),
            ('meta',('git-gui:git-work-tree-folder',config.get("dir_working_tree"),)),
            ('meta',('git-gui:git-repo-folder',config.get("dir_git_repo"),)),
            ('css-link',('/assets/vendorlibs/fonts/ibm-plex-sans/css/ibm-plex-sans-all.css',),),
            ('css-link',('/assets/vendorlibs/fonts/ibm-plex-mono/css/ibm-plex-mono-all.css',),),
            ('css-link',('/assets/project-specific.css',),),
        ],
        cssclasses = ['gitgui','gitgui-page-about','gitui-embed' if check_query_string_flag(server_instance,'embed') else '',],
        banners = [
            # render_block_banner_config_git_folders(config),
        ],
        sections = [
            f'''
<div class="container">
    <div>
        <p>{html.escape(myname)}</p>
    </div>
    <div>
        <p>Version: <span class="version-string">{html.escape(version)}</span></p>
    </div>
    <div>
        <p>@ 2026-{html.escape(year)}</p>
    </div>
</div>
'''
        ],
    )

    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = page_body,
        headers = [],
    )



def renderer_page_help(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    version = config.get("script_version")
    version = f'{version}'.strip()
    year = f'{datetime.now().year}'
    myname = 'Andrey.Putilov@materialplus.io'

    title = f'git ui - help'
    page_h1 = f'Help'

    block_main_section = f'''
<div class="container">
<div>
<div id="id_help_placeholder_7256347265" class="helppage-fetch-content gitgui-fetched-content">Loading, please wait...</div>
''' + '''
<style>.helppage-fetch-content { /* margin: 56px 0 56px; */ }</style>
<script>
(async function() {
try {
async function fetchHelpPage() {
    const response = await fetch('/functionality/config');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const config = await response.json();
    return config.help_pages;
};
const targetEl = document.querySelector('#id_help_placeholder_7256347265');
const help_text_md = await fetchHelpPage();
const helpFormatted = DOMPurify.sanitize(marked.parse(help_text_md));
targetEl.innerHTML = helpFormatted;
} catch(e) {
const targetEl = document.querySelector('#id_help_placeholder_7256347265');
targetEl.innerHTML = '<div class="error"></div>';
targetEl.querySelector('.error').textContent = `${e}`;
}
})();
</script>
''' + f'''
</div>
</div>
'''
    def id_char():
        chardict = 'abcdefghigklmnopqrstuvwxwz_0123456789'
        return random.choice(chardict)
    id = 'id_help_placeholder_ran_'+''.join([id_char() for _ in range(0,10)])
    block_main_section = block_main_section.replace('id_help_placeholder_7256347265',id)

    page_body = make_html(
        title = title,
        header_block = render_block_html_page_navigatation_block(pagename='Help', config=config),
        footer_block = f'@AP 2026-{html.escape(year)}',
        h1 = page_h1,
        assets = [
            ('icon',(make_icon(),),),
            ('meta',('git-gui:datetime-process-started',config.get("time_start"),)),
            ('meta',('git-gui:script-name',config.get("script_name"),)),
            ('meta',('git-gui:script-version',config.get("script_version"),)),
            ('meta',('git-gui:git-work-tree-folder',config.get("dir_working_tree"),)),
            ('meta',('git-gui:git-repo-folder',config.get("dir_git_repo"),)),
            ('js-link',('/assets/vendorlibs/marked.js',),),
            ('js-link',('/assets/vendorlibs/dompurify.js',),),
            ('css-link',('/assets/vendorlibs/fonts/ibm-plex-sans/css/ibm-plex-sans-all.css',),),
            ('css-link',('/assets/vendorlibs/fonts/ibm-plex-mono/css/ibm-plex-mono-all.css',),),
            ('css-link',('/assets/project-specific.css',),),
        ],
        cssclasses = ['gitgui','gitgui-page-help','gitui-embed' if check_query_string_flag(server_instance,'embed') else '',],
        banners = [
            # render_block_banner_config_git_folders(config),
        ],
        sections = [
            block_main_section,
        ],
    )

    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = page_body,
        headers = [],
    )






def render_assets(server_instance,config={},added_data=None,is_binary=False):
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
        is_binary=is_binary,
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

def render_assets_app_css(server_instance,config={},added_data=None):
    payload = app_css
    return render_assets(server_instance,config,added_data=payload)

def render_assets_project_specific_styles_css(server_instance,config={},added_data=None):
    payload = project_specific_styles_css
    return render_assets(server_instance,config,added_data=payload)

def render_assets_vendorlibs_vue_js(server_instance,config={},added_data=None):
    payload = vendorlibs_vue_js
    return render_assets(server_instance,config,added_data=payload)
def render_assets_vendorlibs_marked_js(server_instance,config={},added_data=None):
    payload = vendorlibs_marked_js
    return render_assets(server_instance,config,added_data=payload)
def render_assets_vendorlibs_dompurify_js(server_instance,config={},added_data=None):
    payload = vendorlibs_dompurify_js
    return render_assets(server_instance,config,added_data=payload)
def render_assets_vendorlibs_font_ibmplexsans(server_instance,config={},added_data=None):
    payload_dict = _ASSETS_VENDORLIBS_FONTS_IBMPLEXSANS
    def err():
        HTTP404 = config.get("HTTP404")
        raise HTTP404()
    payload_dict = { propname: propvalue for propname,propvalue in payload_dict }
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    path = '/'.join((path_parsed.split('/'))[5:])
    payload = payload_dict.get(path) if path in payload_dict else err(path)
    return render_assets(
        server_instance,
        config,
        added_data = payload,
        is_binary = True,
    )
def render_assets_vendorlibs_font_ibmplexmono(server_instance,config={},added_data=None):
    payload_dict = _ASSETS_VENDORLIBS_FONTS_IBMPLEXMONO
    def err():
        HTTP404 = config.get("HTTP404")
        raise HTTP404()
    payload_dict = { propname: propvalue for propname,propvalue in payload_dict }
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    path = '/'.join((path_parsed.split('/'))[5:])
    payload = payload_dict.get(path) if path in payload_dict else err(path)
    return render_assets(
        server_instance,
        config,
        added_data = payload,
        is_binary = True,
    )







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

def functionality_path_config(server_instance,config):
    def json_prepare(obj, path="root"):
        if isinstance(obj, Path):
            return str(obj)

        if isinstance(obj, datetime):
            return obj.isoformat()

        if isinstance(obj, dict):
            return {
                key: json_prepare(value, f"{path}.{key}")
                for key, value in obj.items()
            }

        if isinstance(obj, (list, tuple)):
            return [
                json_prepare(value, f"{path}[{index}]")
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
    config_sanitized = json.loads(json.dumps(json_prepare(config),cls=JSONEncoder))
    return config_sanitized, [], 200

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
        'config': functionality_path_config,
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
        body = json.dumps(payload, cls=JSONEncoder),
        headers = headers,
    )
