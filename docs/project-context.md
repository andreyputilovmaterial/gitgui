# Project context

> Living document. Updated after every task. Read this first at the start of every task.

## What this is

`gitgui` is a self-contained git GUI: a Python backend (self-written webserver,
no Flask/Django) plus a Vue frontend written as plain `.js`/`.css` (no
`.vue`/`.ts`). The distributable is a single `dist/gitgui_bundle.py`, produced
by `build.sh` via the `pinliner` submodule; runtime assets are embedded as
`GENERATED/` Python modules (no standalone JS/CSS/.env at runtime).

## Build & test

- `build.sh` is the single build entry point; it works after a fresh clone
  (`git submodule update --init --recursive`) and does not require Node.
- Node/Vite/Vitest may be used only to speed up frontend development/tests.
- Development tests live in `tests/` (not bundled). `tests-real-sensitive-data/`
  is gitignored and must never be committed.

## Submodules

- `src_dev_build/lib/pinliner` (bundling)
- `src/frontend/bundler_engine/lib/py_js_bundler` (self-written JS bundler)
- `src/webserver_engine/webserve` (self-written webserver)
- `src/lib/webinput`
- `src/frontend/app_js/src/lib/myers-diff` (diff library)

## Conventions

- `.clinerules/` holds the machine rules: architecture/imports, frontend/build,
  testing, code style & errors, JS, CSS, commit messages, dates & time, optional
  dependencies, the `common.css` changelog rule, and this project-context rule.
- Global CSS `src/frontend/template/templates/common.css` is a shared "skin";
  every change must be logged in the adjacent `common.css.changelog.md`.

## Last state

- Brought over/adapted several `.clinerules` from the sibling `apqa` repo:
  commit messages, non-interactive git, dates & time, `common.css` changelog,
  project-context, and optional dependencies.
- Refactored optional textconv-processor dependencies to the apqa pattern:
  `build.sh` copies each `src/textconv/processors/*/requirements.txt` into
  `dist/optional_dependencies/` (preserving its path), and
  `build_templates.py --program transform-run-script` rewrites
  `src/textconv/processors` → `optional_dependencies` in the generated
  `dist/run.sh` (replacing the old awk/array-injection approach).
- `build.sh` version string now uses `git describe --tags --long --always --dirty`.

## Known gotchas

- `.clinerules/01-architecture-imports.md` still says the bundle is
  `apqa_bundle.py` (copy-pasted from apqa); `build.sh` actually produces
  `dist/gitgui_bundle.py`. The rules text should be updated to match.
