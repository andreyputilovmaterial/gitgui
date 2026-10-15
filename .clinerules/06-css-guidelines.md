# CSS Guidelines

Write CSS the way a well-designed framework (e.g. Bootstrap 3) does: a small set of
clear, domain-driven classes that do all the work. Selectors stay minimal and
precise; rules never leak or collide.

## Principles

1. **Classes do all the work.** Styling is attached to class names that carry
   meaning. Never style bare elements, never use IDs, never use `!important`.

2. **Write for the global space.** Assume every rule is emitted globally and
   unscoped (React/Vue scoping is a bonus, never a requirement). If a name could
   collide, it will — so names must be unique by design.

3. **A prefix is a domain.** Every class belongs to a domain, and the domain is
   encoded as the class prefix. Two classes sharing a prefix are the same thing
   and must be styled together.

4. **Inline styles are an emergency exit only.** Allowed when a component must
   render but its styles haven't applied (e.g. an error/fallback path —
   `style="color: #a00"`). Never part of normal, everyday work.

5. **Stable, widely supported features only.** Use only CSS that works across
   current browsers and does not depend on recent or experimental support.
   Flexbox, CSS Grid, and `grid-template-columns: subgrid` are normal, widely
   supported baseline — not novelty.

## The hierarchical prefix

A class name is a chain of dash-separated parts, read left to right, each part
narrowing the domain. The leftmost part is the brand; everything after it names
roles and sub-roles:

```
mdm                     brand (the app / skin)
mdm-form                 role: form controls
mdm-form-control         role + element
mdm-btn                  role: buttons
mdm-btn-primary          role + modifier
mdm-dialog               component
mdm-dialog-header        component + part
mdm-date-range-picker    component (multi-word name)
```

**`mdm-`** is the fixed, project-wide brand token (alter it if you need a different
name, but keep it the same everywhere). It makes the whole system unique and
portable: nothing collides with Bootstrap's `.form-control`, another team's
`.btn-primary`, or any other tool in the global space. The form controls, buttons
and tables can be lifted into a new project with zero collision risk because they
live under your namespace.

**Make longer chains — when each part names a real group.** Don't be afraid of a
long prefix if it expresses a real hierarchy; don't add a part that carries no
meaning just to mirror how deep something sits in the markup.

## Roles, not locations

A prefix chain expresses **what a thing is**, never **where it is**. Two rules
follow:

1. **Shared role → shared prefix.** All form controls share `mdm-form-` because
   they are all form controls. All buttons share `mdm-btn-`. All utilities share
   `mdm-u-`.

2. **Location is not a role.** A date-range picker that happens to sit inside a
   row filter is still `mdm-date-picker`, not `mdm-row-filter-date-picker` —
   coupling it to its position would break its ability to be lifted elsewhere.
   Chain a part only when the deeper thing is genuinely a part/sub-role of the
   shallower one (a dialog's header is a part of the dialog: `mdm-dialog-header`).

Always ask: does this part name a role/group that travels with the thing, or does it just record where the thing was placed? Only the first earns a place in the prefix.

## The three kinds of classes

### 1. Shared domains (reusable skin)

A shared domain is a role that appears across unrelated screens and must look
identical everywhere. It gets one prefix and is styled once, globally.

Form controls are the canonical example — every input, textarea and select in the
app serves the same purpose, so they share the `mdm-form-` prefix:

```css
.mdm-form-control { }   /* inputs, textareas, selects */
.mdm-form-label { }
.mdm-form-group { }     /* a label + control unit */
```

Buttons, alerts, cards, tables follow the same idea: `mdm-btn`, `mdm-alert`,
`mdm-card`, `mdm-table`.

> Never style `input`, `textarea`, or `select` unconditionally. Style the
> `mdm-form-*` domain; every control that wears that class is then consistent.

### 2. Component roots (local, scoped by one class)

A component is a distinct, self-contained UI unit. Exactly one class on its root
namespaces everything inside.

Children of a component have **simple, unprefixed** classes (`.title`, `.label`,
`.description`, `.field`) and are always styled as descendants of the root — never
bare:

```html
<div class="mdm-row-filter">
  <h2 class="title">Filter rows</h2>
  <p class="description">Narrow the list by text and date.</p>
  <input class="mdm-form-control" type="search">
</div>
```

```css
.mdm-row-filter { }
.mdm-row-filter .title { }
.mdm-row-filter .description { }
```

Do not re-prefix every child (`mdm-row-filter-title`, `mdm-row-filter-description`).
The single root class reaches them all.

But when an element or sub-group genuinely needs its own identity — it must be
targeted directly, can appear outside the root's subtree (slots/portals), or is
itself a meaningful sub-part — give it a class that **extends the root prefix**:

```css
.mdm-row-filter { }
.mdm-row-filter-actions { }        /* the button bar, targeted directly */
.mdm-row-filter-actions-button { } /* a part of that part, if needed */
```

```html
<div class="mdm-dialog">
  <header class="mdm-dialog-header">…</header>
  <main class="mdm-dialog-body">…</main>
  <footer class="mdm-dialog-footer">…</footer>
</div>
```

The rule is simple: simple child classes when scoping-by-root is enough; an
extended prefix when the child is a real, addressable sub-part.

### 3. Utilities (single aspects and states)

A class that expresses one aspect of an element's role on the page — rather than
its function — is a utility. Utilities are their own role, with their own prefix:

```css
.mdm-u-hidden { }   /* display: none */
.mdm-u-sr-only { }  /* visually hidden, readable by screen readers */
```

Appearance/aspect classes are legitimate here and elsewhere: `.mdm-btn-green`
(a green button), `.mdm-u-hidden`, `.mdm-u-sr-only` are all fine. The rule is only
that they live in a domain, like everything else. Don't be afraid to add a domain
when a group of classes clearly shares something in common — a new shared prefix
is cheaper than an ambiguous name.

## Naming

- kebab-case, lowercase, hyphens: `mdm-date-picker`, `mdm-form-control`.
- No underscores, no double underscores, no camelCase, no double hyphens.
- Prefix = brand + roles: `mdm-` (brand) + `form-` (role) + `control` (element).
- Default to meaning over appearance: `mdm-btn-primary`, `mdm-alert-danger` over
  `mdm-btn-blue`, `mdm-alert-red`. This is a preference, not a law — see Utilities.

## Selectors

- Class selectors only: no bare element selectors (outside a reset), no `*`
  (outside a reset), no `#id` (the `#app` / `#root` mount point may be used for
  layout scaffolding only).
- Combinators are allowed and encouraged where they prevent false matches.
  Descendant (`A B`) is the default; use `>`, `+`, `~` when they restrict a rule
  so it doesn't hit elements it shouldn't.

```css
.mdm-table > .mdm-row { }   /* direct rows only — not rows of a table nested in a cell */
.mdm-item + .mdm-item { }   /* spacing between siblings, not around the first/last */
```

- Use whatever CSS can express. The only limit is: don't add complexity without a reason. Default to the simplest selector that matches the intent; reach for combinators when they stop a rule from leaking.

## Layout and responsiveness

### Mobile-first

Design every component for a very narrow screen (≈340 px) first: elements stack
as blocks, one below the next. That stacked layout must be meaningful, useful,
production-ready, and correct on real phones in portrait — never a degraded
afterthought.

If a set of elements still fits on one line at that narrow width, keep them in
the row — don't re-stack what already fits. On any doubt, the typical answer is a
line break: the following elements (or elements from some controlled point) jump
to the next line. `flex-wrap: wrap` (with `min-width` / `flex-basis` on the
children to choose where the jump happens) and CSS Grid's `grid-template-columns`
with `repeat(auto-fit, minmax(…, 1fr))` both express these controlled jumps
cleanly. The exact mechanism is a judgment call, not a rule — use whichever reads
most clearly for the layout at hand.

As space grows, add rules that pull elements that belong on the same row back
onto one row.

### Container queries over media queries

Prefer sizing against the component's container rather than the viewport: set
`container-type: inline-size` and write `@container` rules. A component is a
self-contained unit that must lift to another place or project without rework —
container queries keep its layout tied to the space it actually occupies, so it
behaves the same in a narrow sidebar as in a wide main column. Treat container
queries as stable baseline, not cutting edge. Fall back to `@media` only for
genuine viewport-level decisions.

## Forms are namespaces

- A `<form>` declares a namespace: a set of controls that together produce **one
  bundle of values** (a return value).
- Group controls into a `<form>` whenever they form a complete, returnable set —
  even when no HTTP submit will ever happen (a search box, a row filter, a date
  range).
- Assume every page has several forms. Never style `form` or its controls by
  element; style by the `mdm-form-*` domain and the component root.
- Controls inside a form use the shared `mdm-form-*` classes so they stay
  consistent app-wide.

**Nested groups.** A subgroup of controls that itself produces a value bundle
(e.g. a date range inside a filter) is its own namespace. Prefer `<fieldset>`,
which nests legally in HTML and groups exactly this way. A nested `<form>` is
discouraged (invalid HTML) but is acceptable when it reads more clearly; treat it
as a namespace container only — never submit it independently.

## Examples

### Good

```html
<form class="mdm-row-filter">
  <label class="mdm-form-label mdm-u-sr-only" for="query">Search</label>
  <input class="mdm-form-control" id="query" type="search">

  <fieldset class="mdm-date-range-picker">
    <legend class="mdm-form-label">Range</legend>
    <input class="mdm-form-control" type="date">
    <input class="mdm-form-control" type="date">
  </fieldset>

  <button class="mdm-btn mdm-btn-primary" type="button">Apply</button>
</form>
```

```css
.mdm-row-filter { }                      /* component root */
.mdm-row-filter .mdm-form-control { }     /* scoped override, if needed */
.mdm-date-range-picker { }               /* self-contained, liftable */
.mdm-date-range-picker .mdm-form-control { }
.mdm-form-control { }                    /* shared role, styled once */
.mdm-btn { }
.mdm-btn-primary { }
.mdm-u-sr-only { }
```

### Bad

```css
input, textarea { border: 1px solid #ccc; }   /* hits everything */
#filter input[type="date"] { }               /* id + element + attribute */
.form-control { }                             /* unbranded — collides with other tools */
.mdm-row-filter-title { }                      /* re-prefixing a simple child */
.mdm-row-filter-date-picker { }                /* location, not role */
.mdm-date__range--wide { }                     /* underscores, double dash */
```

## Decision guide

| Situation | Do |
|---|---|
| A control appears app-wide and must look identical | Shared domain: `mdm-form-control`, `mdm-btn` |
| A distinct, self-contained UI unit | Component root: `mdm-date-picker`, `mdm-row-filter` |
| A single aspect/state (hidden, sr-only) | Utility: `mdm-u-hidden`, `mdm-u-sr-only` |
| A simple child inside a component | Unprefixed class, styled via `.mdm-root .child` |
| A child that is a real, addressable sub-part | Extend the root prefix: `mdm-row-filter-actions` |
| A group of controls producing one value bundle | `<form>` namespace (+ `mdm-form-*` controls) |
| A subgroup inside a form producing its own bundle | `<fieldset>` (or nested form if clearer) |
| A rule that would leak onto nested elements | `>` / `+` / `~` to restrict it |
| A group of classes that share something in common | Give them a shared prefix (a new role) |
| Something that must be liftable to another project | Prefix by role, never by location |
| A feature is recent, experimental, or poorly supported | Avoid it — stable, widely supported CSS only |
| Starting a component's layout | Mobile-first: stack at ≈340 px, then add rows as space grows |
| A layout must adapt to available space | `@container` first; `@media` only for viewport-level needs |

---

## Practical refinements (this project)

The examples above use a placeholder brand. In practice this project layers a few
deliberate refinements on top of the core rules:

1. **The brand token is `mdm`.** Shared domains are `mdm-btn`, `mdm-link`,
   `mdm-table`, `mdm-u-*`, and so on.

2. **A small set of unprefixed global blocks is allowed.** `.container`,
   `.header`, `.footer`, `.main`, `.wrapper` and `.section` are layout
   scaffolding that expresses *general design intent* — basic indents and basic
   rules, with no project identity. They live in `common.css` and must stay easy
   to override from project-specific styles. A prefix here would add noise
   without adding meaning.

3. **`mdmreport-*` is the report feature domain.** The report feature was built
   first, so its form controls (`.mdmreport-controls`, `.mdmreport-controls-group`,
   `.mdmreport-control`), banner (`.mdmreport-banner`) and diff tables
   (`.mdmreport-table`, `.mdmreport-record`, `.mdmdiff-*`) keep the longer prefix.
   `mdmreport-` = brand `mdm` + feature `report`, read left to right — it names a
   role, not a location, so it stays legal under "roles, not locations".

4. **Modular spacing scale.** All spacing derives from a 30px base unit, with
   named steps: `--mdm-space-2x` (60px), `--mdm-space-1-5x` (45px),
   `--mdm-space` (30px), `--mdm-space-0-5x` (15px), `--mdm-space-0-25x` (7.5px).
   Prefer these steps; deviate only where a value genuinely does not fit (dense
   data tables may use `em` micro-padding).

5. **Form controls are a namespace with a negative-margin row.**
   `.mdmreport-controls` is a `<form>`/`<fieldset>`/`<div>` namespace. Inside it,
   a `.mdmreport-controls-group` is a row whose children (labels, controls) carry
   the gap as horizontal padding; the group compensates with equal negative side
   margins so the row still lines up with its container. Text-like controls
   expand to fill the row (`display: block; width: 100%`); bare action buttons
   stay inline. `.mdmreport-controls-group-nonegmargin` removes the negative
   margins where a row must not bleed.

6. **Buttons, links, tables and utilities live under `mdm-*`.** See `common.css`
   for the catalog: `mdm-btn` (+ `-primary`, `-secondary`, `-confirm`, `-reject`,
   `-close`, `-large`, `-block`, `-link`, `-unstyled`), `mdm-link`
   (+ `-unstyled`, `-underline`), `mdm-table` (+ `-noborder`), and `mdm-u-*`
   (`-hidden`, `-sr-only`, `-clearfix`, `-nowrap`, `-text-muted`, `-text-error`).
