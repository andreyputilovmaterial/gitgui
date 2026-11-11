"""Tests for the per-user app home directory resolver
(src/get_app_home_dir.py)."""

from src.get_app_home_dir import (
    APP_NAME,
    ENV_HOME_DIR,
    get_app_home_dir,
)


def test_env_override_is_honored(monkeypatch, tmp_path):
    override = tmp_path / 'custom' / 'location'
    monkeypatch.setenv(ENV_HOME_DIR, str(override))
    assert get_app_home_dir() == override


def test_env_override_is_expanded(monkeypatch, tmp_path):
    monkeypatch.setenv(ENV_HOME_DIR, '~/relative-home')
    monkeypatch.setenv('HOME', str(tmp_path))
    assert get_app_home_dir() == tmp_path / 'relative-home'


def test_default_is_absolute_and_namespaced_by_app_name(monkeypatch, tmp_path):
    monkeypatch.delenv(ENV_HOME_DIR, raising=False)
    # Give every platform branch a deterministic base inside the temp dir, so
    # the test does not depend on the real home directory.
    monkeypatch.setenv('HOME', str(tmp_path))
    monkeypatch.setenv('XDG_CONFIG_HOME', str(tmp_path))
    monkeypatch.setenv('APPDATA', str(tmp_path))
    result = get_app_home_dir()
    assert result.name == APP_NAME
    assert result.is_absolute()


def test_does_not_create_directory(monkeypatch, tmp_path):
    target = tmp_path / 'does' / 'not' / 'exist' / 'yet'
    monkeypatch.setenv(ENV_HOME_DIR, str(target))
    result = get_app_home_dir()
    assert result == target
    assert not result.exists()
