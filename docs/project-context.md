# Project context

> Living document. Updated after every task. Read this first at the start of every task.

## Component & license registry (2026-11-10)

- `components-licenses.json` (repo root) is the machine-readable registry of every component with
  an author that is bundled with or used by gitgui, maintained by hand (no
  generator yet). It is intended to drive an "About / software licenses" page.
- Format: a top-level `meta` object (field legend + notes), a `components`
  array, and a short `unbundled_dependencies` array. Each component records:
  `id`, `name`, `kind` (`self-authored | fork | vendored | build-tool`),
  `bundled`, `scope`, `version`, `authors[]` (`{name, role}`), `homepage`,
  `source`, `repository` (only for forks, = the fork URL), `license`,
  `license_spdx`, `license_local` (path in repo), `license_local_kind`
  (`full-text | header-only | none`), `license_remote`, `note`.
- `components` holds 16 shipped/maintained entries (self-authored submodules +
  vendored frontend assets + the two forks). A separate short
  `unbundled_dependencies` array lists the 12 pip packages that are NOT in the
  bundle (requirements.txt = runtime, requirements-dev.txt = build/test,
  per-processor = optional): `name`, `scope`, `purpose`, `source`, `license`,
  `license_spdx` only — they ship their own license in their installed
  `.dist-info`, so no local copy is kept.
- Self-authored (author = Andrey Putilov / The-city-not-present): `gitgui`
  (the app itself), `webserve`, `webinput`, `questionnaire` (qre),
  `py_translatable_text_class`, `py_js_bundler`. All Apache-2.0.
- Forks (upstream author + Andrey Putilov as `maintainer`): `pinliner` (Gorka
  Eguileor, Copyright Red Hat 2015; build tool, NOT bundled) and `myers-diff`
  (Jamie Peabody; bundled). Both Apache-2.0. Andrey is listed as maintainer
  because the forks live in his cloned repos, have significant changes, and he
  takes responsibility for them.
- Vendored third-party frontend: `vue` 3.5.41, `vue-router` 5.4.0, `marked`
  18.0.9, `dompurify` 3.4.11, `ibm-plex-sans`, `ibm-plex-mono`, `remix-icon`
  4.9.0, `normalize-css`.
- **Compliance gap (recorded in the JSON notes):** `vue`, `vue-router`, `marked`
  and `normalize-css` (MIT) and `dompurify` (Apache-2.0 OR MPL-2.0) are vendored
  with only a short `@license` header — or, for vue-router/marked/normalize.css,
  no license text at all. The fonts and Remix Icon ship full license texts. To
  make the About page complete, vendor the missing MIT / DOMPurify license texts.
- The JSON is bundled at build time into `src/GENERATED/SOFTWARE_LICENSES.py`:
  `build.sh` pipes `components-licenses.json` through
  `build_templates.py --program bundle-json-into-py --varname _SOFTWARE_LICENSES`,
  which parses the JSON and writes the native `dict` via `repr` (approach #2 — see
  that program's docstring for the alternative "embed the literal JSON string and
  parse it at runtime" approach). `main_gitgui_program.py` imports
  `_SOFTWARE_LICENSES` directly as `software_licenses` (a structured `dict`) and
  exposes it on the config object under `software_licenses`. (2026-11-10)
- `src/GENERATED/HELP.py`'s embedded variable was renamed `_MD` → `_HELP_MSG`
  (via `build.sh --varname`, plus the imports in `main_gitgui_program.py` and
  `main_print_help.py`). (2026-11-10)
- `docs/dev-docs.md` "Vendored libraries" section now spells out the policy:
  fewer dependencies / fewer vendored libs is better, but adding one is fine when
  reasoned; static-file assets are bundled via the `GENERATED/` technique (can't
  drop a raw file into a pinliner bundle); and every vendored asset must be
  tracked in `components-licenses.json` (`kind: "vendored"`). Also added a short
  note: the running app should make no network requests to the outside internet
  (no CDNs); remote operations are user-initiated only. (2026-11-10)

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

## Build scripts & dependency split (2026-11-10)

- `build.sh` installs only **dev/build** deps from `requirements-dev.txt`
  (`rjsmin`, `csscompressor`, `python-dotenv`, `pytest`, `pytest-html`), not the
  full `requirements.txt`.
- `requirements.txt` is now **runtime-only** (`beautifulsoup4`, `python-dotenv`,
  `PyYAML`, `markdown-it-py`, `rich`, `pywebview`); it is shipped to `dist/` and
  installed by `run.sh` into the live program's own venv.
- `src/textconv/processors/*/requirements.txt` are runtime deps: `build.sh` no
  longer installs them, only copies them into `dist/optional_dependencies/` for
  `run.sh`.
- Removed dead code from `build_templates.py`: the `BeautifulSoup` import,
  `sanitize_classname`, `wrap_div`, `build_py_dist` (and its `renderers` entry).
  `sanitize` and `build_html_template` are still used (generate `TEMPLATE.py`).
- Same split in the `webinput` submodule: `requirements.txt` = `beautifulsoup4`
  (runtime); new `requirements-dev.txt` = `pytest`, `pytest-html`.
- `build.sh` also generates `src/GENERATED/SOFTWARE_LICENSES.py` from
  `components-licenses.json` (via the new `bundle-json-into-py` helper, which
  writes the parsed JSON as a native `dict`) and now names the HELP variable
  `_HELP_MSG` instead of `_MD`.


## Frontend: two ways to run

The Vue app (`src/frontend/app_js`) is served in two ways; **both must keep
working**, and both should be exercised during development when their
requirements are met.

### 1. Vite dev server (development only)

- Launched from `src/frontend/app_js` with npm: `npm install`, then
  `npm run dev`.
- Requires **Node** (see `engines` in `package.json`) **and** the Python backend
  running, because Vite serves only the frontend and proxies every API call to
  the backend.
- `vue` and `vue-router` resolve from `node_modules` (the `vue` alias in
  `vite.config.js`); `vite.config.js` proxies `/command`, `/repo`, `/config`,
  `/health`, `/files`, `/browse`, `/textconv` and `/assets` to
  `http://localhost:5180` (the backend's default port, `PORT_START_WITH`).
- This is the fast hot-reload path (and the one that enables Vitest/lint); use
  it while iterating on UI code.

### 2. Backend-served bundle (the normal/final app)

- Only the **Python backend** runs (`python -m src.launcher --program gitgui
  --working-tree <path> --git-directory-location <path>`); no Node.
- The backend renders the page (`endpoints_html_paths.py render_page_home`); its
  `<head>` maps `vue` and `vue-router` to `/assets/vendorlibs/...` via an
  **importmap** and then loads `/assets/app.js` as an ES module.
- `build.sh` produces these assets **without Node**: `py_js_bundler`
  (`src/frontend/bundler_engine/lib/py_js_bundler`) bundles `app_js` into
  `src/frontend/GENERATED/app.js`, and `vue.js` / `vue-router.js` / fonts are
  packaged into `src/frontend/GENERATED/ASSETS.py`, served at runtime by the
  `/assets/*` endpoint.

### Requirements & the both-must-work rule

- Both modes need the backend running; the backend needs the `GENERATED/`
  artifacts that `build.sh` produces (run it once after a fresh clone).
- Mode 1 additionally needs Node; mode 2 additionally needs a `build.sh` run
  whenever JS changes.
- Every JS change must work under **both** modes: JS that npm/Vite accepts must
  also pass `py_js_bundler`. When valid JS is accepted by npm but rejected by
  `py_js_bundler`, **update `py_js_bundler`** instead of bending the JS: for
  common, widespread, not-too-tricky syntax the bundler should follow standard
  JS rather than the JS being contorted to fit the still-incomplete bundler.
  Only fall back to a JS-side compromise when the construct is genuinely exotic
  and a bundler update would be disproportionately complicated.

## Releases

- Version tags are annotated and follow `vX.YYY.ZZZ` (e.g. `v0.018.000`).
- The tag message is a release note: first line is the version, then a summary
  of the changes since the previous tag, grouped by theme (Features / Streaming
  / Performance & observability / Fixes & housekeeping).
- Latest tag: `v0.019.000` (pushed to origin, points at `0beb151`).

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
- `docs/dev-docs.md` is the stable developer reference ("what each part is, why,
  how the pieces fit"); imperative rules stay in `.clinerules/`, living scratch
  notes stay here in `docs/project-context.md`.

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
  `WebserveLogger` to the events, and keeps the capped (10k) JSON-safe log in a
  local variable that is exposed through `config['iface']` as the
  `get_webserve_log_records` getter (so the live list is not serialized as part
  of the whole `config`).
- `WebserveLogger` uses the stdlib `logging` module with two handlers — INFO →
  stdout (start/request/stop), WARNING+ → stderr (errors/notices) — and
  reproduces the old coloring. The submodule documents this change in
  `src/webserver_engine/webserve/docs/maintenance-log.md`.

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
- Planned: history-sync so browser Back closes the top modal before navigating
  the page (see "Navigation & routing" below); the `await createModal` contract
  is unchanged.

## Navigation & routing (vue-router)

Decision (2026-11-08): replace the hand-rolled frontend navigation with
**vue-router v4 + `createWebHashHistory`** (hash URLs `/#/...`, so the self-written
backend needs no catch-all; refresh/deep-link/back all work).

Progress: **Phase 1+2 done** — router + `AppTabsLayout` + `app_context` are in
place, `app.js` uses `app.use(router)` + a root `<router-view>`, and the 6 tabs
are top-level child routes (`/#/home`, `/#/files`, ...) with working browser
Back/forward.
**Phase 3 done** — the Files tab is a nested route `files/:path(.*)*` (name
`files-worktree`) that maps the URL straight onto the working tree.
`page_files_local_list` reads `namespace`/`path` props (supplied by
`fileProps('worktree')` in `router.js`; the backend `/browse` namespace stays
`worktree`) and navigates via `useRouter()`; `apptab_filesview` is a plain
layout; `pane_files.js` renders the list directly (compact, `embedded`) as the
Overview pane.
**Phase 4 done** — history is nested routes: `history` (empty path → revisions
list) + `history/compare/:left/:right` (version compare) + `history/revision/:hash`
(flat `git ls-tree` file list, so "files within a revision" stays under the
History tab — matching the mental model "revisions live within history"). The
history parent route redirects to its empty-path child
(`redirect: { name: 'history-list' }`): navigating to a named parent route does
NOT match its empty-path child (only navigating by *path* does), which left the
History tab blank; the redirect fixes it. Verified live: tabs, revision files,
browser Back, and compare all work.
Note: a tab route whose default view is an **empty-path child** needs that
`redirect` on the parent (the `files` tab already had one via `files-worktree`).
**Phase 5 done** — pack + tools are nested routes too: `packstatus` (empty child
`packstatus-list` → pack-object list) and `tools` (children `tools-home` +
`tools-search-history`). The pack-object "revision" link routes to
`history-revision`. Only the Overview tab still has a vestigial
`<pages-site>`/`createPage` (its panes use `createModal`/routes now).
Also fixed a pre-existing bug in `config_check_updates` (`response` referenced
before its declaration on a non-OK HTTP response; should be `httpResponse`).
**Phase 6 done** — modals sync to browser history: on open
`router.push({ query: { modal: <stack-of-ids> } })`; on resolve/reject
`router.back()`; on browser Back a route watch rejects the top modal (non-Error
= cancel). Verified live: Back closes the modal, dismiss still returns to the
same URL.
**Phase 7 done** — removed the vestigial Overview `<pages-site>`/`createPage`,
deleted `common_components/pages/` (PagesSite) and the unused
`tabbed_panes/tabbed_panes.js` + `tabbed_pane.js` (the tab-skin `styles.css`
stays, now imported by `layout_app_tabs.js`). All tabs are nested routes;
`createPage` no longer exists anywhere in the app.
**Phase 8 done** — physical "back" button. `layout_app_tabs.js` renders a `←`
button at the head of the tab bar whenever `back_navigation.js` reports a
previous page in the current tab. `back_navigation.js` keeps a per-tab stack of
distinct *pages* (leaf route name, with the single `files-worktree` leaf treated
as one "files list" page) via `router.afterEach`; it
resets on a tab switch, ignores same-page steps (files-tree walks, modal query
changes), and pops on a back. The button calls `router.back()` (a single
browser-history step), so it can never step "up one level" inside the files tree
or undo a tab switch, and it stays coherent with the browser Back button.
**Phase 9 done** — the files list (`page_files_local_list`) is now self-contained
for tree navigation. Its `⌂`/`←`/`⇧` links never switch tabs or pages: the
component keeps its own in-tree `pathHistory` and `navigateBack` pops from it
(instead of `router.back()`), so repeated clicks only walk back within the tree.
When rendered as a pane (`pane_files.js` passes `embedded`), `path` is fully
local and never touches the router; when rendered as the Files-tab route, it
still pushes to the route so the URL keeps reflecting the tree path.
**Phase 10 done** — the Files tab URL dropped the `worktree` namespace segment
(2026-11-09). The tab is entirely for browsing real physical files in the working
tree, so `files/:path(.*)*` maps directly onto the worktree: root `/#/files`,
subpaths `/#/files/<path>`. The `files-gitdir`/`files-pack` child routes were
removed; the backend `/browse` `gitdir`/`pack` namespaces remain (used by the
disk-usage page's direct `/browse/<namespace>:` SIZE calls). `fileProps()` still
passes `namespace: 'worktree'`, so the backend resource identifier
(`worktree:<path>`) and the not-found message keep the namespace prefix.
**Phase 11 done** — history paths finalized (2026-11-09). The history tab now has
four children: `''` (revisions list), `cmp/:hash1/:hash2` (version compare,
renamed from `compare/:left/:right`), `:hash/files` (files within a revision,
renamed from `revision/:hash`), and `:hash` (new `page_revision_detail` — a
deliberately basic single-revision view showing hash/author/date-time/message,
i.e. the same info already on the list, plus a "View files in this revision"
link; it gives each revision a stable `/#/history/:hash/` URL). Static segments
(`cmp`, `files`) outrank the dynamic `:hash` in vue-router scoring and the
segment counts differ, so these routes co-exist without conflict. The compare
props map `route.params.hash1`/`hash2` → `hashLeft`/`hashRight` (the page
component is unchanged). The revisions-list "(files)" links now target
`history-revision-files`; the pack-object "Revision hash" link now lands on the
detail view (`history-revision`).

- Top-level tabs (`TabbedPanes`) become top-level child routes; the per-tab
  `PagesSite` overlay stack becomes **nested routes rendered in `<router-view>`**
  (swap-on-navigate; the browser Back button is the back navigation).
  `common_components/pages/` (PagesSite/Page) will be **deleted**.
- Route shape: `/` redirects to `home`; then `home`, `files` (child
  `:path(.*)*` → worktree list), `history` (children `''` (revisions list),
  `cmp/:hash1/:hash2` (compare), `:hash` (revision detail), `:hash/files`),
  `gitignore`, `packstatus` (child `''` → pack-object list), `tools` (children
  `''` → tools home, `search-in-history`).
- `repoStatus`/`repoActions` are now **module-level reactive singletons**
  (`app/app_context.js`), passed to route components via vue-router's route
  `props` option; the receiving components keep their existing props.
  `provide`/`inject` is an optional later simplification, not required now.
- Back-navigation re-mounts pages (fresh state, re-fetch; scroll resets to top).
  Expensive data is cached in `repoStatus` so a re-mount re-reads instead of
  re-fetching from git. Deliberately **no `<KeepAlive>`** (memory/staleness).
- Modals keep the imperative `const result = await createModal(Comp)` contract,
  and additionally get a thin history-sync: on open
  `router.push({ query: { modal: id } })`, on dismiss `router.replace` to drop the
  entry, and watch the route so browser Back rejects (non-Error cancel) the top
  modal before navigating the page.

### vue-router vendoring

- vue-router is vendored as a **pre-bundled ESM file**, not the official
  `vue-router.esm-browser.js` (which imports `@vue/devtools-api`, a multi-file
  package an importmap can't point a single bare specifier at). Rolldown bundles
  it with `--external vue`, so `@vue/devtools-api` is inlined and only `vue`
  remains a bare import.
- Source: `src/frontend/assets_vendor_libs/vue_router/vue-router.browser.js`
  (+ README with the one-time rebuild command). Flow: `build_templates.py`
  `build_resource_vue_router()` → `vendorlibs/vue-router.js` → `build.sh` →
  `ASSETS.py` `vendorlibs_vue_router_js` → served at `/assets/vendorlibs/vue-router.js`.
- Importmap in `endpoints_html_paths.py render_page_home` now maps
  `"vue-router": "./assets/vendorlibs/vue-router.js"`.
- Spike verified: minified output passes `node --check`; sole import is `vue`.
- The app code now imports `vue-router` (from `app/router.js` etc.), so add it to
  `app_js/package.json` to let `vite` dev resolve it (Node-only dev speed; the
  production build still uses the committed artifact).
- **Now v5 everywhere (2026-11-08):** `app_js/package.json` declares `"vue-router": "^5.4.0"`
  and the committed artifact `vue-router.browser.js` is re-vendored to **v5.4.0**
  (was 4.6.4). The rolldown rebuild inlines `@vue/devtools-api` **and `nostics`**
  (a new v5 dependency) and keeps only `vue` external. The app uses only stable
  APIs (`createRouter`, `createWebHashHistory`, `<router-link>`/`<router-view>`,
  named routes/redirects/catch-all params), so no app-code changes were needed.
- Vendored `vue.esm-browser.js` is Vue **3.5.41**; `package.json` allows `^3.5.40`.
  Left unchanged this task (the one prod advisory is SSR-only, app is client-side).

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

- Files list now shows the git `XY` status in the reserved indicator column
  (2026-11-10). `component_record.js` / `component_record_compact.js` already
  computed `fileStatus` (via `repoActions.checkFileStatus` / `checkFolderStatus`)
  but rendered an empty `<span class="git-status-indicator ...">`. The span now
  renders `{{ fileStatus?.index }}{{ fileStatus?.worktree }}` and gained the
  `code` class (IBM Plex Mono, matching the "changed files" popup). `style.css`
  switched the indicator from a fixed `width: 21px` to `min-width: 21px` plus
  `text-align: center; white-space: nowrap` so two chars plus the 3px side
  padding can't clip. Clean tracked files (absent from `git status`) stay empty;
  directories show the combined status via `checkFolderStatus`.

- Housekeeping in `src/main_gitgui_program.py` (2026-11-10):
  - The port helpers `_resolve_port` / `_require_port_available` (and the
    `PORT_START_WITH` default) moved out to a new `src/helper_backend_port.py`;
    the startup module now imports them instead of defining them inline.
  - `webserve_log_records` is no longer stored in `config` (which made the whole
    config serialize the up-to-10k log). It now lives in a local variable and is
    exposed as the `get_webserve_log_records` callable under `config['iface']`;
    `/perf/network` (`handle_perf`) reads it through that getter.

- Backend port is now configurable via `--config-webserver-port` (2026-11-09).
  It accepts an integer (exact port, fails with a readable error chaining the
  socket `OSError` via `raise ... from exc` if occupied), `auto` (first free
  port from the default `PORT_START_WITH=5180`, incrementing by one), or
  `auto:<N>` (same search starting at `<N>`). Resolved in
  `src/helper_backend_port.py` by `_resolve_port`/`_require_port_available`. The
  chosen port doesn't matter for the launched browser (it opens
  `http://localhost:<port>/`), but it matters for the Vite dev server, which
  hard-codes `http://localhost:5180` in `vite.config.js` — keep the backend on
  5180 (or edit that file) when using Vite. Closes issue #23.

- Narrow-screen layout fixes (2026-11-08/09, "Layout issues!!" from roadmap):
  - Overview welcome view (`apptab_welcomeview/style.css`): panes stack in a
    single column below `@media (min-width: 700px)` (was a fixed
    `repeat(2, minmax(0,1fr))` that squeezed Files + History side by side on
    phones and let their overflowing records overlap).
  - Files list (`page_files_local_list/style.css`): **one row per record at all
    widths** (never stacked). The file-path column is `minmax(0, 5fr)` and the
    path uses `overflow-wrap: anywhere`, so long names wrap instead of pushing
    the row wide; on narrow containers the size + timestamp columns are hidden
    via `@container` (`createdat` below 700px, `size`+`modifiedat` below 450px)
    using the `mdm-ui-record-col-*` classes (so files *and* directories, which
    use empty placeholder spans, both drop the column). An `overflow-x: auto`
    guard on the records grid prevents any residual spill into the neighbouring
    pane.
  - Long hashes (`format_hash/style.css`, used app-wide): now render as a
    single-line flex box with the leading (short) part fixed and the rest
    truncating with an ellipsis, so the 40-char unbreakable hash no longer forces
    the history record wider than the container; `page_revisions_list/style.css`
    gives the `.hash` field `min-width: 0; overflow: hidden; display: flex` so
    the "(files)" link stays on the same line as the truncated hash.
  - The `<meta name="viewport" content="width=device-width, initial-scale=1">`
    was added to both `template/templates/html_begin.html` (backend template)
    and `app_js/index.html` (Vite) — `initial-scale=1` fixes Firefox rendering
    the page at a wider virtual width at small window sizes.
  - Verified live in the Vite dev server and the backend-served bundle at
    ~340/360/390/600/1400px.
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
- History page full-view records are now grey "cards" (2026-11-10):
  `component_record.js` wraps each entry in `.history-record-card` (hash on the
  top line, then the commit message and its hint notes on left-aligned lines
  below, then date/time + author, with a black `ri-git-commit-line` icon before
  the hash); the compare radio buttons stay in the white left gutter, and the
  grey `#f2f2f2`/`#ececec` card starts to their right. `style.css` adds the card
  rules (8px left indent, `border-radius: 10px`, `margin-bottom: 5px`,
  `padding-top: 0`) and `min-width: 0` on both the record and the card to stop
  the grid rows from blowing out the page width on narrow screens (classic grid
  `min-width: auto` blowout). The hash is now the clickable "view files" target
  (`.hash.hash-link`, removed the old "(files)" link): on hover it turns green
  (`--mdm-color-green`) and is underlined (applied to `.mdmreport-role-hash`'s
  `.hash-leading`/`.hash-rest`, because `text-decoration` on the flex `.hash`
  doesn't propagate through the atomic inline-flex hash box). The commit
  message is now plain black text (no box) prefixed with a
  `ri-chat-quote-line` icon; the date/time + author line uses a `ri-time-line`
  icon and a `ri-quill-pen-line` icon in standard size/color. The hint note is
  a sibling stuck just below the hash (2px), and a ~15px gap separates the
  hash/hint block from the commit message and the date/author line (applied
  even when a record has no hint). The compact
  view (welcome page) is untouched and still verified.
  The worktree/index pseudo-records keep their assigned `timestamp` in the data
  (so sorting/filtering still works), but the "date/time + author" line is only
  rendered for real commits (`v-if="!isWorktree && !isIndex"` in
  `component_record.js`) — the dummy time is not shown. These pseudo-records
  only appear in the full history view: the compact view doesn't inject them,
  and the version-compare view already sets `timestamp: null` for them.
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
- Files endpoint — `/browse/` contract: HTTP 404 now means specifically
  "resource not found" and nothing else. GET/DOWNLOAD/SIZE return 404 (JSON
  `{status, error}`) when the resolved path does not exist (GET used to fail with
  a 503 from `FileNotFoundError` in `FileInfo.__init__`), and SIZE on a
  non-directory now returns 400 instead of 404. The files view
  (`page_files_local_list/index.js`) treats a 404 as an expected user-facing
  state: it renders `Path not found: <namespace>:<path>` in place of the file
  list (the notice keeps the global `.error` class for semantics but overrides
  its color to black via `.mdm-git-gui-fileslistview-notfound`), and it does
  **not** call `logError` or re-throw for a 404 — other failures still propagate
  to the top-level handler/console. Covered by `tests/test_endpoints_files_path.py`.
- Files endpoint — `/browse/` resource size is now requested with a `HEAD`
  request: the response carries `X-Resource-Size` in a header (file → its own
  size; directory → recursive size), with an empty body. Reason: the Node.js HTTP
  server that Vite's dev server is built on rejects non-standard methods
  (`SIZE`, `DOWNLOAD`, …) with a 400 at the llhttp parser layer, *before* Vite's
  proxy middleware runs (Node only accepts a fixed method allow-list; the
  `insecureHTTPParser` flag does not change that), so size can't be carried by a
  custom `SIZE` method in npm dev. HEAD is standard (works through Node/Vite) and
  is not otherwise used by `/browse` (HEAD is used only by `/health` and the
  `/repo/...` existence checks). The legacy `SIZE`/`DOWNLOAD` methods are kept for
  direct-backend compatibility. The pack-statistics view
  (`page_pack_list_objects/component_statistics_pane.js`) now sends
  `HEAD /browse/{pack|gitdir|worktree}:` and reads the `X-Resource-Size` header.
  Covered by `tests/test_endpoints_files_path.py`.

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

## Job memory monitoring (`cli_proxy_caller/perf.py`)

- `get_jobs_perf_stats()` returns a JSON-safe per-job + total memory-footprint
  snapshot of `context.jobs`, exposed via the `/perf` endpoint tree
  (`handle_perf` in `src/frontend/endpoints_app_path.py`, route in
  `src/endpoints.py`): `/perf` lists resources, `/perf/cli_jobs` serves the job
  stats, and `/perf/network` serves the `get_webserve_log_records` getter from
  `config['iface']`.
- `deep_size` is a stdlib-only deep-size estimator: it walks containers,
  dataclass `__dict__`/`__slots__`, and — crucially — function `__closure__`
  captures, because a `stdout_reader` closure is where buffered output (e.g. a
  `subprocess.run(capture_output=True)` result) is pinned. It never walks
  `__globals__`/`__class__`.
- It measures *footprint*, not *throughput*: child-process memory (`Popen`) and
  kernel pipe buffers are counted only as their small Python wrappers; total
  bytes passed through a stream would need an instrumented counter, not a
  snapshot.
- `BytesIO` already reports its buffer via `getsizeof`; only `memoryview` needs
  `nbytes` added. `str`/`bytes`/`bytearray` payloads are exact.
- No-retention guarantee: measuring returns only ints/strings and holds refs only
  for the duration of the call, so it can't extend a job's lifetime (covered by
  `tests/test_cli_proxy_caller_perf.py`).
- Improvement in `handle_run_cli_command.py`: the binary reader now caches a
  single `BytesIO` and captures only the buffer (not the whole `subprocess.run`
  result), so the raw `result.stdout`/`result.stderr` bytes are released when the
  handler exits instead of being pinned by the reader closure.

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
- When force-updating an annotated tag (`git tag -f -a <tag> <object>`), the
  `<object>` must be the **commit** hash, not the tag object hash. `git rev-parse
  v0.018.000` returns the *tag object* id; use `v0.018.000^{}` (or `^{commit}`)
  to peel to the commit. Pointing a tag at another tag object makes a nested
  "tag of a tag", so `git show` prints both messages. (2026-11-08: `v0.018.000`
  was un-nested to commit `9204694` and force-pushed.)
- The record-grid system (`common_components/css_grid/styles.css`) is
  **mobile-first but only half-automatic**: `.mdm-ui-records` is `1fr` (single
  column) by default and becomes a multi-column `max-content` grid at
  `@container (min-width: 500px)`. Each `.mdm-ui-record` is a `subgrid` spanning
  `1 / -1`, and fields are placed by the `.mdm-ui-record-col-N` classes. But the
  `col-N` placement is **not** collapsed on narrow containers by the shared CSS —
  each list's own stylesheet must override the fields to `grid-column: 1 / -1`
  inside a narrow `@container` query, and must gate its multi-column
  `grid-template-columns` behind a wide `@container` query (an *unconditional*
  multi-column rule makes the subgrid always that wide, so the `col-N` fields
  stay on one row and overflow). Two valid narrow-container strategies:
  (a) stack fields with `grid-column: 1 / -1` in a narrow `@container` query
  (history list does this at 900px), or (b) keep one row but `display: none` the
  size/timestamp columns in a narrow `@container` query and give the flexible
  column `minmax(0, …)` + `overflow-wrap: anywhere` so its text wraps (the files
  list now uses this). `page_files_within_revision_list/style.css` still has the
  unconditional-grid anti-pattern (see roadmap "Layout issues!!").
- `filter_records_form` pagination: `.nav-page` buttons carry `-5px` vertical
  margins to keep the page row compact, so the old `gap: 7px` on
  `.pagination-page-indices` collapsed to a **-3px overlap** on wrapped rows
  (7 − 5 − 5). Fixed by splitting the gap into `column-gap: 7px` +
  `row-gap: 17px` (17 − 5 − 5 = a 7px visible gap matching the horizontal one).

## npm / frontend dependency review (2026-11-08)

- The recurring `npm warn EBADENGINE` blocks (json-parse-even-better-errors,
  npm-normalize-package-bin, which, read-package-json-fast + npm-run-all2@9) all
  shared one root cause: **Node 25 is a non-LTS odd release** (EOL since ~June 2026).
  npm 11's own deps and `npm-run-all2` v9 declare `^22.22.2 || ^24.15.0 ||
  >=26.0.0` — even/LTS lines only, so 25.x is excluded. **Decided: develop on Node
  26** (the even "current" line; LTS in Oct 2027). Four of the five were
  npm-internal (not project deps); only `npm-run-all2` is a project devDependency.
- `npm audit`: 20 findings (13 moderate / 6 high / 1 critical) are **all
  dev/build-tooling-only** (Vite, Vitest, ESLint, jsdom, js-beautify, …), never in
  the shipped Python bundle. `npm audit fix` (non-breaking) would clear
  high/critical + most moderate; the remaining `minimatch`/`glob` moderate DoS has
  no patched release compatible with eslint/js-beautify's `minimatch < 11.0.1`
  pins (patched is 11.0.1). Do not run `npm audit fix --force`. (Left as an
  optional follow-up; not applied yet.)
- The only prod-adjacent advisory is Vue's `@vue/server-renderer < 3.5.42` XSS;
  the app is client-side-only (no SSR), so it is not reachable.

## Rule additions

- 2026-11-09: added `12-user-facing-language.md` — user-facing text (UI copy and
  help `.md` files) must avoid programmer-specific words ("code", "functions",
  "source") and stay file-agnostic, because Git is used on any kind of file, not
  just code. Git's own domain terms ("commit", "hash", "branch", "merge") stay.

## Dev docs & three launch modes (2026-11-09)

- Created `docs/dev-docs.md` — the stable developer reference (the "how the app
  is put together" doc), consolidating the wishlist that was
  `docs/ideas-dev-docs.md` (since deleted). Moved "Templating (no Jinja2)" and
  "rules vs the Zen of Python" from this file into `docs/dev-docs.md`, and
  linked `docs/dev-docs.md` from the README.
- Added `if __name__ == '__main__': main()` guards to
  `src/main_gitgui_program.py` and `src/main_gitgui_project_selector.py` so the
  "direct module invocation" launch mode (`python -m src.main_gitgui_program …`)
  actually works — matching the sibling-project pattern documented in
  `MDM-Diff-py/docs/architecture.md` ("Three ways to launch a program").
- Updated `.clinerules/02-frontend-build.md` with the dual-run-mode rule
  (during frontend-only iteration, verify with the Vite dev server and do not
  re-run the bundler on every change).

## Tabs focus outline & underline (2026-11-09)

- The app's top tabs (`Overview/Files/History/…`) are `<router-link>`s wearing
  `.mdm-ui-tabbed-panes-button`, skinned by
  `src/frontend/app_js/src/common_components/tabbed_panes/styles.css`
  (`.mdm-ui-tabbed-panes-head > *`). The dotted focus outline on click came from
  `normalize.css`'s `a:focus { outline: thin dotted; }`, not from a UA default.
- Fixed with a scoped rule in that same styles.css:
  `.mdm-ui-tabbed-panes-head > *:focus:not(:focus-visible) { outline: none; }`.
  It removes the dotted ring for mouse-click focus but keeps it for keyboard
  navigation (`:focus-visible` still matches on Tab, so `a:focus` still applies).
  Verified against the running Vite dev server: click → `outlineStyle: none`;
  Tab → `outlineStyle: dotted`.
- Also added `text-decoration: none` to `.mdm-ui-tabbed-panes-head > *` so the
  tab links are no longer underlined (the underline was the UA
  `a:-webkit-any-link { text-decoration: underline }` default).

## GitHub issue #13 closed (2026-11-09)

- Closed "Work on better bundler, and test it" (#13) with a comment linking to
  the last `py_js_bundler` submodule bump in this repo:
  `f0494765ba781e0813721702683252f5f6b61d87` ("Bump py_js_bundler submodule to
  full ES import/export support", 2026-10-29, on `origin/main`; no later bumps).
  Rationale recorded in the comment: the bundler may not be final, but keeping
  the issue open no longer helps — reopen (or file new) if something genuinely
  breaks.
- Gotcha for future GitHub API work from this machine: there is a working
  `github.com` credential for `The-city-not-present` in the macOS keychain,
  readable via `git credential fill` (`protocol=https\nhost=github.com`). The
  system Python 3.13 (`/Library/Frameworks/...`) fails TLS cert verification
  (`CERTIFICATE_VERIFY_FAILED`), so call the API with `curl`, not
  `urllib.request`.
- Gotcha: the helium-devtools MCP drives its own Chrome instance (separate from
  the user's "main" Chrome), so a GitHub login in the user's browser is not
  visible to the MCP browser — cookies are not shared.


## List pagination: URL vs keep-alive (2026-11-09)

- Task "Rework pagination so it is reflected in url" (docs/roadmap.md) was
  explored and **rejected in its literal form**. A page number is a *derived*
  value (a function of the active filters + sort field/order + records), so a
  bare `?page=N` in the URL is incoherent: reloading/sharing it shows "page N"
  of a *different* filter/sort than the one that produced it. Making it truthful
  requires also encoding filters+sort, which conflicts with fast, transient
  filter typing (history spam / per-keystroke URL churn), and it scales badly to
  pages with several filter/sort panes.
- **Decision: the address bar encodes content identity (path, revision hash,
  compare pair) only. Transient view state (filters, sort, page) stays out of
  the URL.** The actual requirement — "show content at the same place when the
  user returns to a previous page" — is solved by keeping the component instance
  alive across navigation with Vue's built-in `<keep-alive>`, not by URL state.
- Implemented with the **`v-slot` + `<component :is>`** keep-alive form (state
  lives in the component instance, so filters/sort/page are restored exactly;
  zero changes to `filter_records_form`; uniform for any number of filter/sort
  components):

  ```html
  <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" />
    </keep-alive>
  </router-view>
  ```

  Files touched:
  - `src/frontend/app_js/src/app/layout_app_tabs.js` (tab-level router-view:
    preserves each tab's whole subtree across tab switches, incl. welcome panes)
  - `src/frontend/app_js/src/app/apptab_filesview/index.js`
  - `src/frontend/app_js/src/app/apptab_historyview/index.js` (the key one:
    revisions list ↔ revision detail / compare / files-within-revision)
  - `src/frontend/app_js/src/app/apptab_tools/index.js`
  - `src/frontend/app_js/src/app/apptab_packcompression/index.js`
  The app.js root `<router-view>` is intentionally NOT wrapped (it only toggles
  RepoInitView ↔ AppTabsLayout).
- **Critical gotcha: the naive `<keep-alive><router-view/></keep-alive>` form
  does NOT work.** Vue Router's `RouterView` renders the matched component
  *inside* itself, so that form caches the `RouterView` instance (not the page)
  and page state is lost. This was the first attempt and it failed (reported
  2026-11-09: History page 3 → revision files → Back landed on page 1). The
  `v-slot="{ Component }"` + `<component :is="Component">` form makes the matched
  component keep-alive's direct child, which is what makes caching work. The
  vue-router deprecation diagnostic `VUE_ROUTER_R0060` fires for the naive form.
- Gotcha: do **not** key a keep-alive'd `<router-view>` by `$route.fullPath`.
  The files tree walk changes fullPath on every folder step while staying on the
  same `files-worktree` component; a fullPath key would spawn one cached instance
  per folder. Params-only changes already reuse the same component instance (that
  is why `page_files_local_list` watches `props.path`), and each routed leaf is a
  distinct component, so no `:key` is needed — keep-alive caches by component.
- Lifecycle note: kept-alive components fire `onActivated` (not `onMounted`) on
  return, so list data is not re-fetched on back-nav. This is the desired
  instant-restore behavior; add an `onActivated` refetch later only if data can
  go stale while the instance stays alive.
- Verified: 54/54 frontend unit tests pass, plus a new
  `src/frontend/app_js/src/app/keep_alive_router.test.js` regression test proving
  the `v-slot` keep-alive pattern preserves page-local state across navigation;
  `npm run build` (Vite) passes; a fresh `./build.sh` (py_js_bundler + pinliner)
  passes and the regenerated `src/frontend/GENERATED/app.js` /
  `dist/gitgui_bundle.py` contain the 5 `v-slot` keep-alive wrappers.

## markitdown dependency pin (2026-11-10)

- `src/textconv/processors/markitdown/requirements.txt` now pins
  `markitdown[pdf,xlsx,docx,pptx,xls,outlook]>=0.1.8`.
- Reason: older versions threw `UnicodeDecodeError: 'ascii' codec can't decode
  byte 0xe2 …` when converting UTF-8 text files — markitdown wrongly guessed an
  ASCII charset for long files. Fixed in 0.1.8
  (microsoft/markitdown PR #2360, "Mitigate UnicodeDecodeError due to wrong
  ASCII charset guess for long files").
- Gotcha: `xlrd` is **not** a valid markitdown extra (0.1.8/0.1.9
  `provides_extra` = all, audio-transcription, az-content-understanding,
  az-doc-intel, docx, outlook, pdf, pptx, xls, xlsx, youtube-transcription).
  The old line listed `xlrd` standalone; it was removed because the `xls` extra
  already pulls in `xlrd` (and `pandas`). Don't re-add a bare `xlrd` extra.


## History pages refetch on param change (2026-11-10)

- Bug: after the vue-router + keep-alive adoption, the history pages that fetch
  per-revision data — `page_version_compare` (diff records), `page_files_within_revision_list`
  (file list) and `page_revision_detail` (history reload) — only fetched in
  `onMounted`. Because `layout_app_tabs.js` / `apptab_historyview/index.js` wrap
  their `<router-view>` in `<keep-alive>` (see "List pagination: URL vs keep-alive"),
  navigating between two `cmp/:hash1/:hash2` pairs (or two `:hash`) reuses the
  same kept-alive component instance: `onMounted` does not re-fire, so the first
  fetch's result stayed on screen for every subsequent pair. Symptom: the
  version-compare page always showed the same one-file diff (`docs/project-context.md`)
  no matter which hashes were selected.
- Fix: replace the `onMounted` fetch with a `watch` on the hash prop(s) using
  `{ immediate: true }`, and reset the stored data (`changedFiles`/`filesList`) to
  `null` before refetching so the "Querying data…" state shows instead of stale
  rows. `watch` on route-derived props is the same pattern already used by
  `page_files_local_list` (`watch(() => props.path, …)`); the list views that must
  stay instant-restored are unaffected because they are separate components and
  keep-alive caches them by component.
- Note: `page_revision_detail` was technically already reactive (its `revision`
  is a `computed` over `props.hash`), but its `updateHistory()` reload was still
  mount-only, so it got the same `watch` for consistency/freshness.
- Tests added (Vitest): `page_version_compare/index.test.js`,
  `page_files_within_revision_list/index.test.js`,
  `page_revision_detail/index.test.js` — each asserts the fetch command is issued
  again after the hash prop changes. Full frontend suite: 58/58 pass.


## Files-within-revision page shows author/date/message (2026-11-10)

- `page_files_within_revision_list` (route `/#/history/:hash/files`) now shows the
  revision's date/time, author and commit message on three plain lines under the
  "View files from revision …" line — no box/border, just a `15px` bottom margin
  and `30px` (modular `--mdm-space`) left padding via `.revision-info`; the
  `.description` row's default `1em` `<p>` margin is reduced to `2px`. It reuses
  the same data source as `page_revision_detail`:
  a `revision` computed over `repoStatus.historyData.history` plus a
  `watch(() => props.hash, …)` that calls `repoActions.updateHistory()` (immediate),
  so deep-linking straight to the page loads history first. `component-format-datetime`
  renders the date/time; labels match `page_revision_detail` ("Date/time:",
  "Author:", "Commit message:").
- The revision lookup is an exact full-hash match (history records store `%H`),
  same as `page_revision_detail` — a short-hash deep link does not resolve the
  info (and won't show the three lines).
- Tests: `page_files_within_revision_list/index.test.js` gained a second case
  asserting the labels/values render; both cases stub `component-format-datetime`
  (Vue resolves template-referenced components even inside a false `v-if`, so the
  stub is required to keep output clean). Full frontend suite: 59/59 pass.

## Vendored Remix Icon webfont (2026-11-10)

- Added the **Remix Icon v4.9.0** webfont as a third vendored font, alongside
  `ibm-plex-sans` / `ibm-plex-mono`, so the UI can use `ri-*` icon classes.
  Source: `https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/`.
- Files live in `src/frontend/assets_vendor_libs/fonts/remixicon/`: only the
  runtime set is vendored — `remixicon.css` (linked in the HTML `<head>`) plus
  the five font files the CSS references (`remixicon.eot`, `.woff2`, `.woff`,
  `.ttf`, `.svg`) — together with `LICENSE.txt` and `README.md` (author/attribution
  info). The preprocessor sources (`.less`, `.module.less`, `.scss`, `.styl`),
  `remixicon.glyph.json` and `remixicon.symbol.svg` are intentionally **not**
  vendored: they are not referenced by the CSS and would add ~7.5 MB of dead
  weight (the glyph json alone is ~4.6 MB).
- License: **Remix Icon License v1.0** (effective Jan 2026), per the upstream
  `License` file and the CSS/README headers. Note the npm `package.json` still
  says `"license": "Apache-2.0"`; the authoritative terms are the `License` file
  shipped in the package (v1.0). Attribution is optional but appreciated
  ("Icons by Remix Icon (https://remixicon.com)"). Authors: Remix Design
  (`https://remixicon.com`, `https://github.com/Remix-Design/RemixIcon`);
  contributors Wendy Gao and Jimmy Cheung.
- Pipeline (mirrors the existing font flow): `build_templates.py` gains
  `build_resource_fonts_remixicon()` which `scan_folder`s `fonts/remixicon` and
  emits `vendorlibs/fonts/remixicon/_ASSETS_BUNDLED_PY.py` defining
  `_ASSETS_VENDORLIBS_FONTS_REMIXICON`; `build.sh` concatenates that file into
  `GENERATED/ASSETS.py`; `endpoints_assets_delivery_path.py` imports it and maps
  `^/vendorlibs/fonts/remixicon/.*` to a binary renderer; the CSS is linked from
  `endpoints_html_paths.make_default_assets_list` and `app_js/index.html`.
- MIME fix: `detect_content_type` in `endpoints_assets_delivery_path.py` now
  returns `font/woff2`, `font/woff`, `font/ttf`, `font/otf`,
  `application/vnd.ms-fontobject` and `image/svg+xml` for the corresponding
  extensions. Previously all fonts were served as `text/plain`, which Firefox
  rejects for `@font-face`. This also fixes the two existing IBM Plex fonts.
- Gotcha: `remixicon.css` references its fonts with a cache-busting query
  (`url('remixicon.woff2?t=1769486070745')`). The asset renderer strips the query
  via `urlparse(...).path`, so the dict key `remixicon.woff2` matches and no CSS
  rewrite is needed.
- Icon swaps (2026-11-10): replaced ad-hoc text glyphs with `ri-*` classes.
  `{}` (view file / view files) → `ri-file-text-line` (first `ri-file-code-line`,
  then changed to the lighter/more neutral `file-text`); the compact history
  record's "View files" link was later changed again from `ri-file-text-line` to
  `ri-folder-open-line` (`page_revisions_list/component_record_compact.js`);
  download `⇩` →
  `ri-folder-download-line`; files-list breadcrumb `⌂` → `ri-home-4-line` and
  navbar `←` / `⇧` → `ri-arrow-left-line` / `ri-arrow-up-line`; global back
  button `←` → `ri-arrow-left-line`. The breadcrumb home glyph was a template
  *data* value (`pathNode: '⌂'`, rendered via `{{ ... }}`), so it now carries an
  `isHome: true` flag and the template renders an `<i>` for home and
  `{{ piece.pathNode }}` otherwise. Affected files:
  `page_files_local_list/index.js` + `component_record{,_compact}.js`,
  `page_files_within_revision_list/component_record.js`,
  `page_revisions_list/component_record_compact.js`, `layout_app_tabs.js`.
- Accompanying CSS (2026-11-10): `.mdm-git-gui-fileslist-breadcrumbs` now uses
  `flex gap: 4px` instead of the 4px side padding + `-4px` side-margin trick
  (`.item` horizontal padding removed). `.mdm-git-gui-fileslist-navbuttons .navbtn`
  switched to `text-align: left` + zero horizontal padding so the first icon sits
  flush with the left edge. The files-record view/download glyph links
  (`.link-view-file > a`, `.link-download-file > a` in both
  `page_files_local_list/style.css` and `page_files_within_revision_list/style.css`)
  dropped their `1px solid #e0e0e0` border and are now flex-centered 21px boxes
  whose `<i>` is `font-size: 18px; line-height: 1` (bigger glyph, same footprint).
  Their `:hover` color is now `var(--mdm-color-green)` (the app's primary green
  `#385`) instead of `#223077`. The global back button (`layout_app_tabs.js`) is
  now `ri-arrow-left-circle-line`, nudged a touch bigger via
  `.mdm-git-gui-tabbed-panes-back i { font-size: 1.1em }`.
- Breadcrumb follow-up (2026-11-10): the files-list breadcrumb
  (`page_files_local_list/index.js` + `style_breadcrumbs.css`) now (1) hides the
  home glyph when it is the only element at root — via a `--at-root` modifier on
  the container that sets `visibility: hidden` so the row still reserves its
  vertical space (no content jump when deeper chains appear) — and (2) renders
  the current leaf (the directory we are in) as a non-clickable
  `<span class="item item-current">` instead of an `<a>`, keeping it black
  (`#111`) with `cursor: default` and no green hover. Ancestors (home +
  intermediate dirs) stay clickable `<a>`s and keep the green hover + pointer
  cursor.
- Pagination hover (2026-11-10): the page-number hover color in
  `filter_records_form/styles.css` (`.mdm-ui-recordsfilter-pagination
  .pagination-page-indices .nav-page:hover`) was changed from purple
  (`#7067ff`) to the app's primary green (`var(--mdm-color-green)`, `#385`),
  matching the other green hovers.
- Purple scheme removal (2026-11-10): the `--mdm-color-primary` (`#6670bb`)
  token was dropped from `common.css` and all of its consumers moved off purple.
  `.mdm-btn-primary` (the Tools "Open" button) is now green
  (`--mdm-color-green` + `--mdm-color-green-hover`); `.mdm-btn-link`, the header
  nav links (`project_specific.css`) and `.view-files-button`
  (`page_revisions_list/style.css`, `page_revision_detail/style.css`) now use
  the link color (`--mdm-color-link`); and the checkbox/radio `accent-color` is
  now neutral grey `#666`. Links stay on the `--mdm-color-link` /
  `--mdm-color-link-hover` blue family. The `#5560a8` btn-primary hover shade was
  removed too.
- Link color finalized to blue (2026-11-10): `--mdm-color-link` is now
  `#2c68c5` and `--mdm-color-link-hover` is `#66a1fa` (the purple
  `#6c78ff` / `#4d56cc` pair is gone), and the now-redundant
  `--mdm-color-blue` / `--mdm-color-blue-hover` tokens were removed
  (`.mdm-link-blue` now follows the link color). Hardcoded blue/purple link
  colors were normalized to the link tokens: the diff-view "calc diff" button
  (`styles_diffview.css`, `#4950f0`/`#7080ff`) and the bulk-restore link hover
  (`style_bulk_restore_form.css`, an invalid `454090`). Link hovers that had
  drifted to green were moved to the new link-hover blue: `.mdm-btn-link:hover`,
  header nav hover, and revision-detail "View files" hover. The green hover on
  the history/file-list action glyphs (hash, view/download icons, breadcrumbs)
  was left as-is — those are deliberate green affordances, not blue/purple links.
- History "view files" icon (2026-11-10): the compact history record's
  `.ri-file-text-line` icon (`page_revisions_list/style.css`) was brought in line
  with the files-view "view"/"download" glyphs: the `.viewfiles` box lost its
  `1px solid #e0e0e0` border/border-radius, the `.view-files-button` is now a
  21×21 flex-centered box with an 18px icon (`font-size: 18px; line-height: 1`),
  and its color is black by default and green (`--mdm-color-green`) on hover
  (cursor pointer).

