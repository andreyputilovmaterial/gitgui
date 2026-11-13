---
name: backend
description: Manage the local gitgui dev backend on localhost:5180 — status, start, stop, restart, health, logs via dev_backend.py (never lsof/kill/sudo).
---

# Manage the gitgui dev backend

The backend is the Python web server that serves the app UI and its `/command`,
`/repo`, `/config`, `/browse`, `/assets`, … endpoints. Vite proxies to it at
`http://localhost:5180`, so the backend must stay on port 5180 during frontend work.

## Always

- Run from the repo root.
- Use `python dev_backend.py <verb>` (the venv is resolved by the script itself).
- Never use `lsof`, `kill`, `sudo`, or `taskkill` directly.

## Verbs

- `status`  — is it running and healthy? (exit 0 = running/healthy)
- `start`   — start on 5180 if not already running (headless, no browser)
- `stop`    — stop it (idempotent)
- `restart` — stop + start + wait for health
- `health`  — HTTP probe of `http://localhost:5180/health` (exit 0 = HTTP 200)
- `logs`    — tail the backend log `.gitgui-dev-backend.log`

## Example

    python dev_backend.py restart
    python dev_backend.py health

`start`/`restart` default the working tree and git directory to the repo itself;
pass `--working-tree` and `--git-directory-location` to serve another project.

If `start`/`restart` reports the backend did not become healthy, read
`python dev_backend.py logs` for the startup error before changing anything else.
