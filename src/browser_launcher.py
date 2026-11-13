"""Browser-launch modes for the UI program.

The desktop app can open its web UI in a browser (or not). The choice is the
CLI flag ``--browser`` on the UI entry point, with these modes:

* ``launch-system-default-browser`` (default) — open the OS default browser via
  ``launch_browser`` (``webbrowser.open``).
* ``no-op`` — start the server without opening any browser. Used by headless /
  dev automation (``dev_backend.py`` starts the backend this way).
* ``pywebview`` — reserved: render the UI in a pywebview window. Not implemented
  yet; selecting it fails early with a readable ``NotImplementedError``.

Keeping the decision here (not in the entry-point ``main_gitgui_program``) makes
the modes testable without importing the whole UI program and its ``GENERATED/``
+ ``.env`` dependencies.
"""

from .webserver_engine.webserve.src.launch_browser import launch_browser


BROWSER_MODE_DEFAULT = 'launch-system-default-browser'
BROWSER_MODE_NOOP = 'no-op'
BROWSER_MODE_PYWEBVIEW = 'pywebview'

BROWSER_MODES = (
    BROWSER_MODE_DEFAULT,
    BROWSER_MODE_NOOP,
    BROWSER_MODE_PYWEBVIEW,
)


def launch_browser_for_mode(browser_mode, url):
    """Open ``url`` according to ``browser_mode`` (see module docstring)."""
    if browser_mode == BROWSER_MODE_DEFAULT:
        launch_browser(url)
    elif browser_mode == BROWSER_MODE_NOOP:
        pass
    elif browser_mode == BROWSER_MODE_PYWEBVIEW:
        raise NotImplementedError(
            f'--browser {BROWSER_MODE_PYWEBVIEW} is not implemented yet'
        )
    else:
        raise ValueError(f'unknown browser mode: {browser_mode!r}')
