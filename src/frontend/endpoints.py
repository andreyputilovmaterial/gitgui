
import html
from urllib.parse import urlparse, parse_qs
import re

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
        assets = [('js-link','/vue.js',),('js-link-module','/app.js',),],
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
    # print(repr(server_instance))
    # print(server_instance)
    content_type = 'text/plain'
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    if re.match(r'.*\.css\s*$',path_parsed,flags=re.I):
        content_type = 'text/css'
    elif re.match(r'.*\.m?js\s*$',path_parsed,flags=re.I):
        content_type = 'text/javascript'
    print(f'To verify: requested resource: "{server_instance.path}", with path "{path_parsed}", and content-type will be set to "{content_type}"')
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

def handle_command(server_instance,config={},added_data=None):
    WebResponse = config.get("WebResponse")
    raise Exception('Not implemented!')
