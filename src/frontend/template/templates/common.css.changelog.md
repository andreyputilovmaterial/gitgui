# `common.css` changelog

Every change to `common.css` must be recorded here, in reverse-chronological
order, with the date and a short reason for the change. See
`.clinerules/09-frontend-common-css.md`.

## 2026-11-05

- Replaced the custom-drawn checkbox/radio box (a `::before` pseudo-element on
  `<input>`) with native controls tinted via `accent-color`. The old approach was
  misaligned in Chrome and invisible in Firefox (pseudo-elements are not supported
  on `<input>` there). Native controls render consistently across Chrome/Firefox/Safari.
