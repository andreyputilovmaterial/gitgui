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

## Modals (frontend)

- Modal infrastructure lives in `src/frontend/app_js/src/common_components/modals/`
  and is exposed to components as `repoActions.createModal(ComponentOrVNode)` via
  `common_app_features/app_modals` (mounted once as `<modals>` in `app.js`).
- API: `const result = await repoActions.createModal(Comp)`. The modal component
  receives `resolve`/`reject` props; `resolve(value)` resolves the promise with
  `value`, `reject(reason)` rejects it. **Idiom:** rejecting with a non-Error
  value means "user cancelled" (dismiss button / "x"); rejecting with an `Error`
  means a real error. Callers `try/catch` the `await` and drop non-Error
  rejections; real errors bubble up to `repoActions.logError` at root call sites.
- The promise in `modals/_context.js` is the bridge between the global
  `createModal()` entry point and the mounted `<modals>` placeholder (two
  "parallel universes"). It resolves to the site's own `createModal` when the
  site mounts; calls before mount are simply deferred until then.
- Modal scrolling: `.mdm-git-ui-modal-wrapper` is `position: fixed; top: 56px`
  with `max-height: calc(100vh - 86px)` (dvh fallback); only
  `.mdm-git-ui-modal-inner` scrolls (`overflow-y: auto`). Small modals keep the
  page-behind-scroll behavior; tall modals scroll internally and never clip
  below the viewport.

## Records filter component (frontend)

- `src/frontend/app_js/src/common_components/filter_records_form/` is the uniform
  filter + sort + paginate wrapper (`<component-filter-records-form>`) used by
  every record list. See its README for the full usage contract.
- Refactored to a **scoped slot** API: the component computes the processed list
  and exposes it as the slot prop `{ records }`. Consumers no longer need a
  template `ref` + a `computed` calling `paginateAndSort`.
- The leaf-side "apply my classes" requirement is a single helper,
  `recordsFilterClasses(componentRecordsFiltData)` (named export of the same
  module), spread into each record's root `:class` — replacing the inline
  `...(componentRecordsFiltData?.cssClasses||[])`.
- Gotcha: the helper must be **returned from `setup()`** (or registered globally);
  a Vue template cannot call a bare imported function. A missing return is a
  runtime *render* error, not a bundling error — the bundler only tokenizes JS
  and does not compile Vue templates.
- Two-layer filtering is intentional and preserved: never-shown records are
  dropped from the rendered array; previously-shown records are CSS-hidden
  (`display:none`) so re-showing is instant while typing. The keep-alive grace
  period is now a named constant `RECORDS_VISIBILITY_GRACE_MS` = 15000 ms
  (was a hardcoded 300000 / "5 minutes").
- Fixed latent bugs in the component: undefined `len`, `Exception`, and `logErr`
  (now `records.length`, `Error`, and `import logErr from '../_log_error_proxy'`).

## Last state

- Records filter: fixed a pre-existing sort crash — sorting a `text` column
  (e.g. "message") threw `localeCompare` on `undefined` for records missing that
  field (the history "worktree"/"index" pseudo-records). `sortComparator` now
  null-guards text and datetime values and validates the column before reading
  its type.
- Records filter: hide the pagination rows when the list fits on a single page
  (`v-if="pagination.length > 1"`), and restructure the controls into a single
  `.mdmreport-banner` wrapper whose inner rows (`.mdm-ui-recordsfilter-controls-row`)
  are spaced with a `+`-sibling `margin-top` (except the first) — replacing the old
  "un-stick" banner hacks so the banner keeps its border/padding on the outer sides.
- Fixed a runtime render error where `recordsFilterClasses` wasn't returned from
  `setup()` (templates can't call bare imports); now returned by all 8 leaf record
  components. Added a global safety net in `app__error_reporting` that routes
  uncaught `error`/`unhandledrejection` events to the error banner + console
  (skipping resource-load errors and non-Error "user cancelled" rejections).
- Reworked the records-filter component into a scoped-slot API and documented the
  usage pattern (see "Records filter component" above); fixed the `len`/
  `Exception`/`logErr` bugs; made the CSS-hide grace period a named 15 s constant.
- Documented the modal design contract across its participants (modals/index.js,
  _context.js, component.js, app_modals, app.js) and fixed modal scrolling: the
  wrapper now has `max-height` and only the inner content scrolls, so tall
  modals scroll internally while small modals keep the page-behind-scroll
  behavior.
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

## Streaming jobs (pipe) model

- Canonical reference: `docs/streaming-jobs.md`. Long-running work is modeled as
  **jobs** (`src/cli_proxy_caller`), each with an id, a status, and a promise the
  frontend polls. A multi-step task is a **pipe** of jobs
  (`producer | consumer | …`), each running concurrently.
- Three job kinds, all looking identical to the frontend: sync
  (`subprocess.run`), interactive (`subprocess.Popen`), and pure-Python fn
  (`fn(stdin, stdout, stderr, *args)`, used by `output_postprocessors` such as
  `tar`/`textconv`).
- Golden rule: **consume before await** — start draining the next participant's
  output *before* awaiting the current one's completion, else the producer fills
  its OS pipe buffer and deadlocks. The frontend expresses this by awaiting
  `promiseDownloadLinkReady` → `fetch`/`PUT` first, then a single
  `Promise.all([...])` at the end (never in creation order).

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
