

import { ref, reactive, watch, onMounted, toRaw } from 'vue';


import PageHistoryOverview from './page_history_overview/index';

import './style.css';

const View = {
  props: [
    'repoStatus',
    'repoCallbacks',
  ],
  template: `
<div class="mdm-git-gui-historyview">
  <p class="description">History of previous commits/backups</p>
  <template v-if="!repoStatus?.history">
    Fetching history...
  </template>
  <template v-else-if="!!repoStatus?.history">
    <page-history-overview :repoStatus="repoStatus" :repoCallbacks="repoCallbacks" />
  </template>
</div>
`,
  components: {
    'page-history-overview': PageHistoryOverview,
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

    return {}
  }
};

export default View;
