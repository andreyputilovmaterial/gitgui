

import json
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from .common_functions import JSONEncoder


def handle_config(net_request_handler, config: dict, added_data=None):
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
    config_sanitized = json.loads(json.dumps(clean_config(config), cls=JSONEncoder))
    payload = config_sanitized
    return WebResponse(
        status_code = 200,
        content_type = 'application/json',
        body = json.dumps(payload, cls=JSONEncoder),
        headers = [],
    )


def handle_perf(net_request_handler, config: dict, added_data=None):
    """Perf/introspection endpoint tree.

    - ``/perf``           -> index of the available resources
    - ``/perf/cli_jobs``  -> cli job memory stats (see src/cli_proxy_caller/perf.py)
    - ``/perf/network``   -> webserve request/error log records (exposed by the
      ``get_webserve_log_records`` callable in ``config['iface']``)
    """
    WebResponse = config.get('iface').get('WebResponse')
    path_parsed = urlparse(net_request_handler.path).path

    if path_parsed in ('/perf', '/perf/'):
        payload = {
            'resources': {
                'cli_jobs': '/perf/cli_jobs',
                'network': '/perf/network',
            },
        }
    elif path_parsed == '/perf/cli_jobs':
        get_jobs_perf_stats = (config.get('iface') or {}).get('get_jobs_perf_stats')
        if get_jobs_perf_stats is None:
            payload = {'status': 'error', 'error': 'jobs perf stats are not available'}
        else:
            payload = get_jobs_perf_stats()
    elif path_parsed == '/perf/network':
        get_webserve_log_records = (config.get('iface') or {}).get('get_webserve_log_records')
        payload = get_webserve_log_records() if get_webserve_log_records else []
    else:
        return WebResponse(
            status_code = 404,
            content_type = 'application/json',
            body = json.dumps(
                {'status': 'error', 'error': f'unknown perf resource: {path_parsed}'},
                cls=JSONEncoder,
            ),
            headers = [],
        )

    return WebResponse(
        status_code = 200,
        content_type = 'application/json',
        body = json.dumps(payload, cls=JSONEncoder),
        headers = [],
    )


def handle_health(net_request_handler, config: dict, added_data=None):
    WebResponse = config.get('iface').get('WebResponse')
    method = net_request_handler.command
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
