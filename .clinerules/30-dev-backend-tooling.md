# Dev backend tooling

- The local dev backend runs on `localhost:5180`; the Vite dev server proxies to it.
- Manage the backend **only** via `python dev_backend.py` (`status` / `start` /
  `stop` / `restart` / `health` / `logs`) from the repo root — see the `backend` skill.
- Never use `lsof` / `kill` / `sudo` / `taskkill` to find or kill the backend process.
- If the backend isn't running, start it headlessly with `python dev_backend.py start`
  before working on the frontend or the API.
