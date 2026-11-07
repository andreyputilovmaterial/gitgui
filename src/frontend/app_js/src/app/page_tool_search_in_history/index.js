
import { ref, computed, onMounted } from 'vue';

import './style.css';

const View = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-tools-search-history mdm-git-gui-page-tools-search-history">
  <p class="description">Find saved revisions by hash, author or commit message.</p>
  <form @submit.prevent="onSubmit" class="mdmreport-controls">
    <div class="mdmreport-controls-group">
      <label class="mdm-u-sr-only" for="tools-search-history-query">Search</label>
      <input id="tools-search-history-query" v-model="query" class="mdmreport-control" type="search" placeholder="hash, author or message…" />
    </div>
  </form>
  <template v-if="!history">Fetching history, please wait…</template>
  <template v-else>
    <p class="summary">{{ results.length }} of {{ history.length }} revisions match.</p>
    <div v-if="results.length" class="mdm-git-gui-tools-search-history-results">
      <div v-for="record in results" :key="record.hash" class="mdm-git-gui-tools-search-history-record">
        <span class="hash"><component-format-hash :hash="record.hash" :highlight="'auto'" /></span>
        <span class="author">{{ record.author }}</span>
        <span class="timestamp"><component-format-datetime :dt="record.timestamp" /></span>
        <span class="message">{{ record.message }}</span>
      </div>
    </div>
    <p v-else class="empty">No revisions match your query.</p>
  </template>
</div>
`,
  setup(props) {
    const query = ref('');

    const history = computed(() => props.repoStatus?.historyData?.history);

    const normalize = (value) => (value == null ? '' : String(value)).toLowerCase();

    const results = computed(() => {
      const list = history.value;
      if (!Array.isArray(list)) return [];
      const q = normalize(query.value).trim();
      if (!q) return list;
      return list.filter((record) =>
        normalize(record.hash).includes(q) ||
        normalize(record.author).includes(q) ||
        normalize(record.message).includes(q)
      );
    });

    const onSubmit = () => {};

    onMounted(async () => {
      await props.repoActions.updateHistory();
    });

    return { query, history, results, onSubmit };
  },
};

export default View;


