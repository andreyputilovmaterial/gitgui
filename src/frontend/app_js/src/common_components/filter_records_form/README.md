# filter_records_form

`<component-filter-records-form>` is the uniform **filter + sort + paginate**
wrapper used by every record list in the app. It is globally registered in
`src/frontend/app_js/src/app.js`. Drop a list of records into it and it renders
the filter/sort controls and hands you back the processed list.

## What it gives you, uniformly

- One filter input per column (text / number / datetime), all looking the same.
- Sorting by any column, ascending/descending.
- Pagination (default 25 per page; `recordsPerPage="0"` = no pagination).
- **Two-layer filtering**, so typing is instant and rows don't re-render on every
  keystroke:
  1. Records that have **never** matched are dropped from the rendered list
     entirely (fewer DOM nodes).
  2. Records that **were shown** and then stopped matching are kept in the DOM
     but hidden with CSS (`display: none`), so they can be re-shown instantly.
     After `RECORDS_VISIBILITY_GRACE_MS` (15 s) they are dropped too.

## Props

| Prop            | Type    | Meaning |
|-----------------|---------|---------|
| `columns`       | object  | Filterable columns in display order. Each value is a label string (a `text` column) or `{ label, type }` where `type` is `'text'` (default), `'number'`, or `'datetime'`. |
| `keyField`      | string  | Unique key per record, used to track per-record visibility across re-renders. Defaults to the first column. |
| `records`       | array   | The records to filter / sort / paginate. |
| `needSort`      | boolean | Show the "Sort by" controls. |
| `recordsPerPage`| number  | Page size. `0` = no pagination (all). Default `25`. |

## Usage — list component

Wrap your list in the component and render it through the default slot. The slot
receives `{ records }`: the filtered, sorted, paginated list. Pass
`componentRecordsFiltData` through to each record:

```js
<component-filter-records-form
  :columns="{
    'filepath': 'File name',
    'size': { label: 'File size', type: 'number' },
    'modifiedAt': { label: 'Modified at', type: 'datetime' },
  }"
  :keyField="'filepath'"
  :records="files"
  :needSort="true"
>
  <template #default="{ records }">
    <div class="files-records mdm-ui-records">
      <files-record
        v-for="h in records"
        :key="h.filepath"
        :filepath="h.filepath"
        :size="h.size"
        :modifiedAt="h.modifiedAt"
        :componentRecordsFiltData="h.componentRecordsFiltData"
      />
    </div>
  </template>
</component-filter-records-form>
```

That's the whole contract on the list side — no template `ref`, no `computed`
calling `paginateAndSort`. The component owns the filtering/sorting and passes
the result to the slot.

## Usage — record (leaf) component

Each record component must:

1. declare the `componentRecordsFiltData` prop,
2. expose `recordsFilterClasses` to the template (return it from `setup()`), and
3. spread `recordsFilterClasses(componentRecordsFiltData)` into its root `:class`.

```js
import { recordsFilterClasses } from '@/common_components/filter_records_form/index.js';

const Record = {
  props: [ 'filepath', 'size', 'modifiedAt', 'componentRecordsFiltData' ],
  template: `
    <div :class="['files-record', ...recordsFilterClasses(componentRecordsFiltData)]">
      ...
    </div>
  `,
  setup() {
    return { recordsFilterClasses };
  },
};
```

`recordsFilterClasses` (a named export of the same module) returns the
`cssClasses` array the filter component assigned (e.g. `['hidden']`), or `[]`.
The global rule `.mdm-ui-recordsfilter-content .hidden { display: none; }` then
hides the row.

> The `setup()` return is required: a Vue template can only call functions that
> are returned from `setup()`, declared as props, or registered globally — a bare
> `import` is not enough.

## `componentRecordsFiltData` shape

The filter component attaches (and refreshes) this object on every record it
returns:

- `cssClasses` — array to merge into the record's `:class` (currently
  `['hidden']` when hidden in place).
- `isHidden`, `wasEverShown`, `visibilityLastChanged`, `order`, `orderSource`,
  `prevIsHidden`, `isDead` — internal two-layer-filter bookkeeping. Treat as
  read-only.

## Adding a new column type

1. Create `match/<type>.js` exporting `function match(fieldValue, matchValue)`
   (returns a boolean; an empty `matchValue` must mean "match everything").
2. Import it in `index.js` and add a branch in `shouldRecordBeShown`.
3. Add a branch in the template's `:is` switch to pick the input component for
   that type.

## Gotchas

- `keyField` must be unique per record, or visibility tracking breaks.
- The "5-minute" grace period is now `RECORDS_VISIBILITY_GRACE_MS` (15 s) in
  `index.js`.
- `recordsPerPage` defaults to 25.

