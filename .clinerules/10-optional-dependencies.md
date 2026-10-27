# Optional dependencies

- The global `requirements.txt` lists only app-wide requirements.
- Per-processor extras are *optional*: keep a `requirements.txt` next to the
  processor (encapsulation), e.g.
  `src/textconv/processors/<name>/requirements.txt`.
- Optional deps may be platform-specific (`pywin32` → Windows only); a missing
  one is normal and must not break processor discovery/registration.
- Each processor that needs extra packages guards its own import (`try/except`,
  storing the error) so the module always loads and the processor is always
  registered; its `textconv` returns/raises a readable error at its start. No
  global import-error machinery.
- `build.sh` auto-discovers the `requirements.txt` files (plain filesystem
  search on the source tree, before/outside the bundle) and copies them to
  `dist/optional_dependencies/` (preserving the path under `src/`); the
  generated `run.sh` installs them best-effort (failure → WARNING, continue).
  `transform-run-script` rewrites `src/textconv/processors` →
  `optional_dependencies` in the dist copy.
