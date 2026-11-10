# `common.css` changelog

Every change to `common.css` must be recorded here, in reverse-chronological
order, with the date and a short reason for the change. See
`.clinerules/09-frontend-common-css.md`.

## 2026-11-10

- Replaced the purple link color with a dedicated blue: `--mdm-color-link` is now
  `#2c68c5` and `--mdm-color-link-hover` is now `#66a1fa` (previously purple
  `#6c78ff` / `#4d56cc`). The redundant `--mdm-color-blue` / `--mdm-color-blue-hover`
  tokens were removed and `.mdm-link-blue` now follows the link color, so blue and
  the default link color are the same thing.
- Link hovers that still used the app green were moved to the new link-hover blue:
  `.mdm-btn-link:hover`, the header navigation link hover (`project_specific.css`),
  and the revision detail "View files" link hover.

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
