"""Tests for the caller-side webserve event logging (src/helper_webserve_logging.py)
and the webserve event emitter (src/webserver_engine/webserve/src/events.py)."""

import json
import logging

import pytest

from src.helper_webserve_logging import (
    MAX_LOG_RECORDS,
    WebserveLogger,
    logger,
)
from src.webserver_engine.webserve.src.events import WebserveEvents
from src.webserver_engine.webserve.src.helper_logger_funcs import Logger


@pytest.fixture(autouse=True)
def _reset_logger():
    logger.handlers.clear()
    logger.setLevel(logging.NOTSET)
    logger.propagate = True
    yield
    logger.handlers.clear()
    logger.setLevel(logging.NOTSET)
    logger.propagate = True


def _request_payload(path="/health", status=200):
    return {
        "method": "GET",
        "path": path,
        "status_code": status,
        "timestamp": "08/Nov/2026 12:00:00",
        "remote_address": "127.0.0.1",
        "request_line": f"GET {path} HTTP/1.1",
        "response_size": 0,
    }


def test_request_event_logs_to_stdout_and_stores_minimal_record(capsys):
    wl = WebserveLogger({"script_name": "gitgui script"})
    wl.handle_event("request", _request_payload())

    captured = capsys.readouterr()
    assert "127.0.0.1 - - [08/Nov/2026 12:00:00]" in captured.out
    assert "[200]" in captured.out
    assert '"GET /health HTTP/1.1"' in captured.out
    assert captured.err == ""

    assert len(wl.records) == 1
    record = wl.records[0]
    assert record["event"] == "request"
    assert record["method"] == "GET"
    assert record["path"] == "/health"
    assert record["status_code"] == 200
    assert record["remote_address"] == "127.0.0.1"
    assert "timestamp_utc" in record
    # no handler/object references — only JSON-safe primitives
    json.dumps(wl.records)


def test_error_event_logs_to_stderr(capsys):
    wl = WebserveLogger({})
    wl.handle_event("error", {"message": "boom", "traceback": "Traceback (most recent call last):\n  boom\n"})

    captured = capsys.readouterr()
    assert "boom" in captured.err
    assert captured.out == ""
    assert wl.records[-1]["event"] == "error"
    assert wl.records[-1]["message"] == "boom"


def test_start_event_has_script_name_prefix(capsys):
    wl = WebserveLogger({"script_name": "gitgui script"})
    wl.handle_event("webserver_start", {"host": "localhost", "port": 5180})

    captured = capsys.readouterr()
    assert "gitgui script: " in captured.out
    assert "starting webserver at localhost:5180" in captured.out


def test_records_capped_at_max(capsys):
    wl = WebserveLogger({})
    # silence the console for this bulk test; records are still captured
    logger.setLevel(logging.CRITICAL)
    for i in range(MAX_LOG_RECORDS + 50):
        wl.handle_event("request", _request_payload(path=f"/x{i}"))

    assert len(wl.records) == MAX_LOG_RECORDS
    # oldest 50 were dropped
    assert wl.records[0]["path"] == "/x50"
    assert wl.records[-1]["path"] == f"/x{MAX_LOG_RECORDS + 49}"


def test_emit_isolates_failing_listener(capsys):
    events = WebserveEvents()
    calls = []

    def bad(_event_name, _payload):
        raise RuntimeError("listener boom")

    def good(event_name, payload):
        calls.append((event_name, payload))

    events.subscribe(bad)
    events.subscribe(good)
    events.emit("request", {"x": 1})

    assert calls == [("request", {"x": 1})]
    assert "listener failed" in capsys.readouterr().err


def test_logger_disabled_does_not_enqueue():
    logger_impl = Logger({}, enabled=False)
    logger_impl.log_network_request("should not be queued")
    assert logger_impl.message_queue.empty()
