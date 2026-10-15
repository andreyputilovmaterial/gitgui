# Testing

There are two distinct uses of pytest — do not conflate them:

- **Development tests** (verify program functionality). These live in `tests/` and are **not** included in the final bundle.
- `tests-real-sensitive-data/` is gitignored (sensitive/proprietary data). Never commit it.
