# Dev docs

> Stable developer reference for `gitgui`. It explains **what** each part is,
> **why** it exists, and **how** the pieces fit together. It is not updated every
> run: imperative rules live in `.clinerules/`, and living working-memory
> (decisions, findings, in-progress state, roadmap) lives in
> `docs/project-context.md`. If a statement here contradicts a rule, the rule
> wins; if it contradicts `docs/project-context.md`, this file wins (it is the
> stable intent).

## What lives where (the doc map)

| Doc | Role |
| --- | --- |
| `docs/dev-docs.md` (this file) | Stable "how the app is put together" reference. |
| `.clinerules/*.md` | Imperative rules (imports, frontend/build, testing, style, JS, CSS, dates, commits, optional deps, submodules, user-facing language, …). |
| `docs/project-context.md` | Living scratch notes — updated every agent run, never "stable". |
| `docs/streaming-jobs.md` | Canonical reference for the job/pipe model. |
| `docs/textconv.md` | Canonical reference for the textconv subsystem (header contract, hash, wiring). |
| `docs/maintenance-log.md` | Cross-project structural notes shared with sibling projects. |
| `docs/roadmap.md` | Plans / reminders / things to consider. |
| `src/frontend/template/templates/common.css.changelog.md` | Changelog for the global CSS skin. |
| `src/cli_proxy_caller/README.md` | What's specific to the job subsystem (modules, memory monitoring). |

## The app at a glance

`gitgui` is a self-contained git GUI: a Python backend (self-written webserver,
no Flask/Django) plus a Vue frontend written as plain `.js`/`.css` (no
`.vue`/`.ts`). The distributable is a single `dist/gitgui_bundle.py` produced by
`build.sh` via `pinliner`; runtime assets are embedded as `GENERATED/` Python
modules.

- **Backend** (`src/…`):
  - `src/launcher.py` — universal dispatcher (`--program <name>`).
  - `src/main_gitgui_program.py` — the gitgui program: builds the `config`
    object, registers postprocessors, starts the webserver.
  - `src/main_gitgui_project_selector.py` — the project selector.
  - `src/cli_proxy_caller/` — runs CLI commands / Python functions as *jobs* and
    chains them into *pipes*.
  - `src/output_postprocessors/` — pure-Python pipe participants (`tar`,
    `textconv`).
  - `src/textconv/` — textconv: type detection + per-format processors.
  - `src/frontend/` — HTTP endpoints, HTML templates, and the Vue `app_js`.
- **Frontend** (`src/frontend/app_js/`):
  - `src/app/` — pages/tabs/windows (one folder per view).
  - `src/common_components/` — reusable, uniform components.
  - `src/common_app_features/` — app-setup "features" (see below).
  - `src/common_defs/` — Vue-agnostic shared definitions (`cli.js`, concurrency).
  - `src/lib/` — vendored libs (`myers-diff`).
- **Submodules**: `src/webserver_engine/webserve` (webserver),
  `src/frontend/bundler_engine/lib/py_js_bundler` (JS bundler),
  `src_dev_build/lib/pinliner` (bundling), `src/lib/webinput` (project-selector
  input UI).

## Three ways to launch a program

Any entry-point program can be started three equivalent ways:

1. **Single-file bundle** (distribution). `pinliner` bundles the tree with a
   `--main src.launcher --main-attr main` entry point:

   ```sh
   python dist/gitgui_bundle.py --program gitgui --working-tree <path> --git-directory-location <path>
   ```

2. **Direct module invocation** (development). Run the starter module with `-m`
   (each starter module carries an `if __name__ == '__main__':` guard):

   ```sh
   python -m src.main_gitgui_program --working-tree <path> --git-directory-location <path>
   python -m src.main_gitgui_project_selector --projects-file <file>
   ```

3. **Launcher proxy** (development). Run the universal dispatcher with `-m`:

   ```sh
   python -m src.launcher --program gitgui --working-tree <path> --git-directory-location <path>
   python -m src.launcher --program project-selector --projects-file <file>
   ```

These three modes are **not** a 1:1 map of the import split. The import split
(`__package__`-keyed relative vs flat imports) is orthogonal: it is how a module
selects its imports, while the modes above are how you *start* a program.

## The backend `config` object

`src/main_gitgui_program.py` builds a single `config` dict and passes it down to
every endpoint handler and feature. It is the central storage used to hand data
and callables down to deeper modules:

- **Data**: `working_tree`, `git_directory`, `http_*`, `script_version`,
  `app_config`, `info`, `warnings`, `gitignore_presets`, `help_pages`, …
- **Callables/classes** live under `config['iface']` so endpoints can reach the
  job subsystem, the webserver primitives, and the textconv/postprocessor
  surface without importing from the top level: `cli_command_initiate`,
  `cli_initiate_from_function`, `cli_command_get_job`,
  `cli_command_get_job_stdout_reader`, `cli_command_terminate_job`,
  `get_jobs_perf_stats`, `get_webserve_log_records`,
  `WebResponse`/`HTTP403`/`HTTP404`, `textconv_from_data`,
  `textconv_from_stream`, `output_postprocessors`.

The "one big grab-bag" role is acknowledged as not ideal and is tracked for
review (see `docs/roadmap.md`).

The frontend has its own equivalent: `repoStatus` (reactive data) and
`repoActions` (reactive callables) are module-level singletons in
`src/frontend/app_js/src/app/app_context.js`, populated by the
`common_app_features` setup functions and passed to route components through
vue-router's `props` option.

## CLI processors, jobs, and pipes

Every CLI command the app runs goes through `src/cli_proxy_caller`, which
executes it as a **job** — not a blocking call. Jobs are designed to be chained
into **pipes**, where each participant consumes the previous participant's
output (e.g. `textconv` and `tar` follow a producer and read from its stdout).

The canonical reference is `docs/streaming-jobs.md`. In short:

- A **job** has an id, a status (`fresh → running → done/error`), and optionally
  a streamed stdout reader. The frontend never waits synchronously; it polls a
  promise.
- Three job kinds, identical from the frontend's point of view:
  1. **sync** — `subprocess.run(capture_output=True)`
     (`job_task_processors/handle_run_cli_command.py`). No status updates until
     done; stdout captured whole.
  2. **interactive / async** — `subprocess.Popen(stdout=PIPE, …)`
     (`job_task_processors/handle_interactive_command.py`). stdout is a live
     pipe you can stream/redirect.
  3. **pure-Python function** — `fn(stdin, stdout, stderr, *args)`
     (`job_task_processors/handle_task_from_function.py`), used by
     `output_postprocessors` (`tar`, `textconv`).
- **Golden rule: consume before await.** Start draining the next participant
  *before* awaiting the current one's completion, else the producer fills its OS
  pipe buffer and deadlocks. Await all promises together at the end.

## Memory: streaming-first, then monitor

All processing inside jobs must **stream where possible**. For `sync` jobs this
isn't always possible (they use `subprocess.run`), but still prefer a streamed
approach whenever you can, so big chunks of binary data never have to sit in
memory as one Python object.

The job subsystem ships a live memory **footprint** snapshot — not throughput —
in `src/cli_proxy_caller/perf.py`. `get_jobs_perf_stats()` walks the object
graph reachable from `context.jobs` (including function closure captures, which
is where a `subprocess.run` result would be pinned) and returns a JSON-safe
per-job + total byte count, flagging any field above a per-field threshold
(default 1 MiB). It is exposed over HTTP so the frontend can request it:
`/perf` (index), `/perf/cli_jobs` (job stats), `/perf/network` (webserve log
records). See `src/cli_proxy_caller/README.md` for the exact shapes and the
"what it does / does not measure" contract.

## Frontend patterns

### `cli.js` vs `git__execute_commands`

- `src/frontend/app_js/src/common_defs/cli.js` is intentionally **Vue-agnostic**:
  it imports no Vue and defines only the raw job contract (start a backend
  command, poll it, stream/pipe its output). Use it anywhere you need the job
  primitive without app concerns.
- `src/frontend/app_js/src/common_app_features/git__execute_commands/index.js`
  (`useGitCommands`) is the **app-facing wrapper** around `cli.js`: it adds the
  Vue-reactive command log, a concurrency semaphore, and the friendly entry
  points `executeGitCommand` / `executeGitAsyncCommand` /
  `executeGitBinaryCommand` / `attachToRunningCommand`.

The behavior is controlled by flags (documented on `_executeGitCommand`):

- `is_binary` (snake_case) — text vs bytes output. Kept snake_case on purpose:
  it is forwarded to the backend as a query param and the job JSON round-trips
  the same names.
- `is_interactive` (snake_case) — the most important flag: it changes the
  **return shape**. `false` → returns the final result; `true` → returns the
  live job object immediately (await `jobData.promise` for the final result).
- `attachExistingJob` (camelCase) — instead of starting a fresh job, adopt an
  existing `job_id` under the same job-object contract. Used for pipe pieces,
  where the piped job id comes from attaching a consumer with a `PUT` request.
- `parentJobId` (camelCase) — frontend bookkeeping only: links a pipe
  participant's log record to its producer.

Convention (not a hard rule): text (`is_binary=false`) is called sync
(`is_interactive=false`), binary (`is_binary=true`) is called async/streamed
(`is_interactive=true`).

### vue-router

The SPA is a single Vue app routed with vue-router
(`src/frontend/app_js/src/app/router.js`). Tabs are top-level child routes;
deeper views are nested routes rendered in `<router-view>`; modals sync their
open state to the URL. `repoStatus` / `repoActions` reach route components
through vue-router's route `props` option rather than `provide`/`inject`.
vue-router is vendored as a pre-bundled ESM file (see "Vendored libraries").

### `common_components`

`src/frontend/app_js/src/common_components/` holds reusable, self-contained
components shared across the app. Two groups:

- **uniform formatters** for values of a common role, so they render identically
  everywhere: `format_hash`, `format_datetime`, `format_filesize`,
  `format_local_file_path`.
- **uniform control/input components**: `filter_records_form`, `modals`,
  `input_datetime_range`, `input_numeric_range`, `input_regex_text`,
  `loader_spinner`, `loader_inprogress`, `rollable_sections`, `tabbed_panes`,
  `css_grid`.

### `filter_records_form`

`src/frontend/app_js/src/common_components/filter_records_form/` is the uniform
filter + sort + paginate wrapper used by every record list. It exposes a scoped
slot with the processed `{ records }`, and a `recordsFilterClasses` helper to
spread per-record classes. It is a component root
(`<component-filter-records-form>`); see its README for the full usage contract.

### `common_app_features`

`src/frontend/app_js/src/common_app_features/` deliberately has **no
encapsulation role** and no self-contained requirement. Each folder is a piece
of app setup that enriches `repoStatus`/`repoActions`; the only purpose of the
folder is housekeeping — moving code out of the one big `app.js` setup function.
The exposed functions must be sync (they run from `setup()`), and they normally
add no UI. See its `README.md`.

## Frontend file formats

Only `.js` and `.css` are allowed — no `.vue` and no `.ts` (a limitation of the
self-written `py_js_bundler`). Vue is served as a vendored JS asset. `.ts` is a
noted *possible* future extension but is not supported by the bundler today.

## Dual run mode (npm dev vs bundle)

The frontend runs two ways, and **both must keep working**:

- **Vite dev server** — `npm install` + `npm run dev` inside
  `src/frontend/app_js` (needs Node + the Python backend running).
- **Backend-served bundle** — `build.sh` bundles `app_js` with `py_js_bundler`
  into `src/frontend/GENERATED/app.js`, served by the backend at
  `/assets/app.js` (needs only Python).

While iterating on frontend-only changes, **verify with the Vite dev server and
do not re-run `py_js_bundler`/`build.sh` on every change** — the dev server
exists specifically to make this fast, and bundle-side regressions will be
caught on your next full reload, so they are not silently missed. Re-run
`build.sh` when you need to test the real/final app. If you can't reach the
running frontend in a browser, ask the user (helium-devtools MCP or a direct
Chrome call) — the dev frontend should be reachable, otherwise ask.

## HTTP methods and the Vite dev server

The backend webserver is method-agnostic: it dispatches on the raw request
method (`net_request_handler.command`) and serves any method name (`GET`, `POST`,
`PUT`, `SIZE`, `DOWNLOAD`, `FOO`, …). The app itself is fully capable of using
non-standard HTTP methods end to end.

The **Vite/npm dev server** is not. Vite is built on Node's `http` server, and
Node's `llhttp` parser rejects methods outside its fixed allow-list with
`400 Bad Request` *before* Vite's proxy middleware ever sees them — so `SIZE`,
`DOWNLOAD`, etc. cannot be proxied to the backend in `npm run dev`, and there is
no public Vite/Node config or patch for it (`insecureHTTPParser` only relaxes
header parsing, not methods). This makes frontend development with non-standard
methods less convenient; it does not make the app less capable.

Consequence for frontend code: **express operations with standard methods so the
Vite dev server can proxy them.** The `/browse` endpoint models this — resource
size is requested with `HEAD` and returned in the `X-Resource-Size` response
header (file → its size, directory → recursive size), instead of a custom `SIZE`
method. The legacy `SIZE`/`DOWNLOAD` methods remain supported by the backend for
direct/production use.

## Ports

The backend listens on `localhost`, default port `5180` (`PORT_START_WITH` in
`src/main_gitgui_program.py`). With no explicit port it runs at `5180` or the
first free port after it (the `auto` search increments by one;
`--config-webserver-port auto:<N>` starts the search at `<N>`; an explicit
integer must be free or the program fails).

Whatever port the backend lands on is fine for the launched browser
(`launch_browser` just opens `http://localhost:<port>/`), but it **can** break
the Vite dev server: `src/frontend/app_js/vite.config.js` hard-codes
`http://localhost:5180` as the proxy target. While developing against Vite, keep
the backend on `5180` (or update `vite.config.js`).

## Vendored libraries

**Fewer dependencies and fewer vendored libraries is better.** Every vendored
asset is code we must track, keep current, and credit correctly, so a new
vendored library should never be added casually. That is a preference, not a
ban: adding one is fine when it is *reasoned* — there must be a clear, stated
why (what it does, why writing it ourselves would cost more than maintaining a
vendored copy, why a runtime dependency wouldn't fit). Record that reasoning and
the license/attribution when you add it.

**The running app should make no network requests to the outside internet** (no
CDNs) — keep it clean and private; remote operations (push/pull) are
user-initiated only, never automatic.

The frontend does not fetch third-party JS from a CDN at runtime; the following
are vendored under `src/frontend/assets_vendor_libs/` and turned into
`GENERATED/` Python assets by `build.sh`:

- `vue` — `vue/vue.esm-browser.js` (Vue 3.5.41), served at
  `/assets/vendorlibs/vue.js`, resolved by the page's importmap.
- `vue-router` — `vue_router/vue-router.browser.js` (pre-bundled ESM, v5.4.0),
  served at `/assets/vendorlibs/vue-router.js`.
- `marked` — `marked.umd.min.js` (Markdown → HTML),
  `/assets/vendorlibs/marked.js`.
- DOMPurify — `purify.min.js` (sanitize rendered HTML),
  `/assets/vendorlibs/dompurify.js`.
- IBM Plex Sans / Mono fonts.

### Vendoring static files

A vendored asset is usually a set of static files (a `.js` bundle, a font file,
a license text). A static file cannot go into the bundle as-is — pinliner bundles
Python modules, not arbitrary files — so the same `GENERATED/` technique from
"pinliner constraints and the `GENERATED/` technique" applies: `build.sh` writes
the file's contents into a generated, importable `.py` module
(`src/frontend/GENERATED/ASSETS.py`), and the program imports that module instead
of reading the file at runtime. Adding a vendored asset therefore needs no new
mechanism — drop the source file under `src/frontend/assets_vendor_libs/`, have
`build.sh` embed it, and import the generated module.

### Tracking vendored libraries

Every vendored asset/library is tracked in `components-licenses.json` (repo
root), the machine-readable registry intended to drive the "About / software
licenses" page. When you add, remove, upgrade, or re-license a vendored
component, update its entry there (`kind: "vendored"`, plus `version`,
`authors`, `license`, `license_spdx`, `license_local`/`license_local_kind`, and
`note`). This is where the reasoning and attribution required above are recorded,
and where a missing license text shows up as a compliance gap.

### Update policy

Decide updates by common sense, not by a fixed schedule:

- **Prefer up-to-date but stable, supported versions** — not nightly/unstable
  ones, and not so frequent that you add churn or new bugs.
- **Security concerns on an old version → suggest updating.** If a security
  issue has no released patch yet, do nothing (there's nothing to update to).
- **Compatibility issues from an outdated version → confirm with the user.**
- **Very old versions → confirm with the user** before a larger jump.
- Don't sacrifice compatibility with a wide range of user environments (Python,
  browsers).
- Fonts are stable; `myers-diff` and other submodules are treated as stable or
  updated as needed. `vue` / `vue-router` are the important ones to watch.
  vue-router is re-vendored manually (see `vue_router/README.md` for the
  rolldown rebuild command); the committed artifact is what `build.sh` consumes,
  so a fresh clone/offline build never needs Node.

## Updating `py_js_bundler` (the self-written JS bundler)

When valid JS passes npm/Vite but is rejected by `py_js_bundler`, **prefer
updating `py_js_bundler`** for common, widespread, not-too-tricky syntax over
contorting the JS to fit the still-incomplete bundler. Only fall back to a
JS-side compromise when the construct is genuinely exotic and a bundler update
would be disproportionately complicated.

## pinliner constraints and the `GENERATED/` technique

The app is bundled with `pinliner` into a single self-contained
`gitgui_bundle.py`. Consequences (the imperative form lives in
`.clinerules/01-architecture-imports.md`):

- Use only **relative imports**; every imported path needs an `__init__.py` at
  each level. Dev-only code that is not part of the bundle has no such
  requirement.
- The app must not depend on separate local files at runtime. Static assets are
  embedded via a deliberate technique: `build.sh` writes their contents into
  gitignored `GENERATED/` Python modules (e.g. `src/frontend/GENERATED/ASSETS.py`,
  `src/GENERATED/VERSION.py`, `src/GENERATED/HELP.py`), and the program imports
  those modules. It's an acknowledged hack — the source files import something
  that doesn't exist until the build step produces it — but it is what lets
  static files be bundled.

## Modularity preference (soft)

Independent of pinliner, the author aesthetically prefers self-contained,
reusable modules that can be lifted to another place or project without major
rework. This is a preference, not a hard rule, and yields to other rules when
they conflict.

## Why no Jinja2

HTML pages are rendered by a small self-rolled layer
(`src/frontend/template/make_html.py` + `html_begin.html`/`html_end.html` with
`{{INS_*}}` placeholders filled via `.replace()`). It implements basic templating
and is enough for the ~5 pages / ~330 lines we render, so we don't add a
templater (e.g. Jinja2):

- Jinja2 drags in more dependencies (the Flask ecosystem) we'd rather avoid.
- pinliner only bundles our local modules, so a templater installed from
  `requirements.txt` would *not* be bundled — that part is fine. But a templater
  that reads standalone `.html` files at runtime *would* clash with pinliner's
  "no separate files at runtime" model and need hacks/workarounds.
- This isn't about avoiding the mainstream web stack; it's about starting
  minimal and simple and seeing whether maintenance/readability actually
  suffers. Either outcome is useful knowledge.

## Rules vs the Zen of Python (a fun review)

Scanned all `.clinerules/` files against `import this`; verdict: aligned, no
substantive violations. The rules map cleanly onto the Zen lines —
`04-code-style-errors.md` → "Errors should never pass silently (unless
explicitly silenced)"; the CSS prefix system, Python packages and submodules →
"Namespaces are one honking great idea"; the stable-features-only CSS rule →
"never is often better than *right* now"; the documented "practicality beats
purity" carve-outs (launcher.py, unprefixed globals, double error reporting) are
explicit, not accidental. Only real tensions are tradeoffs the rules themselves
acknowledge.



