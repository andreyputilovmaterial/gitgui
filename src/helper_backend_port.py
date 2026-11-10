"""Port selection helpers for the webserver.

The backend's ``--config-webserver-port`` CLI argument accepts three forms, and
this module resolves that value into a concrete, available port number. Keeping
this here (rather than inline in ``main_gitgui_program.py``) keeps the startup
module focused on wiring the app together.
"""

import socket

from .webserver_engine.webserve.src.find_free_port import find_free_port


# The default port (and the port the "auto" search starts from, see the
# --config-webserver-port CLI argument in main_gitgui_program.py). When no
# explicit port is requested, the backend runs at
# PORT_START_WITH, or at the first available port after it (the search increments
# by one until it finds a free port).
#
# Note on why the port is configurable:
#   * Whatever port ends up being used is NOT a problem for the browser that gets
#     launched: launch_browser() just opens http://localhost:<port>/, so it follows
#     the backend wherever it lands.
#   * It CAN be a problem for the dev npm server, though: its Vite config
#     (src/frontend/app_js/vite.config.js) hard-codes http://localhost:5180 as the
#     proxy target for every API path. So while developing against the Vite dev
#     server, keep the backend on 5180 (or update vite.config.js accordingly).
PORT_START_WITH = 5180


def _require_port_available(host, port):
    """Fail with a readable error if ``(host, port)`` is already taken.

    A socket is bound to the address purely as a probe (the same way
    ``find_free_port`` does). If binding fails, the underlying ``OSError`` from
    the socket is chained into the raised exception via ``raise ... from ...`` so
    the original reason stays visible in the traceback.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind((host, port))
        except OSError as exc:
            raise Exception(
                f'specified port {port} can\'t be used on {host}: {exc}'
            ) from exc


def _resolve_port(port_arg, host):
    """Translate the ``--config-webserver-port`` CLI value into a concrete port number.

    ``--config-webserver-port`` accepts three forms:

    * an integer (e.g. ``5180``) — use exactly that port. If it is occupied the
      program fails immediately (see ``_require_port_available``);
    * ``auto`` — start searching at the default ``PORT_START_WITH`` and pick the
      first available port, incrementing by one (this is the default behaviour
      and what ``find_free_port`` already does);
    * ``auto:<N>`` — the same search, but starting from ``<N>`` instead of the
      default ``PORT_START_WITH``.
    """
    if port_arg is None or port_arg == 'auto':
        return find_free_port(host, start=PORT_START_WITH)

    if port_arg.startswith('auto:'):
        try:
            start = int(port_arg.split(':', 1)[1])
        except ValueError as exc:
            raise Exception(
                f'invalid --config-webserver-port value {port_arg!r}: '
                f"'auto:<N>' expects an integer port after 'auto:'"
            ) from exc
        return find_free_port(host, start=start)

    try:
        port = int(port_arg)
    except ValueError as exc:
        raise Exception(
            f'invalid --config-webserver-port value {port_arg!r}: expected an integer port, '
            f"'auto', or 'auto:<N>'"
        ) from exc

    _require_port_available(host, port)
    return port
