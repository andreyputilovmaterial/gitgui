# Streaming jobs & pipes

> Canonical reference for the "job / pipe" architecture shared by the frontend
> (`src/frontend/app_js`) and the backend (`src/cli_proxy_caller`,
> `src/frontend/endpoints_git_command_path.py`, `src/output_postprocessors`).
> Read this before touching any code that starts, polls, streams, or chains jobs.

## The mental model in one paragraph

A **job** is a single unit of work tracked by the backend. Jobs are never
"waited on" synchronously; each job returns a **promise** that reflects its
status, and the caller keeps moving while the job runs in the background. A
multi-step task (e.g. `git cat-file | textconv`) is expressed as a **pipe**: a
chain of jobs where each participant consumes the previous participant's
output. Every participant runs **concurrently** — a producer writes to its
stdout while its consumer reads it. The golden rule is therefore:

> **Start draining the next participant *before* you `await` the current one.**

If you await a producer's completion promise before anything has begun reading
its output, the producer fills its OS pipe buffer and blocks on `write()`, and
the whole chain deadlocks. Await all promises **together at the end**, never in
the order they were created.

## Job = id + status + optional stream

Backend (`src/cli_proxy_caller/common_defs.py`) models a job with:
`job_id`, `status` (`fresh` → `running` → `done` / `error`), `returncode`,
`stdout`/`stderr`, and a `stdout_reader` callable for streamed output.

The frontend (`src/frontend/app_js/src/common_defs/cli.js`) wraps each backend
job in an object exposing:

- `jobData.promise` — resolves when the job reaches `done` (via polling).
- `jobData.promiseDownloadLinkReady` — resolves when `download_url` becomes
  known. **This is not the job finishing**; it only means the stream endpoint is
  available and can be consumed.
- `jobData.getDownloadUrl(filename)` — builds `/command/{job_id}/stdout/{filename}`.
- `jobData.configureStdoutReaderPipe(dest)` — `PUT`s to that same URL to attach
  the next pipe participant to this job's stdout; returns the new job id.
- `jobData.getData()` / `jobData.downloadFullStdout()` — drain the stream as a
  consumer.
- `jobData.terminateJob()` — `DELETE /command/{job_id}`.

## Frontend command flags (`useGitCommands` / `cliCommand`)

`src/frontend/app_js/src/common_app_features/git__execute_commands/index.js`
exposes `executeGitCommand` / `executeGitAsyncCommand` / `executeGitBinaryCommand`
/ `attachToRunningCommand`. All four funnel into a single base function
`_executeGitCommand`, whose behavior is controlled by flags:

- `is_binary` — text vs bytes output. Kept snake_case deliberately: it is sent
  to the backend as a query param, and the job JSON returned uses the same
  snake_case keys (`is_binary`, `is_interactive`, `download_url`, ...), so there
  is no camelCase mapping on the frontend.
- `is_interactive` — the most important flag. It changes the **return shape**:
  - `false` → the function returns the **final job result** (the resolved job
    promise, after the job has finished).
  - `true` → the function returns the **live job object** immediately; the
    caller must `await jobData.promise` to reach the final result.
  Typical pattern: text (`is_binary=false`) → `is_interactive=false`; binary
  (`is_binary=true`) → `is_interactive=true` (streamed). This is a convention,
  not a hard rule.
- `attachExistingJob` — not internal. Used for pipe pieces: instead of starting
  a fresh process, adopt an already-running job (whose `job_id` you already
  know) under the same job-object contract. This is exactly what
  `attachToRunningCommand(job_id, ...)` passes through.

`_executeGitAsyncCommand` and `_executeGitBinaryCommand` are only shorthands:
`_executeGitAsyncCommand` forces `is_interactive:true`, and
`_executeGitBinaryCommand` forces `is_interactive:true` + `is_binary:true`.

> The flag-driven return shape (bare promise vs live object) is admittedly not
> the cleanest design; it grew out of needing a working implementation and has
> been kept as-is rather than risk a larger refactor.

### Separation of roles: `cli.js` vs `useGitCommands`

- `src/frontend/app_js/src/common_defs/cli.js` is intentionally **Vue-agnostic**:
  it imports no Vue and knows nothing about the app. It defines the raw "job"
  contract — start a backend command, poll it, and stream/pipe its output — as a
  self-contained unit (it only pulls in plain helpers and a `ReplayEvent`).
- `src/frontend/app_js/src/common_app_features/git__execute_commands/index.js`
  (`useGitCommands`) is the **app-facing wrapper**: it adds the Vue-reactive
  command log, a concurrency semaphore, and the friendly entry points
  (`executeGitCommand` / `executeGitAsyncCommand` / `executeGitBinaryCommand` /
  `attachToRunningCommand`) on top of `cliCommand`.

## The three job kinds

All three look identical to the frontend (a job object with a promise). They
differ only in *what executes* on the backend:

1. **sync** — `subprocess.run(capture_output=True)`.
   `src/cli_proxy_caller/job_task_processors/handle_run_cli_command.py`.
   No status updates until it finishes; stdout is captured whole.

2. **interactive / async** — `subprocess.Popen(stdout=PIPE, ...)`.
   `src/cli_proxy_caller/job_task_processors/handle_interactive_command.py`.
   stdout is a live pipe you can stream/redirect; stderr is collected
   incrementally (chunk size via `stderr_chunk_size`).

3. **pure-Python function** — no subprocess. The function is called as
   `fn(stdin, stdout, stderr, *args)` and reads/writes file objects.
   `src/cli_proxy_caller/job_task_processors/handle_task_from_function.py`.
   Used by the `output_postprocessors` (`tar`, `textconv`); each such
   postprocessor is a pipe participant implemented entirely in Python.

## HTTP surface (pipe plumbing)

`src/frontend/endpoints_git_command_path.py`:

| Method | Path | Meaning |
| --- | --- | --- |
| `POST` | `/command` | start a job (producer); returns 202 + job dict incl. `download_url` |
| `GET` | `/command/{id}` | poll job status (`handle_job_status`) |
| `GET` | `/command/{id}/stdout/{filename}` | stream this job's stdout out (`handle_send_binary_data`) — **drains** the job |
| `PUT` | `/command/{id}/stdout/...` | attach the next participant to this job's stdout (`handle_pipe_binary_data`) — returns a **new** job id |

`PUT` grabs the job's `stdout_reader` and passes it to
`initiate_from_function(...)`, handing the producer's output file object to the
consumer as its stdin. The producer and the consumer therefore run at the same
time: the consumer reads while the producer writes.

## The golden rule, with the canonical example

`src/frontend/app_js/src/common_app_features/git_cat_file/index.js`
(`catFileTextconvRawtext`) pipes `git cat-file` into `textconv`. In order:

1. Start the producer: `executeGitBinaryCommand([...])` → `jobData` (job running).
2. `await jobData.promiseDownloadLinkReady` — wait only for the stream URL, **not** completion.
3. `fetch(jobData.getDownloadUrl(filename), { method: 'PUT', ... })` — attach
   `textconv` as the consumer → `pipeJobId`.
4. `attachToRunningCommand(pipeJobId, { parentJobId })` → `pipeJobData` (job running).
5. `await pipeJobData.promiseDownloadLinkReady`.
6. `fetch(pipeJobData.getDownloadUrl(filename))` — start draining the consumer's stdout.
7. `await Promise.all([ jobData.promise, pipeJobData.promise, bufferPromise ])`.

Steps 2/3 and 5/6 are the "consume before await" moments. Step 3 must happen
before awaiting `jobData.promise` (step 7), otherwise the producer blocks on a
full pipe with no reader. Step 6 must happen before awaiting
`pipeJobData.promise` for the same reason one stage down. The final
`Promise.all` gathers all three results only after every participant is already
running and draining — that's why it waits for all of them together rather than
in creation order.

**Wrong** (deadlocks under load):

```js
const jobData = await executeGitBinaryCommand([...]);
await jobData.promise;                     // nothing drains stdout → producer may block
const pipeJobData = await attachToRunningCommand(/* ... */); // too late
```

## Participants you can add to a pipe

Register a new participant in `src/output_postprocessors/__init__.py` via
`register_output_postprocessor(name, fn)` (wired in `src/main_gitgui_program.py`),
implementing `fn(stdin, stdout, stderr, *args)` where all three streams are
file objects. `textconv` and `tar` are the existing examples.

## Where this pattern appears

- `src/frontend/app_js/src/common_defs/cli.js` — the job object + its promises.
- `src/frontend/app_js/src/common_app_features/git__execute_commands/index.js` —
  start/attach commands, live job objects for interactive/binary jobs.
- `src/frontend/app_js/src/common_app_features/git_cat_file/index.js` — the
  canonical two-stage pipe (`cat-file → textconv`).
- `src/frontend/app_js/src/common_app_features/git_status/index.js` and
  `src/frontend/app_js/src/app/page_files_within_revision_list/*` — same
  consume-before-await pattern (`tar` extraction is another participant).
- Backend: `src/cli_proxy_caller/*` (job model + workers), the stdout
  GET/PUT handlers in `src/frontend/endpoints_git_command_path.py`, and
  `src/output_postprocessors/*` (pure-Python pipe participants).


## Long-lived stdin commands ("batch")

Some commands stay alive and answer many stdin requests, one framed response per
request — the canonical example is `git cat-file --batch`, which prints a header
line (`<sha> <type> <size>`) and then exactly `size` payload bytes plus a newline
(or `<sha> missing`). This is a request/response loop over the process's stdin
and stdout, distinct from the continuous stdout stream used by ordinary
interactive jobs.

The model reuses the existing job machinery:

- The **process job** (parent) is started with `is_interactive=true` and
  `options['read_convention']=<name>`. It has **no** `stdout_reader` / download
  URL — its stdout is owned by the per-request children, so there is never a
  global consumer racing them. stderr is still accumulated into `job.stderr` by
  the normal collector thread (no reader needed).
- Each **input** is a new child job (`cli_proxy_caller.send_input` →
  `initiate_from_function`). The child's closure, under the parent's
  `pipe_process_lock`, writes `query + \n` to the parent's stdin and reads
  exactly one framed response from the parent's stdout, emitting it as the
  child's stdout. The frontend attaches to the child with the same
  consume-before-await pattern as any pipe participant.
- The framing contract lives in the uniform registry
  `src/cli_proxy_caller/read_conventions.py`
  (`register_read_convention` / `read_conventions`), mirroring
  `src/output_postprocessors`. A convention is `reader(process) -> frame`
  (bytes in binary mode, str in text mode). Built-ins: `newline`, `gitcatfile`.

HTTP surface: `POST /command/{id}/stdin` (body `{input}`) creates the child and
returns a 202 job dict with `download_url`; the response is then streamed via the
ordinary `GET /command/{child}/stdout`. `send_input` fails loudly when the parent
is missing, not running, not interactive, or has no `read_convention` — and the
parent must reach status `running` before the first input.

Two correctness notes:

- `cat` is NOT a usable echo fixture: it block-buffers stdout when it is a pipe,
  so a `readline()` reader would never see the reply. `python -u` flushes
  immediately and is used in the tests.
- The stderr collector must not hold `pipe_process_lock` while blocking on
  stderr (that would deadlock every stdin request and terminate itself); it reads
  stderr under its own `stderr_reader_lock`.

