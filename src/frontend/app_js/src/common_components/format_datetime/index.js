import { computed } from 'vue';

import './style.css';

// Full form: the complete, locale-aware date/time exactly as the browser renders
// it natively (what this component used to print on its own).
const formatterFull = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
});

// Short form: either just the date or just the time, in the browser's local
// timezone (same one the full form uses).
const formatterDateOnly = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const formatterTimeOnly = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

function toDate(val) {
  if (val == null) {
    return null;
  }

  const dt = val instanceof Date ? val : new Date(val);

  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatFull(val) {
  if (val == null) {
    return '';
  }

  const dt = toDate(val);

  if (dt === null) {
    return String(val);
  }

  return formatterFull.format(dt);
}

function formatShort(val) {
  if (val == null) {
    return '';
  }

  const dt = toDate(val);

  if (dt === null) {
    return String(val);
  }

  // "today" is compared on the local calendar day, so a date/time that belongs
  // to the current local day is shortened to just its time; anything else is
  // shortened to just its date.
  const now = new Date();
  const isToday = dt.getFullYear() === now.getFullYear()
    && dt.getMonth() === now.getMonth()
    && dt.getDate() === now.getDate();

  return isToday ? formatterTimeOnly.format(dt) : formatterDateOnly.format(dt);
}

const View = {
  props: ['dt'],

  template: `
<span class="mdmreport-role-date">
  <span class="mdmreport-role-date-full">{{ datetimeFullStr }}</span>
  <span class="mdmreport-role-date-short" :title="datetimeFullStr">{{ datetimeShortStr }}</span>
</span>
`,

  setup(props) {
    const datetimeFullStr = computed(() =>
      formatFull(props.dt)
    );
    const datetimeShortStr = computed(() =>
      formatShort(props.dt)
    );

    return { datetimeFullStr, datetimeShortStr };
  },
};

export default View;
