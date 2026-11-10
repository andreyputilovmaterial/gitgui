# `common.css` changelog

Every change to `common.css` must be recorded here, in reverse-chronological
order, with the date and a short reason for the change. See
`.clinerules/09-frontend-common-css.md`.

## 2026-11-10

- Removed the purple `--mdm-color-primary` (#6670bb) token from the color scheme.
  Its consumers moved off purple: `.mdm-btn-primary` is now the primary green
  (`--mdm-color-green` / `--mdm-color-green-hover`), `.mdm-btn-link` now uses the
  link color, and the checkbox/radio `accent-color` is now a neutral grey
  (`#666`). The `#5560a8` primary-button hover shade was removed with it.

## 2026-11-05

- Replaced the custom-drawn checkbox/radio box (a `::before` pseudo-element on
  `<input>`) with native controls tinted via `accent-color`. The old approach was
  misaligned in Chrome and invisible in Firefox (pseudo-elements are not supported
  on `<input>` there). Native controls render consistently across Chrome/Firefox/Safari.
