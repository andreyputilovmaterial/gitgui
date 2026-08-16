

import Record from './component_record';

import './style.css';

const Records = {
  props: [
    'history',
  ],
  template: `
<div class="history-records">
    <history-record
      v-for="h in history"
      :key="h.hash"
      :hash="h.hash"
      :author="h.author"
      :date="h.date"
      :message="h.message"
    />
</div>
`,
  components: {
    'history-record': Record,
  },
  setup() {
    return {};
  },
};

export default Records;
