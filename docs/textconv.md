# Textconv

> Canonical reference for the textconv subsystem: `src/textconv/`,
> `src/main_textconv_program.py`, `src/output_postprocessors/textconv/`, the
> `/textconv` HTTP endpoint, and the frontend
> `src/frontend/app_js/src/textconv_backend/`. Read this before touching any
> code that produces, parses, or consumes textconv output.

## What textconv is

Textconv turns arbitrary file bytes (a git blob, a worktree file, or raw bytes
posted to `/textconv`) into **plain text** so it can be shown and diffed. The
output is plain text only — but it is *prefixed* by a few **header lines**
carrying metadata. Header lines are ordinary text lines; the only thing that
marks them as headers is an intentionally ugly, unlikely-to-appear-in-a-real-file
prefix.

## Output shape

A textconv response is, in order:

1. one or more header lines (one per line; the frontend parser also tolerates
   zero),
2. the converted content, starting immediately after the final header line's
   newline.

There is no blank line between the headers and the content.

```text
###__TEXTCONV_…: type: text
###__TEXTCONV_…: bytes_consumed: 12
###__TEXTCONV_…: hash: a948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447
hello world
```

## The header line format

`make_header(s)` in `src/textconv/__init__.py` wraps each header value:

```text
###__TEXTCONV_108efe33_8af42f10_b98a_4b9b_b0b3_f66714dbf247: <value>
```

- The marker is `###__TEXTCONV_108efe33_8af42f10_b98a_4b9b_b0b3_f66714dbf247: `
  (note the trailing space). It is hardcoded in **two** places — the backend
  `make_header` and the frontend `parse_headers.js` `marker` constant — and is
  deliberately ugly so a real file essentially never starts with it (see
  "The hardcoded prefix" below).
- `make_header(s, newline=False, safe=True)` requires the value to be printable
  ASCII (`[\x20-\x7E]`), with no control characters and no newlines; it raises a
  `ValueError` otherwise. In current call sites `newline` is always left `False`
  and the line break is supplied by `print(..., end='\n')`.

## Which headers are emitted

All headers are produced in `src/textconv/__init__.py`, `textconv_from_stream()`:

| Header | Value | Emitted by |
| --- | --- | --- |
| `type` | The resolved processor key (`text`, `binary`, `image`, `archive`, `mdd`, `xml`, `markitdown`, …) | `textconv_from_stream`, inside the `with` block, before the processor runs |
| `bytes_consumed` | `int` — total bytes of the source stream (used by the frontend as the file size) | `StreamingProxy._finalize_headers` (called from `textconv_from_stream`'s `finally`) |
| `hash` | SHA-256 hex digest of the source bytes | `StreamingProxy._finalize_headers` (called from `textconv_from_stream`'s `finally`) |
| `error` | bare word (no value) — a failure flag | `textconv_from_stream`, in the `except` branch |

`type` is resolved by matching the filename extension against the `matches`
table in `src/textconv/processors/__init__.py`, falling back to content
heuristics (`detect_type` → `text` or `binary`).

`error` is emitted only on an exception. `bytes_consumed` and `hash` are
emitted in a `finally`, so they are always present — even when the processor
raises or the initial sample read fails. On failure the header block is
`type` (when reached), `error`, `bytes_consumed`, `hash`, followed by the
exception message as content.

## The `hash` header and its purpose

The `hash` header is the SHA-256 hex digest of the source bytes.

Its purpose: textconv maps *binary* content to text, so two byte-wise different
files can convert to the same text. Embedding a content hash means a diff of the
textconv output still shows inequality even when the human-readable text is
identical.

## How the hash is computed — `StreamingProxy`

`StreamingProxy` (same file) wraps the input stream and computes the hash and
byte count **for the whole stream**, independently of how much the processor
reads:

- `__enter__` pre-reads a bounded sample (`SAMPLE_SIZE_BYTES` = 5 MB in
  `src/textconv/config.py`) for type detection, then ingests (hashes + counts)
  it once; `read()` replays the sample and ingests fresh bytes as they are
  returned.
- `_finalize_headers()` (invoked from `textconv_from_stream`'s `finally`)
  drains the remainder of the source stream and then writes `bytes_consumed`
  and `hash`. Hashing stops at `MAX_FILE_SIZE_LIMIT_BYTES` (64 MB); the rest is
  still drained (and counted) so a pipe producer is never left blocked.

Consequence: the hash is the SHA-256 of the full source content for files
within the display limit, and `bytes_consumed` is the full byte count — even for
processors that never call `read()`.

## Frontend contract

- `src/frontend/app_js/src/textconv_backend/parse_headers.js` splits the response
  on `\r?\n`, collects the consecutive marker-prefixed lines from the start into
  `headers`, and returns `{ headers, headersRecognized, text }`.
  - `headersRecognized` maps `key: value` headers (`type`, `bytes_consumed`,
    `hash`) to their value, and bare-word headers (`error`) to `true`.
  - `text` is everything after the header block — the converted content.
- `src/frontend/app_js/src/textconv_backend/index.js` POSTs the file bytes to
  `/textconv?filepath=…` and runs `parseHeaders` on the response.

## Entry points / wiring

1. **Standalone git-driver shape** — `python -m src.launcher --program textconv <file>`
   → `src/main_textconv_program.py` (one positional path arg; opens the file in
   binary and prints the textconv output). This matches the classic
   `diff.<driver>.textconv` interface, though the app does not currently register
   a git diff driver for it.
2. **Pipe postprocessor** — `src/output_postprocessors/textconv/__init__.py`
   (`make_textconv_output_processor(config)`, registered as `textconv`) runs as
   the consumer of `git cat-file blob <oid> | textconv --filename <name>` via the
   frontend `catFileTextconv` (`src/frontend/app_js/src/common_app_features/git_cat_file/index.js`).
3. **HTTP endpoint** — `POST /textconv?filepath=…` (body = file bytes) handled by
   `src/frontend/endpoints_textconv_path.py`.

## The hardcoded prefix (design note)

The marker string is duplicated verbatim in `src/textconv/__init__.py` and
`src/frontend/app_js/src/textconv_backend/parse_headers.js`. It is hardcoded on
purpose, not a constant pulled from a shared module:

- It must be a single, self-contained line so the backend and the frontend parser
  can agree on it without importing each other (they live on opposite sides of
  the HTTP boundary).
- It must be unique enough to never collide with a real file's first line. That
  requirement forces it to be ugly — a natural-looking prefix would show up in a
  real file and be misparsed as a header.
- It is not expected to change. If it ever must, it is a coordinated global
  replace across both sides.

## Guarantees

- `hash:` is always emitted — on normal completion, on a processor error, and
  even on an early sample-read failure (in the last case it is the empty-input
  hash).
- `hash:` is the SHA-256 of the full source bytes for files within the 64 MB
  display limit, regardless of how much the processor reads.
- `bytes_consumed:` is the full source byte count (used by the frontend as the
  file size).
- The frontend diff view treats a differing `hash:` as a difference: when two
  files convert to identical text but their hashes differ, a synthetic
  "Content hash" line is shown so the diff still renders a change.

## Resolved gaps (2026-11-13)

The three gaps documented during the original audit are now fixed:

1. Non-consuming processors (`binary`, `image`, `archive`, `spss`, `csv`, `mdd`
   without `win32com`) previously produced a constant empty-input hash; the
   proxy now drains the stream, so the hash is the full content hash.
2. An early sample-read failure previously skipped the `hash:` header; headers
   are now finalized in a `finally`, so `hash:` is always present.
3. The frontend diff previously ignored the hash; it now injects a "Content
   hash" line when hashes differ but text is identical (see
   `page_version_compare/diff_content_hash.js`).
