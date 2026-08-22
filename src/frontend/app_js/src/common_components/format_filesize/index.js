import { computed } from 'vue';

function formatNumberOfBytes(n) {
  if (Number.isNaN(Number(n))) {
    return String(n);
  }

  if (n < 1000) {
    return `${n} byte${n === 1 ? '' : 's'}`;
  }
  const dims = {
    1000: 'KB',
    1000000: 'MB',
    1000000000: 'GB',
    1000000000000: 'TB',
  };

  const unit = Math.max(
    ...Object.keys(dims)
      .map(Number)
      .filter(v => v <= n)
  );

  const numberInUnits = n / unit;
  const numberWith2DecimalPlaces =
    Math.round(numberInUnits * 100) / 100;

  return `${numberWith2DecimalPlaces} ${dims[unit]}`;
}

const View = {
  props: ['size'],

  template: `
    <span class="mdmreport-role-filesize">{{ formattedNumber }}</span>
  `,

  setup(props) {
    const formattedNumber = computed(() =>
      formatNumberOfBytes(props.size)
    );

    return { formattedNumber };
  },
};

export default View;
