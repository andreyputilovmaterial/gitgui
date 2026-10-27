# Global CSS (`common.css`)

`src/frontend/template/templates/common.css` is the shared global "skin" loaded
by every page. Its rules are broad and reach all markup, so it must stay
predictable and low-surprise.

- Before assuming a layout bug lives in `common.css`, check the component's own
  `.css` first. Most per-component spacing/layout issues belong in the component
  styles, not in the global skin.
- Only modify `common.css` when a change is genuinely global (a shared token,
  a shared utility, or a rule that should apply everywhere).
- **Every change to `common.css` must be recorded** in
  `src/frontend/template/templates/common.css.changelog.md` (the file lives
  alongside `common.css`). Log entries are reverse-chronological and include the
  date and a short reason for each change.
