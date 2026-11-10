# Maintenance log

> Cross-project maintenance notes. Entries here capture **structural** changes
> that apply to any project sharing this repo's shape — a `launcher` used as the
> key router (`--program <name>`), and `pinliner` producing a one-file bundle.
>
> Repo-specific changes do **not** belong here; they stay in the commit history
> and `docs/project-context.md`. Anything recorded here is meant to be repeatable
> in other projects of the same structure.
>
> Entries are ordered **newest first**.

## How to read an entry

Each entry is a section whose heading reads like a commit subject: it states the
**intent** of the change and **where** the change happens (component/module).
Inside, answer the questions needed to repeat the same update elsewhere:

- **When** — date/time requested and implemented.
- **What & why** — the request and the reasoning behind the chosen approach.
- **Input** — a sample of the code/file **before** the change.
- **Output** — a sample of the code/file **after** the change.
- **Repeat** — a checklist of the exact steps to apply the same convention in
  another project.

Two concepts are easy to conflate, so they are spelled out separately:

- **Invocation modes** — the ways to *start* the program:
  1. from the **bundle** (`python apqa_bundle.py --program X`),
  2. through the **launcher** (`python -m src.launcher --program X`),
  3. **directly** at a starter module (`python -m src.main_ui_program …`).
- **Import selection** — how an entry-point module's `import` statements branch
  on the import context (package vs flat), set by Python via `__package__`. It
  is **not** a 1:1 map of the invocation modes.

---

## Build scripts: install only dev dependencies; split runtime vs dev requirements

- **Requested:** 2026-11-10
- **Implemented:** 2026-11-10
- **Where:** `build.sh`, `requirements.txt`, `requirements-dev.txt`, and the
  `webinput` submodule's `build.sh` / `requirements.txt` / `requirements-dev.txt`.

### What & why

`build.sh` is a *development/build* script. It should only provision the
toolchain needed to produce the bundle (minifiers, the JS bundler, pinliner),
never the runtime dependencies of the produced program. The produced program
runs in its own, separate venv — created by `run.sh` — which installs
`requirements.txt` plus the per-processor optional dependencies.

The old `build.sh` installed the whole `requirements.txt` and then also installed
every `src/textconv/processors/*/requirements.txt`. Processor dependencies are
pure *runtime* dependencies (e.g. `markitdown`, `pywin32`) and have no place in a
build venv. The two domains were mixed, and building pulled in heavy runtime
packages that the bundle never needs.

### Input (before)

`requirements.txt` mixed build, test and runtime packages; `build.sh` installed
all of them and the processor requirements:

```bash
# build.sh (before)
"$pythonexecutable" -m pip install -r requirements.txt

echo "Install optional dependencies for textconv processors (best-effort)"
if [ -d src/textconv/processors ]; then
    for requirements in $(find src/textconv/processors -type f -name 'requirements.txt' | sort); do
        "$pythonexecutable" -m pip install -r "$requirements"
    done
fi
```

### Output (after)

Two requirement files with distinct roles:

- `requirements.txt` — runtime only, shipped to `dist/` and installed by `run.sh`.
- `requirements-dev.txt` — build/test only (`rjsmin`, `csscompressor`,
  `python-dotenv`, `pytest`, `pytest-html`), installed by `build.sh`.

`build.sh` no longer installs processor requirements; it only copies them into
`dist/optional_dependencies/` for `run.sh`.

```bash
# build.sh (after)
"$pythonexecutable" -m pip install -r requirements-dev.txt
```

### Repeat

1. Put only the packages the shipped program imports at runtime into
   `requirements.txt`.
2. Put the build toolchain (minifiers, bundlers) and test frameworks into
   `requirements-dev.txt` and point `build.sh` at it.
3. Remove any per-feature/processor `requirements.txt` installs from `build.sh`;
   keep only the copy-to-dist step so the live `run.sh` can install them.
4. Apply the same split in every submodule that has its own `build.sh`.


## Entry-point imports: replace the three-branch `__name__` split with a two-branch `__package__` split

- **Requested:** 2026-11-04 18:09 MSK
- **Implemented:** 2026-11-04 18:20 MSK (reworked)
- **Where:** entry-point modules (`src/launcher.py` + the `--program` targets);
  the build script and run scripts are covered in the Repeat checklist.

### What & why

The launcher and the starter modules it dispatches to are the only files that
are *invoked* (as `__main__` via `-m`, or imported by the bundle); every other
module is only ever imported. The old code selected imports with a
**three-branch `__name__` split**:

- `if __name__ == '__main__'` — "run as a program",
- `elif '.' in __name__` — "imported as a package",
- `else` — "inlined with no parent package".

That three-branch split is confusing for two reasons: it is **not** the same as
the three invocation modes, and its `__main__` branch meant different things in
different projects (see the three "before" variants below). In practice the
`__main__` branch and the `else` branch always used the **same** flat imports, so
they collapse into one; the only real distinction is *inside a package* vs *no
parent package*, which `__package__` encodes directly.

Plain-script invocation (`python src/X.py`, without `-m`) is **dropped**: making
it work required a `sys.path` bootstrap and non-relative `src.*` imports, which
are not worth it. Supported invocation modes are the bundle and `-m`.

### Input (before) — three variants that grew out of the confusion

Variant A — classical three-branch, flat `__main__` (MDM-Diff-py `src/diff.py`,
commit `7baf51c`):

```python
if __name__ == '__main__':
    from diff_engine import diff_functions       # flat (script dir on sys.path)
elif '.' in __name__:
    from .diff_engine import diff_functions      # relative (package)
else:
    from diff_engine import diff_functions       # flat (no parent package)
```

Variant B — three-branch with `src.` in the `__main__` branch (apqa's original
`src/launcher.py`, to make `python -m src.launcher` work):

```python
if __name__ == '__main__':
    from src.GENERATED.VERSION import _VERSION   # absolute src.* (repo root on path)
elif '.' in __name__:
    from .GENERATED.VERSION import _VERSION      # relative (package)
else:
    from GENERATED.VERSION import _VERSION       # flat (no parent package)
```

Variant C — `_import_module` wrapper (MDM-Diff-py `src/launcher.py`):

```python
def _import_module(flat_name):
    if __name__ == '__main__':
        return importlib.import_module(flat_name)
    elif '.' in __name__:
        return importlib.import_module('.' + flat_name, package=__package__)
    else:
        return importlib.import_module(flat_name)
```

### Output (after) — two branches keyed on `__package__`

```python
if __package__:
    from .GENERATED.VERSION import _VERSION   # relative (package / -m / bundle)
else:
    from GENERATED.VERSION import _VERSION    # flat (no parent package)
```

Each entry-point module repeats this pattern for all its imports (one import is
shown here for brevity). No `sys.path` manipulation, no `src.*` absolute imports.

The bundle entry point is generated by pinliner (not hand-patched):

```bash
python pinliner/pinliner.py src -o dist/apqa_bundle.py --main src.launcher --main-attr main
```

### Repeat

1. **Entry-point modules** (the launcher and every module it dispatches to via
   `--program`) select imports on `__package__`:
   - `__package__` truthy → relative imports (`from .X import …`).
   - `__package__` falsy → flat imports (`from X import …`).
2. Give each starter module an `if __name__ == '__main__':` block that calls its
   entry function, so `python -m pkg.module` works.
3. **All other modules** use plain relative imports only.
4. **Bundle entry point** comes from pinliner `--main <module> --main-attr <attr>`
   (default attr `main`); the build script must **not** append `launcher.main()`.
5. **Drop plain-script support**: do not add `sys.path` hacks or `pkg.*` absolute
   imports to make `python pkg/module.py` work — use `-m` instead.


---

## maintenance-log: add a cross-project log for structural changes

- **Requested:** 2026-11-04 18:12 MSK
- **Implemented:** 2026-11-04 18:12 MSK
- **Where:** `docs/maintenance-log.md` (this file).

### What & why

The same structural conventions (import style, error reporting, output
coloring, argparse conventions, bundling/call conventions) are re-applied in
every project that shares the "launcher `--program` router + pinliner one-file
bundle" shape. Those need one dedicated place, separate from repo-specific
notes (`docs/project-context.md`) and the commit history, so they can be found
and repeated later. This file is that place.

### Input (before)

No dedicated file existed; structural notes were mixed into
`docs/project-context.md` and commit messages.

### Output (after)

`docs/maintenance-log.md` with a scoping header, a "How to read an entry"
format guide, and one section per structural change (**newest first**) — each
section headed like
a commit subject (intent + where) and answering When / What & why / Input /
Output / Repeat:

```markdown
# Maintenance log
> Cross-project maintenance notes. ...

## How to read an entry
- **When** — date/time requested and implemented.
- **What & why** — the request and the reasoning.
- **Input** — a sample of the code/file before the change.
- **Output** — a sample of the code/file after the change.
- **Repeat** — steps to apply the same convention in another project.

---

## <change title, like a commit subject>
- **Requested:** ...
- **Implemented:** ...
- **Where:** ...
### What & why
...
### Input (before)
...
### Output (after)
...
### Repeat
...
```

### Repeat

1. Create `docs/maintenance-log.md` in the repo's docs folder.
2. Add the scoping header + "How to read an entry" guide.
3. Add one section per structural change, **newest first**, in this exact shape.
