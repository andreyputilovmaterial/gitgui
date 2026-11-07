# cli_proxy_caller

Backend for running git/CLI commands and arbitrary Python functions as *jobs*,
and for chaining them into *pipes*. See `docs/streaming-jobs.md` (repo root) for
the full job/pipe model; this file only documents what is specific to this
package.

## Modules

- `common_defs.py` — the `Job` dataclass (the per-job state dict), `JobTask`,
  `JobMessage`.
- `common_context.py` — the module-level `context` (`context.jobs` dict +
  `job_message_queue`).
- `exposed.py` — the public call surface (`initiate_command`,
  `initiate_from_function`, `get_job`, `get_job_stdout_reader`,
  `terminate_job`).
- `worker.py` — the worker loop that drains `job_message_queue` and dispatches
  to the task processors.
- `job_task_processors/` — one handler per job kind:
  - `handle_run_cli_command` — synchronous `subprocess.run` (text, or binary
    with the output served via a `BytesIO` reader).
  - `handle_interactive_command` — `subprocess.Popen` with live stdin/stdout/
    stderr.
  - `handle_task_from_function` — a pure-Python pipe participant writing to
    `os.pipe()` file objects.
- `gc/jobs.py` — removes finished jobs from `context.jobs` after `JOB_TTL`
  (5 min) or when flagged for deletion.
- `perf.py` — live memory-footprint statistics (see below).

## Memory monitoring (`perf.py`)

`get_jobs_perf_stats()` returns a JSON-safe snapshot of how much memory the jobs
dict currently holds, per job and in total:

```json
{
  "jobs_count": 1,
  "total_bytes": 2002015,
  "jobs": [
    {
      "job_id": "…",
      "status": "done",
      "bytes": 2002015,
      "flagged": true,
      "fields": {"stdout": 0, "stderr": 0, "stdout_reader": 2000321, "job_data": 0}
    }
  ]
}
```

It is exposed over HTTP via the `/perf` tree (handler `handle_perf` in
`src/frontend/endpoints_app_path.py`, route in `src/endpoints.py`): `GET /perf`
lists the resources, `GET /perf/cli_jobs` serves these stats, and
`GET /perf/network` serves `config['webserve_log_records']`.

### What it measures — footprint, not throughput

`deep_size(obj)` walks the object graph reachable from the jobs dict and sums
`sys.getsizeof` of every node, so it accounts for referenced data, not just the
top-level objects:

- `str`/`bytes`/`bytearray` payloads (exact).
- `io.BytesIO` (its `getsizeof` already includes the buffer) and `memoryview`
  (its `nbytes` is added explicitly).
- containers, dataclass `__dict__`/`__slots__`, locks, timestamps.
- **function closure captures** — this is the important one. A job's
  `stdout_reader` closure is where buffered output would hide (e.g. a
  `subprocess.run(capture_output=True)` result). Without walking `__closure__`,
  the biggest single object could be reported as a ~160-byte function and go
  unnoticed.

It deliberately does **not** measure:

- **child-process memory** (`subprocess.Popen`) — a separate address space;
  only the small Python wrapper is counted.
- **kernel pipe buffers** — data flowing through an `os.pipe()` lives in the
  kernel, not in this process's Python heap; only the file-object wrapper is
  counted.
- **throughput** (total bytes that have flowed through a stream). That is not a
  memory quantity and cannot be recovered from an object afterwards; it would
  need an instrumented byte counter at the read/write sites.

`deep_size` is an *estimate*, not exact RSS: allocator overhead and the above
OS-level resources are excluded, so use it to compare jobs/fields and to flag
"unexpectedly large", not as a byte-exact process footprint.

### Flagging

`get_jobs_perf_stats(thresholds=…)` marks a job `flagged: true` when any of its
measured fields exceeds a per-field byte limit (defaults in
`DEFAULT_FIELD_THRESHOLDS_BYTES`, 1 MiB for `stdout`/`stderr`/`stdout_reader`/
`job_data`). The intent is to catch the *unexpected*: stderr that should have
been ~0, a "small text" stdout that came back large, or a reader that buffered
megabytes instead of streaming.

### It never prevents memory release

`deep_size` holds a reference to an object only for the duration of that one
call (plus a transient `id()` set to break cycles); `get_jobs_perf_stats`
returns only ints/strings/None and never the job objects or their fields. So
measuring can never extend a job's lifetime or keep a finished job from being
garbage-collected. This is covered by tests
(`tests/test_cli_proxy_caller_perf.py`).
