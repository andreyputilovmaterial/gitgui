

import Record from './component_record';

import './style.css';

const Records = {
  props: [
    'history',
    'formVerCompareFields',
  ],
  template: `
<div class="history-records mdm-ui-records">
    <history-record
      v-for="h in history"
      :key="h.hash"
      :hash="h.hash"
      :author="h.author"
      :date="h.date"
      :message="h.message"
      :formVerCompareFields="formVerCompareFields"
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
