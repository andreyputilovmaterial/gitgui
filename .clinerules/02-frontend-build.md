# Frontend & build

- The webserver is self-written (`src/webserver_engine/webserve`, submodule) — **no Flask/Django**.
- The webserver handles **all HTTP methods** (POST, etc.), even if it looks GET-only at first glance.
- Frontend apps may use **only `.js` and `.css`** — **no `.vue` and no `.ts`** (limitation of the self-written JS bundler `src/frontend/bundler_engine/lib/py_js_bundler`).
- The JS bundler is self-written and raw; it is being extended and may be replaced later.
- The build must be possible **without Node installed**. Node/vite may be used only to speed up frontend development.
- `build.sh` is the single build entry point and must work after a fresh clone (it runs `git submodule update --init --recursive`).
- UI is Vue, but written as plain `.js` + `.css` (Vue served as a vendored JS asset), so it still satisfies the no-`.vue`/no-`.ts` rule.
