import { computed } from 'vue';

const formatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
});

function formatDate(val) {
  if (val == null) {
    return '';
  }

  const dt = val instanceof Date ? val : new Date(val);

  if (Number.isNaN(dt.getTime())) {
    return String(val);
  }

  return formatter.format(dt);
}

const View = {
  props: ['dt'],

  template: `
<span class="mdmreport-role-date">{{ datetimeFormattedStr }}</span>
`,

  setup(props) {
    const datetimeFormattedStr = computed(() =>
      formatDate(props.dt)
    );

    return { datetimeFormattedStr };
  },
};

export default View;
