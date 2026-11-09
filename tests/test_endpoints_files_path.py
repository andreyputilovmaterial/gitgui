"""Tests for the /browse endpoint dispatcher (src/frontend/endpoints_files_path.py).

The /browse contract is: HTTP 404 means specifically "the requested resource was
not found" (nothing else). These tests exercise the dispatch logic with a fake
WebResponse and a real temp directory as the `worktree` namespace.
"""

import json
from types import SimpleNamespace

from src.frontend.endpoints_files_path import handle_request_files_endpoint


class _FakeWebResponse:
    def __init__(self, status_code=None, content_type=None, body=None, headers=None,
                 is_binary=False, is_stream=False, is_done=False, options=None):
        self.status_code = status_code
        self.content_type = content_type
        self.body = body
        self.headers = headers
        self.is_binary = is_binary
        self.is_stream = is_stream
        self.is_done = is_done
        self.options = options


def _config(working_tree):
    return {
        'iface': {'WebResponse': _FakeWebResponse},
        'working_tree': str(working_tree),
    }


def _request(path, command='GET'):
    return SimpleNamespace(path=path, command=command)


def test_browse_missing_path_returns_404(tmp_path):
    resp = handle_request_files_endpoint(
        _request('/browse/worktree:no/such/path'), _config(tmp_path)
    )
    assert resp.status_code == 404
    payload = json.loads(resp.body)
    assert payload['status'] == 'error'
    assert 'resource not found' in payload['error']


def test_browse_directory_lists_children(tmp_path):
    (tmp_path / 'a.txt').write_text('hi')
    (tmp_path / 'sub').mkdir()
    resp = handle_request_files_endpoint(
        _request('/browse/worktree:'), _config(tmp_path)
    )
    assert resp.status_code == 200
    payload = json.loads(resp.body)
    assert isinstance(payload, list)
    assert {'a.txt', 'sub'} <= {entry['name'] for entry in payload}


def test_browse_file_returns_info(tmp_path):
    (tmp_path / 'a.txt').write_text('hi')
    resp = handle_request_files_endpoint(
        _request('/browse/worktree:a.txt'), _config(tmp_path)
    )
    assert resp.status_code == 200
    payload = json.loads(resp.body)
    assert payload['type'] == 'file'
    assert payload['name'] == 'a.txt'


def test_browse_size_missing_returns_404(tmp_path):
    resp = handle_request_files_endpoint(
        _request('/browse/worktree:missing', command='SIZE'), _config(tmp_path)
    )
    assert resp.status_code == 404


def test_browse_size_on_file_returns_400(tmp_path):
    (tmp_path / 'a.txt').write_text('hi')
    resp = handle_request_files_endpoint(
        _request('/browse/worktree:a.txt', command='SIZE'), _config(tmp_path)
    )
    assert resp.status_code == 400


def test_browse_size_on_directory_returns_size(tmp_path):
    (tmp_path / 'a.txt').write_text('hello')
    resp = handle_request_files_endpoint(
        _request('/browse/worktree:', command='SIZE'), _config(tmp_path)
    )
    assert resp.status_code == 200
    assert json.loads(resp.body) == 5
