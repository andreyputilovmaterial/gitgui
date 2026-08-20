from urllib.parse import urlparse, parse_qs # to deliver deeper resources, like in fonts
import re # to set content-type based on file type




from .common_functions import get_matching_endpoint
from .template.make_html import make_html
from .template.GENERATED.TEMPLATE_COMPILED.ASSETS import (
    common_css,
    common_js,
    normalize_css,
)
from .GENERATED.ASSETS import (
    app_js,
    # app_css,
    project_specific_styles_css,
    vendorlibs_vue_js,
    vendorlibs_marked_js,
    vendorlibs_dompurify_js,
    _ASSETS_VENDORLIBS_FONTS_IBMPLEXSANS,
    _ASSETS_VENDORLIBS_FONTS_IBMPLEXMONO,
)






def render_payload(server_instance,config={},added_data=None,is_binary=False):
    WebResponse = config.get('iface').get('WebResponse')
    content_type = 'text/plain'
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    if re.match(r'.*\.css\s*$',path_parsed,flags=re.I):
        content_type = 'text/css'
    elif re.match(r'.*\.m?js\s*$',path_parsed,flags=re.I):
        content_type = 'text/javascript'
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
    return render_payload(server_instance,config,added_data=payload)

def render_assets_normalize_css(server_instance,config={},added_data=None):
    payload = normalize_css
    return render_payload(server_instance,config,added_data=payload)

def render_assets_common_js(server_instance,config={},added_data=None):
    payload = common_js
    return render_payload(server_instance,config,added_data=payload)

def render_assets_app_js(server_instance,config={},added_data=None):
    payload = app_js
    return render_payload(server_instance,config,added_data=payload)

def render_assets_project_specific_styles_css(server_instance,config={},added_data=None):
    payload = project_specific_styles_css
    return render_payload(server_instance,config,added_data=payload)

def render_assets_vendorlibs_vue_js(server_instance,config={},added_data=None):
    payload = vendorlibs_vue_js
    return render_payload(server_instance,config,added_data=payload)
def render_assets_vendorlibs_marked_js(server_instance,config={},added_data=None):
    payload = vendorlibs_marked_js
    return render_payload(server_instance,config,added_data=payload)
def render_assets_vendorlibs_dompurify_js(server_instance,config={},added_data=None):
    payload = vendorlibs_dompurify_js
    return render_payload(server_instance,config,added_data=payload)
def render_assets_vendorlibs_font_ibmplexsans(server_instance,config={},added_data=None):
    WebResponse = config.get('iface').get('WebResponse')
    payload_dict = _ASSETS_VENDORLIBS_FONTS_IBMPLEXSANS
    payload_dict = { propname: propvalue for propname,propvalue in payload_dict }
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    path = '/'.join((path_parsed.split('/'))[5:])
    if path not in payload_dict:
        return WebResponse(
            status_code = 404,
            content_type = 'text/css',
            body = '',
            headers = [],
        )
    payload = payload_dict.get(path)
    return render_payload(
        server_instance,
        config,
        added_data = payload,
        is_binary = True,
    )
def render_assets_vendorlibs_font_ibmplexmono(server_instance,config={},added_data=None):
    WebResponse = config.get('iface').get('WebResponse')
    payload_dict = _ASSETS_VENDORLIBS_FONTS_IBMPLEXMONO
    payload_dict = { propname: propvalue for propname,propvalue in payload_dict }
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    path = '/'.join((path_parsed.split('/'))[5:])
    if path not in payload_dict:
        return WebResponse(
            status_code = 404,
            content_type = 'text/css',
            body = '',
            headers = [],
        )
    payload = payload_dict.get(path)
    return render_payload(
        server_instance,
        config,
        added_data = payload,
        is_binary = True,
    )


endpoints = {
    '/common.css': render_assets_common_css,
    '/normalize.css': render_assets_normalize_css,
    '/common.js': render_assets_common_js,
    '/vendorlibs/vue.js': render_assets_vendorlibs_vue_js,
    '/vendorlibs/marked.js': render_assets_vendorlibs_marked_js,
    '/vendorlibs/dompurify.js': render_assets_vendorlibs_dompurify_js,
    re.compile('^/vendorlibs/fonts/ibm-plex-sans/.*'): render_assets_vendorlibs_font_ibmplexsans,
    re.compile('^/vendorlibs/fonts/ibm-plex-mono/.*'): render_assets_vendorlibs_font_ibmplexmono,
    '/app.js': render_assets_app_js,
    # '/app.css': render_assets_app_css,
    '/project-specific.css': render_assets_project_specific_styles_css,
}


def renderer_assets(server_instance,config={},added_data=None):
    WebResponse = config.get('iface').get('WebResponse')
    def not_found(*args,**argv):
        payload = f'Resource not found: {repr(server_instance.path)}'
        return WebResponse(
            status_code = 404,
            content_type = 'text/plain', #'text/css',
            body = payload,
            headers = [],
            is_binary=False,
        )
    path_with_query = server_instance.path
    path_parsed = f'{urlparse(path_with_query).path}'
    path = path_parsed.split('/')
    method = server_instance.command
    if len(path)>=3 and path[0]=='':
        path = '/'.join([]+['']+path[2:])
        renderer = get_matching_endpoint(path,endpoints) or not_found
    else:
        renderer = not_found
    try:
        return renderer(server_instance,config,added_data)
    except FileNotFoundError:
        return not_found()
    except Exception as e:
        raise e # for readability - to make it clear any exception normally passes up to webserver engine
