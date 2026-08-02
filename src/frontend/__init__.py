
import html


renderer = None

def renderer_home(server_instance,method='GET',config={},added_data=None):
    WebResponse = config.get("WebResponse")
    return WebResponse(
        status_code = 200,
        content_type = 'text/html',
        body = f'<html><body>Hello!</body></html>',
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
