
import { ref, reactive, watch, computed, onMounted, toRaw } from 'vue';

import HistoryRecords from './component_records';

import './style.css';

const View = {
  props: [
    'repoStatus', 'repoCallbacks',
  ],
  template: `
<div class="mdm-git-gui-historyview">
  <p class="description">History of previous commits/backups</p>
  <template v-if="!repoStatus?.history">
    Fetching history...
  </template>
  <template v-else-if="!!repoStatus?.history">
    <history-records :history="repoStatus?.history" />
  </template>
</div>
`,
  components: {
    'history-records': HistoryRecords,
  },
  setup(props) {
    onMounted(async () => {
      await Promise.all([
        props.repoCallbacks.updateHistory(),
      ])
    });
    watch(() => props?.repoStatus?.history, () => {
      console.log('[DEBUG-history]: new history:',toRaw(props?.repoStatus?.history));
    });
    return {};
  },
};

export default View;
