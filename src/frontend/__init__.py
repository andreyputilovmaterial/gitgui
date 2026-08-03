
import html

from .common_functions import wrap_div
from .template.make_html import make_banner, make_meta, make_asset_jsembed, make_asset_cssembed, make_asset_jslink, make_asset_csslink, make_asset, make_section, make_html
from .template.GENERATED.TEMPLATE_COMPILED.ASSETS import common_css, common_js, normalize_css


renderer = None

def renderer_home(server_instance,method='GET',config={},added_data=None):
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
        assets = [],
        cssclasses = ['gitgui','gitgui-page-home',],
        banners = [
            f'<div class="banner-global-folder-props"><p class="mdmreport-prop-row">{html.escape("git-work-tree-folder: "+config.get("dir_working_tree"))}</p><p class="mdmreport-prop-row">{html.escape("git-repo-folder: "+config.get("dir_git_repo"))}</p></div>',
        ],
        sections = ['<span></span>'],
    )

    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = page_body,
        headers = [],
    )

def render_assets_common_css(server_instance,method='GET',config={},added_data=None):
    WebResponse = config.get("WebResponse")
    payload = common_css
    return WebResponse(
        status_code = 200,
        content_type = 'text/css',
        body = payload,
        headers = [],
    )

def render_assets_normalize_css(server_instance,method='GET',config={},added_data=None):
    WebResponse = config.get("WebResponse")
    payload = normalize_css
    return WebResponse(
        status_code = 200,
        content_type = 'text/css',
        body = payload,
        headers = [],
    )

def render_assets_common_js(server_instance,method='GET',config={},added_data=None):
    WebResponse = config.get("WebResponse")
    payload = common_js
    return WebResponse(
        status_code = 200,
        content_type = 'text/css',
        body = payload,
        headers = [],
    )




def renderer_version(server_instance,method='GET',config={},added_data=None):
    WebResponse = config.get("WebResponse")
    version = config.get("script_version")
    version = f'{version}'.strip()
    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = f'<html><body>Version: {html.escape(version)}</body></html>',
        headers = [],
    )

def handle_command(server_instance,method='GET',config={},added_data=None):
    WebResponse = config.get("WebResponse")
    raise Exception('Not implemented!')
