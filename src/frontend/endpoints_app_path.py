

import json
from datetime import datetime
from pathlib import Path

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
