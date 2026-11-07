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
  and does not require Node.
- Node/Vite/Vitest may be used only to speed up frontend development/tests.
- Development tests live in `tests/` (not bundled). `tests-real-sensitive-data/`
  is gitignored and must never be committed.

## Submodules

- `src_dev_build/lib/pinliner` (bundling)
- `src/frontend/bundler_engine/lib/py_js_bundler` (self-written JS bundler)
- `src/webserver_engine/webserve` (self-written webserver)
- `src/lib/webinput` (its own `.clinerules/`, `docs/`, `build.sh`, `build_assets.py`; the outer `build.sh` runs its `build.sh` before pinliner)
- `src/frontend/app_js/src/lib/myers-diff` (diff library)

## Conventions

- `.clinerules/` holds the machine rules: architecture/imports, frontend/build,
  testing, code style & errors, JS, CSS, commit messages, GitHub issues in
  commits, dates & time, optional dependencies, the `common.css` changelog rule,
  and this project-context rule.
- Global CSS `src/frontend/template/templates/common.css` is a shared "skin";
  every change must be logged in the adjacent `common.css.changelog.md`.
- `docs/maintenance-log.md` holds cross-project structural notes (import style,
  bundling/call conventions) shared with sibling projects of the same shape;
  repo-specific notes stay in `docs/project-context.md`.

## webserve logging & events

- `src/webserver_engine/webserve` now **emits structured events** instead of
  printing to the console, and its built-in console logging is behind a
  `logging_enabled` constructor arg (default `True`).
- Events (via `Webserver.events.subscribe(listener(event_name, payload))`):
  `webserver_start`, `webserver_stop`, `request` (method/path/status_code/
  timestamp/remote_address/request_line/response_size), and `error`
  (message + traceback). Fail-loud errors (`as_chunks` chunk-size parse,
  body-drain notice) stay as direct `print(..., file=sys.stderr)` and are never
  silenced.
- The caller (`src/main_gitgui_program.py`) creates the webserver with
  `logging_enabled=False`, subscribes `src/helper_webserve_logging.py`'s
  `WebserveLogger` to the events, and stores the capped (10k) JSON-safe log in
  `config['webserve_log_records']` (a live list, like `info`/`warnings`).
- `WebserveLogger` uses the stdlib `logging` module with two handlers — INFO →
  stdout (start/request/stop), WARNING+ → stderr (errors/notices) — and
  reproduces the old coloring. The submodule documents this change in
  `src/webserver_engine/webserve/docs/maintenance-log.md`.

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
- The bottom-of-modal **Close** button wears `mdm-btn mdm-modal-close` (standard
  button skin + modal-close role). `.mdm-modal-close` lives in
  `common_components/modals/styles.css` and sizes the button consistently while
  adding `--mdm-space-0-5x` (15px) breathing room above it. Every modal with a
  dedicated Close button (list-changed-files, show-message, file viewer,
  gitignore help, ajax-page-view) uses these two classes.

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
- Added a regex-capable text filter input (`common_components/input_regex_text`,
  registered as `component-input-regextext`) that looks like the shared
  `.mdmreport-control` text box but shows a clickable `.*` toggle at the right
  that turns green (`--mdm-color-green`) when regex mode is on. It emits
  `{ text, regex }`; `filter_records_form/match/regex_text.js` interprets it
  (case-insensitive substring when off, `new RegExp(text)` when on; invalid
  regexes while typing match nothing). It is now the default input for text and
  unspecified/"uncertain type" columns, with regex mode **off** by default.
- The filter-field row is now a responsive CSS **grid** (was a flex-wrap row):
  `.mdm-ui-recordsfilter .mdm-ui-recordsfilter-form .mdmreport-controls-group`
  uses `grid-template-columns: 1fr` (mobile-first, one field per line) and, via
  `@container (min-width: 220px)`, `repeat(auto-fill, minmax(220px, 1fr))`. Each
  column `<label>` is a vertical flex stack, so every control — text, number,
  datetime — is the **same width** (the old mismatch: regex boxes were wider,
  date/number narrower). The group's shared negative side margins are
  neutralized (`margin: 0`) inside this row; the label's `0 7px` padding still
  provides the horizontal gap. Effectively a new column every ~220px of the row
  (~660/880/1100 container widths minus the banner's 28px padding), with 5
  columns (20% each) at a 1200px container. Removed the now-dead compact-view
  `flex: 0 0 33.31%` override in `page_files_local_list/style.css` (a no-op on
  grid items). The layout resolves against the nearest ancestor `container-type`
  (page root / `.mdm-ui-pages` / modal wrapper), which every consumer already
  provides.

## Last state

- History page (`app/page_revisions_list/`): added a **"Find within history"** box
  directly below "Compare selected versions" — its own `<form>` holding a
  regex-capable search input (`component-input-regextext`, `v-model` on
  `searchQuery`) + "Search" submit button on one line, so Enter / button click /
  any standard trigger fires the form's `submit` event. `handleFindInHistory` is
  a TODO placeholder for the future activity; the input's placeholder hints at
  the intended pickaxe-style search ("Search for added or removed code, e.g. a
  function name…"). The compare form was split so it no longer wraps
  `<history-records>` (the compare radio boxes use `v-model`, not form
  serialization), which lets the new form be a *sibling* instead of an invalid
  nested `<form>`; the busy overlay now covers only the compare box. The search
  row uses a flex container (`.mdm-git-gui-history-search-row` in `style.css`)
  rather than a `.mdmreport-controls-group`, so the input stays inline instead
  of being stretched to `width: 100%` by the group rules.
- Added a 6th app-level tab **Tools** (`id="tools"`) as a grab-bag for ad-hoc
  ideas. It renders `apptab_tools/index.js`, which pushes `page_tools_home` — a
  data-driven list of tool "sections" — onto a `pages-site`. Each section is one
  idea; opening it calls `repoActions.createPage(h(tool.component, …))`. The
  first wired tool is "Search in history" (`app/page_tool_search_in_history/`),
  a client-side filter over `repoStatus.historyData.history` (hash/author/message)
  that loads history via `repoActions.updateHistory()` on mount. **To add a new
  idea:** create its page component (a folder with `index.js`/`style.css`) and
  push one entry into the `TOOLS` array in `page_tools_home/index.js`. Gotcha:
  the bundler resolves directory imports only with an explicit `/index` suffix
  (`import X from './page_tools_home/index'`, not `'./page_tools_home'`).
- Files endpoint (`src/frontend/endpoints_files_path.py`): the GET directory
  listing sorter now ranks unknown object types first (`0`), then directories
  (`1`), then files (`2`), so unexpected entries surface at the top instead of
  being buried last (was directories/files/other with other at `999`). Renamed
  `dir_first_key` → `type_sort_key` to match its new meaning.
- Removed `git submodule update --init --recursive` from `build.sh` (submodule
  initialization is no longer part of the build; the outer `build.sh` still runs
  the webinput submodule's own `build.sh`).
- Adopted `.clinerules/09-github-issues.md` (scan open GitHub issues and match
  them against pending changes when writing commit messages) from the sibling
  MDM-Diff-py project.
- Verified and closed issue #77 ("Clarify/refactor executeCliCommand method in
  app.js"): commit c1466e2 documents the command flags (`is_binary`,
  `is_interactive`, `attachExistingJob`) and the `cli.js` vs app-wrapper
  separation; the old method is now `_executeGitCommand` plus
  `executeGitCommand`/`executeGitAsyncCommand`/`executeGitBinaryCommand`/
  `attachToRunningCommand` in `git__execute_commands/index.js`. Closed via the
  GitHub API with a comment.
- `src/lib/webinput` submodule: added a `/assets/<name>` endpoint. Static,
  non-importable files live in `src/lib/webinput/src/endpoints/assets_static/`; a
  build-time `build_assets.py` turns them into the gitignored
  `src/lib/webinput/src/endpoints/GENERATED/ASSETS.py` (`ASSETS = {name: content}`),
  imported by `src/lib/webinput/src/endpoints/handle_assets.py`. Both `build.sh` scripts
  wire it in: the submodule's own `build.sh` runs `build_assets.py`, and the outer
  `build.sh` invokes the submodule's `build.sh` before pinliner. Smoke-tested with
  `something_to_test.txt` (temporary).
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

## Version compare page (frontend)

- `src/frontend/app_js/src/app/page_version_compare/` renders the "compare
  revisions" diff. It now shows a two-column commit-summary block
  (`.mdm-git-gui-historydiff-revision-info`) above the diff records: `Left`/`Right`,
  each with hash, author, date/time and commit message (author/date/message are
  only rendered when present, via a `hasText` helper returned from `setup`).
- Metadata is looked up from `repoStatus.historyData.history` (the same
  `git log --pretty=format:%H%x1f%an%x1f%s%x1f%ad` payload the history overview
  uses), so no extra git call is made. `worktree`/`index` are handled as
  local-only entries (label shown in full highlight, no author/date/message).
- The block stacks on narrow widths and goes `1fr 1fr` at
  `@container (min-width: 700px)`; the root `.mdm-git-gui-historydiff` gained
  `container-type: inline-size` to provide that container query.

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
  `src/frontend/template/make_html.py` (bundled) used to carry the older
  three-branch `__name__` import split, but that split never did anything for
  them: neither is an entry-point module, and the `__package__` split does not
  apply to them. They are now plain imports — `build_templates.py` uses absolute
  `src.*` imports (it always runs as a script), and `make_html.py` uses relative
  imports, keeping only its `is_in_pinliner()` dev-vs-bundle asset-sourcing
  choice (`from . import template` in dev vs
  `from .GENERATED.TEMPLATE_COMPILED import TEMPLATE` in the bundle).
- `.mdmreport-controls-group` carries negative side margins to cancel the 7px
  side padding that its `label`/`legend` children add. Only use it for that
  label+control pattern. A group holding a bare full-width control (e.g. a
  single `<input class="mdmreport-control">` or a row of `.mdmreport-control`
  buttons) must add `mdmreport-controls-group-nonegmargin`, or the negative
  margins make the control 14px too wide and any `overflow` ancestor (like the
  modal `.mdm-git-ui-modal-inner`) clips its left/right borders. Note the
  component CSS `margin: 0` overrides (e.g. in `style_bulk_restore_form.css`)
  are silently defeated: `app_form_control_adjustments.css` is emitted later in
  the bundle with equal specificity, so its `-7px` margins win — the
  `nonegmargin` class is the reliable opt-out (it has a `.mdm-git-ui-app`-scoped
  `0,3,0` override).
- Same cascade shape bites modal buttons: the generic
  `.gitgui-modal-form .gitgui-button-close` (in `modals/styles.css`) is emitted
  *after* component CSS, so its `margin: 14px auto 0 0` (the `auto` right
  margin) overrides a component's `margin: 0` and spreads sibling buttons apart
  (one left, one center). Component button overrides must raise specificity,
  e.g. `.git-repo-modal-form-bulk-restore-choose-path .buttons-confirm
  .gitgui-button-close { margin: 0 }`. This concerns the confirm/cancel *pairs*
  (bulk restore, init-paths) that still use `gitgui-button-close`; the dedicated
  bottom Close buttons now use `mdm-btn mdm-modal-close` instead.
- `myers-diff` (`repoActions.diff`) defaults to `compare: 'sequence'`: arrays are
  compared element-by-element and strings character-by-character. String
  line/word splitting is opt-in via `compare: 'lines'` / `compare: 'words'`
  (`compare: 'chars'` is an alias for `'sequence'`). `diffview.js` relies on this
  default for its array inputs; the terminal `grabAdditionsFromCommandString`
  slices `rhs` by `at`/`add`, which are character indexes under the default
  (line mode would mis-slice).

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
