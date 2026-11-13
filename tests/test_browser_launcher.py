"""Tests for the --browser launch modes (src/browser_launcher.py)."""

import pytest

import src.browser_launcher as browser_launcher
from src.browser_launcher import (
    BROWSER_MODE_DEFAULT,
    BROWSER_MODE_NOOP,
    BROWSER_MODE_PYWEBVIEW,
    launch_browser_for_mode,
)


def test_default_mode_calls_launch_browser(monkeypatch):
    calls = []
    monkeypatch.setattr(browser_launcher, "launch_browser", lambda url: calls.append(url))
    launch_browser_for_mode(BROWSER_MODE_DEFAULT, "http://localhost:5180/")
    assert calls == ["http://localhost:5180/"]


def test_noop_mode_does_nothing(monkeypatch):
    calls = []
    monkeypatch.setattr(browser_launcher, "launch_browser", lambda url: calls.append(url))
    launch_browser_for_mode(BROWSER_MODE_NOOP, "http://localhost:5180/")
    assert calls == []


def test_pywebview_raises_not_implemented():
    with pytest.raises(NotImplementedError, match="not implemented"):
        launch_browser_for_mode(BROWSER_MODE_PYWEBVIEW, "http://localhost:5180/")


def test_unknown_mode_raises_value_error():
    with pytest.raises(ValueError, match="unknown browser mode"):
        launch_browser_for_mode("definitely-not-a-mode", "http://localhost:5180/")
