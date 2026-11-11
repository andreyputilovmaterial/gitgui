"""Resolve the per-user directory where gitgui keeps its helper files.

The directory is namespaced by the application name and placed in the
OS-designated per-user location for each platform, so it never collides with
other programs and follows the platform's roaming/backup conventions:

    macOS    ~/Library/Application Support/gitgui
    Windows  %APPDATA%\\gitgui
    Linux    $XDG_CONFIG_HOME/gitgui (or ~/.config/gitgui)

Set the ``GITGUI_HOME_DIR`` environment variable to override the location
(used by tests). The directory is *not* created here -- consumers create it
lazily with ``Path.mkdir(parents=True, exist_ok=True)`` when they first need
to write to it.
"""

import os
import sys
from pathlib import Path


APP_NAME = 'gitgui'
ENV_HOME_DIR = 'GITGUI_HOME_DIR'


def _windows_home_dir() -> Path:
    base = os.getenv('APPDATA')
    if not base:
        base = os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming')
    return Path(base)


def _darwin_home_dir() -> Path:
    return Path(os.path.expanduser('~/Library/Application Support'))


def _linux_home_dir() -> Path:
    base = os.getenv('XDG_CONFIG_HOME')
    if not base:
        base = os.path.join(os.path.expanduser('~'), '.config')
    return Path(base)


def get_app_home_dir() -> Path:
    """Return the per-user gitgui home directory as a ``Path``.

    Does not create the directory; callers create it on first write.
    """
    override = os.getenv(ENV_HOME_DIR)
    if override:
        return Path(override).expanduser()

    if sys.platform == 'win32':
        base = _windows_home_dir()
    elif sys.platform == 'darwin':
        base = _darwin_home_dir()
    else:
        base = _linux_home_dir()

    return base / APP_NAME
