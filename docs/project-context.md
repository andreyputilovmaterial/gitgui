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
- `docs/maintenance-log.md` holds cross-project structural notes (import style,
  bundling/call conventions) shared with sibling projects of the same shape;
  repo-specific notes stay in `docs/project-context.md`.

## Templating (no Jinja2)

HTML pages are rendered by a small self-rolled layer
(`src/frontend/template/make_html.py` + `html_begin.html`/`html_end.html` with
`{{INS_*}}` placeholders filled via `.replace()`). It already implements basic
templating and is enough for the ~5 pages / ~330 lines we render, so we don't
add a templater (e.g. Jinja2):

- Jinja2 drags in more dependencies (the Flask ecosystem) we'd rather avoid.
- pinliner only bundles our local modules, so a templater installed from
  `requirements.txt` would *not* be bundled — that part is fine. But a templater
  that reads standalone `.html` files at runtime *would* clash with pinliner's
  "no separate files at runtime" model and need hacks/workarounds.
- This isn't about avoiding the mainstream web stack; it's about starting
  minimal and simple and seeing whether maintenance/readability actually
  suffers. Either outcome is useful knowledge.

## Last state

- Restructured the backend endpoint groups: the `/functionality/` group is now
  `/repo/` (gitignore, gitattributes, is-git-repo, existence-*, git-ls-pack-files).
  `config` and `health` moved to root (`/config`, `/health`). Folder-size
  (`dir-sizeof/*`) moved into the files endpoint as a `SIZE` method on
  `/browse/<namespace>:` with new `gitdir`/`pack` namespaces. Backend module
  renamed `endpoints_functionality_path.py` → `endpoints_repo_path.py`; new
  `endpoints_app_path.py` holds `handle_config`/`handle_health` (was
  `handle_isup`). All frontend fetch call sites and the Vite proxy updated.
  Note: the `src/lib/webinput` submodule (project-selector) still has its own
  separate `/functionality/isup.txt` endpoint, left out of scope.
- Added docstrings + light type hints to `src/frontend/endpoints_html_paths.py`
  and the `src/frontend/template` helpers; fixed HTML escaping at the right
  boundary (escaped `pagename`/`version`, removed double-escaping of `title`/`h1`).
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
- Expanded the `py_js_bundler` submodule's ES-module support (it now has its own
  local `docs/project-context.md` + `.clinerules/00-project-context.md`):
  structured import/export parsing, namespace imports, re-exports, expression
  defaults, multiple declarators, destructuring declarations, string-literal/
  reserved module names — and fixed a latent bug where aliased imports emitted
  invalid destructuring. Submodule suite: 405 passed, 0 xfailed; the real
  `src/frontend/app_js` bundle still builds.
- Fixed `.clinerules/` doc drift (bundle name `apqa_bundle.py` →
  `gitgui_bundle.py`; "minimal chanes" → "minimal changes") and refreshed
  `docs/project-context.md` (dropped the resolved bundle-name gotcha, added the
  CSS-naming tension note and the rules-vs-Zen review).
- Adopted `docs/maintenance-log.md` from the sibling `apqa` repo and implemented
  its entries: pulled the `pinliner` submodule to `7152465` (adds
  `--main`/`--main-attr`), converted `src/launcher.py` from the three-branch
  `__name__` split to a two-branch `__package__` split, and switched `build.sh`
  to generate the bundle entry point via `--main src.launcher --main-attr main`
  instead of hand-patching `launcher.main()`.

## Known gotchas

- The CSS rules tolerate two naming conventions — `mdm-*` (current) and the
  legacy `mdmreport-*` (report feature "built first"). A mild tension with
  "one obvious way to do it", justified in the rules by reading `mdmreport-`
  as brand `mdm` + feature `report`.
- `build_templates.py` (build-time tool, repo root) and
  `src/frontend/template/make_html.py` (bundled) still use the older
  three-branch `__name__` import split. They are not entry-point modules, so the
  `__package__` split does not apply to them; `make_html.py`'s split is a
  dev-vs-bundle asset-sourcing choice, not an entry-point pattern.

## Last review: rules vs. Zen of Python

- Scanned all `.clinerules/` files against `import this`. Verdict: aligned;
  no substantive violations. The rules map cleanly onto the Zen lines —
  `04-code-style-errors.md` → "Errors should never pass silently (unless
  explicitly silenced)"; the CSS prefix system, Python packages and submodules
  → "Namespaces are one honking great idea"; the stable-features-only CSS rule
  → "never is often better than *right* now"; the documented "practicality
  beats purity" carve-outs (launcher.py, unprefixed globals, double error
  reporting) are explicit, not accidental. Only real tensions are tradeoffs
  that the rules themselves acknowledge (see Known gotchas).
