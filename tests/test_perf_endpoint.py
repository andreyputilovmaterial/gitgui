"""Tests for the /perf endpoint dispatcher (src/frontend/endpoints_app_path.py).

These use a fake WebResponse so the tests exercise only the dispatch logic
(which sub-path maps to which payload), not the real webserver.
"""

import json
from types import SimpleNamespace

from src.frontend.endpoints_app_path import handle_perf


class _FakeWebResponse:
    def __init__(self, status_code=None, content_type=None, body=None, headers=None):
        self.status_code = status_code
        self.content_type = content_type
        self.body = body
        self.headers = headers


def _config(jobs_stats=None, log_records=None):
    return {
        'iface': {
            'WebResponse': _FakeWebResponse,
            'get_jobs_perf_stats': jobs_stats,
        },
        'webserve_log_records': log_records if log_records is not None else [],
    }


def _request(path):
    return SimpleNamespace(path=path, command='GET')


def test_perf_index_lists_resources():
    resp = handle_perf(_request('/perf'), _config())
    assert resp.status_code == 200
    payload = json.loads(resp.body)
    assert payload['resources']['cli_jobs'] == '/perf/cli_jobs'
    assert payload['resources']['network'] == '/perf/network'


def test_perf_cli_jobs_returns_stats():
    def stats():
        return {'jobs_count': 3, 'total_bytes': 100}

    resp = handle_perf(_request('/perf/cli_jobs'), _config(jobs_stats=stats))
    assert resp.status_code == 200
    assert json.loads(resp.body) == {'jobs_count': 3, 'total_bytes': 100}


def test_perf_cli_jobs_without_stats_returns_error():
    resp = handle_perf(_request('/perf/cli_jobs'), _config(jobs_stats=None))
    assert resp.status_code == 200
    assert json.loads(resp.body)['status'] == 'error'


def test_perf_network_returns_log_records():
    records = [{'event': 'request', 'path': '/health'}]
    resp = handle_perf(_request('/perf/network'), _config(log_records=records))
    assert resp.status_code == 200
    assert json.loads(resp.body) == records


def test_perf_unknown_resource_returns_404():
    resp = handle_perf(_request('/perf/nope'), _config())
    assert resp.status_code == 404
    assert json.loads(resp.body)['status'] == 'error'
