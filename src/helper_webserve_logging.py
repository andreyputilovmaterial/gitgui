"""Caller-side logging for webserve events.

webserve (the submodule) no longer prints when its built-in logging is disabled;
instead it emits structured events. This module is the re-implementation of the
logging on the caller side: it subscribes to those events, prints a console line
that matches the old webserve output (same fields, same colors, same streams)
and keeps a capped, JSON-safe list of records so the app can expose them (e.g.
through an endpoint).

The stdlib ``logging`` module is used for the console output: it serializes
writes across threads, so concurrent request logs can't interleave mid-line.
"""

import logging
import sys
from datetime import datetime, timezone


LOGGER_NAME = "gitgui.webserve"

MAX_LOG_RECORDS = 10000

# Same ANSI colors the old webserve logger used.
STDOUT_COLOR_RESET = "\033[0m"
STDOUT_COLOR_RED = "\033[31m"
STDOUT_COLOR_YELLOW = "\033[33m"
STDOUT_COLOR_CYAN = "\033[36m"
STDOUT_COLOR_GREEN = "\033[32m"

logger = logging.getLogger(LOGGER_NAME)


class _BelowLevel(logging.Filter):
    """Keep only records strictly below a level (used to split stdout/stderr)."""

    def __init__(self, level):
        super().__init__()
        self._level = level

    def filter(self, record):
        return record.levelno < self._level


def _configure_logging():
    if logger.handlers:
        return
    logger.setLevel(logging.INFO)
    logger.propagate = False

    fmt = logging.Formatter("%(message)s")

    # INFO (start / request / stop) goes to stdout.
    out = logging.StreamHandler(sys.stdout)
    out.setLevel(logging.INFO)
    out.addFilter(_BelowLevel(logging.WARNING))
    out.setFormatter(fmt)

    # WARNING and ERROR (notices / errors) go to stderr.
    err = logging.StreamHandler(sys.stderr)
    err.setLevel(logging.WARNING)
    err.setFormatter(fmt)

    logger.addHandler(out)
    logger.addHandler(err)


def _status_color(status):
    if status >= 500:
        return STDOUT_COLOR_RED
    if status >= 400:
        return STDOUT_COLOR_YELLOW
    if status >= 300:
        return STDOUT_COLOR_CYAN
    return STDOUT_COLOR_GREEN


class WebserveLogger:
    def __init__(self, config=None):
        _configure_logging()
        self.config = config or {}
        self._records = []

    @property
    def records(self):
        """The live, capped list of JSON-safe log records (newest at the end)."""
        return self._records

    def _store(self, event_name, payload):
        record = {
            'event': event_name,
            'timestamp_utc': datetime.now(timezone.utc).isoformat(),
        }
        record.update(payload)
        self._records.append(record)
        if len(self._records) > MAX_LOG_RECORDS:
            del self._records[: len(self._records) - MAX_LOG_RECORDS]

    def handle_event(self, event_name, payload):
        if event_name == 'webserver_start':
            msg = (
                f"{self.config.get('script_name', 'webserve')}: "
                f"{STDOUT_COLOR_GREEN}starting webserver at "
                f"{payload.get('host')}:{payload.get('port')}{STDOUT_COLOR_RESET}"
            )
            logger.info(msg)
            self._store(event_name, {'host': payload.get('host'), 'port': payload.get('port')})
        elif event_name == 'webserver_stop':
            msg = f"\n{STDOUT_COLOR_RED}Stopped ({payload.get('reason', '')}){STDOUT_COLOR_RESET}"
            logger.info(msg)
            self._store(event_name, {'reason': payload.get('reason')})
        elif event_name == 'request':
            self._log_request(payload)
        elif event_name == 'error':
            self._log_error(payload)
        else:
            logger.warning(f"webserve: unhandled event {event_name}: {payload}")
            self._store(event_name, {'payload': f'{payload}'})

    def _log_request(self, payload):
        status = payload.get('status_code')
        try:
            status_int = int(status)
        except (TypeError, ValueError):
            status_int = None

        if status_int is None:
            # Non-numeric status (rare fallback): print plain, like the base logger.
            msg = (
                f"{payload.get('remote_address', '-')} - - "
                f"[{payload.get('timestamp', '')}] "
                f"[{status}] "
                f'"{payload.get("request_line", "")}"'
            )
        else:
            color = _status_color(status_int)
            msg = (
                f"{payload.get('remote_address', '-')} - - "
                f"[{payload.get('timestamp', '')}] "
                f"{color}[{status_int:03d}]{STDOUT_COLOR_RESET} "
                f'"{payload.get("request_line", "")}"'
            )
        logger.info(msg)
        self._store('request', {
            'method': payload.get('method'),
            'path': payload.get('path'),
            'status_code': status,
            'remote_address': payload.get('remote_address'),
            'request_line': payload.get('request_line'),
            'timestamp': payload.get('timestamp'),
            'response_size': payload.get('response_size'),
        })

    def _log_error(self, payload):
        message = payload.get('message', '')
        traceback_str = payload.get('traceback', '')
        if traceback_str:
            msg = (
                f"{STDOUT_COLOR_RED}Error: {message}{STDOUT_COLOR_RESET}\n"
                f"{STDOUT_COLOR_RED}{traceback_str}{STDOUT_COLOR_RESET}"
            )
        else:
            msg = f"{STDOUT_COLOR_RED}Error: {message}{STDOUT_COLOR_RESET}"
        logger.error(msg)
        self._store('error', {'message': message, 'traceback': traceback_str})
