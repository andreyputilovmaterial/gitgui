
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';

import './style.css';

// Single-revision detail view (`/#/history/:hash/`). It deliberately shows the
// same basic info already visible on the revisions list — hash, author,
// date/time and commit message — so it adds nothing new; it just gives a
// revision a stable, shareable URL of its own (and a hub from which to open the
// file list). Deep-links work because it loads history on mount before looking
// the revision up.
const View = {
  props: [
    'hash',
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-revisiondetail mdm-git-gui-page-revision-detail">
  <p class="description">Revision <component-format-hash :hash="hash" :highlight="'auto'" /></p>
  <div class="error">{{ error }}</div>
  <template v-if="!loaded">Querying data, please wait...</template>
  <template v-else-if="revision">
    <div class="revision-fields">
      <div v-if="isHead" class="note">Current HEAD</div>
      <div class="revision-field revision-field-hash"><span class="label">Hash: </span><component-format-hash :hash="revision.hash" :highlight="'auto'" /></div>
      <div v-if="hasText(revision.author)" class="revision-field revision-field-author"><span class="label">Author: </span><span class="value">{{ revision.author }}</span></div>
      <div v-if="hasText(revision.timestamp)" class="revision-field revision-field-timestamp"><span class="label">Date/time: </span><component-format-datetime :dt="revision.timestamp" /></div>
      <div v-if="hasText(revision.message)" class="revision-field revision-field-message"><span class="label">Commit message: </span><span class="value">{{ revision.message }}</span></div>
    </div>
    <p class="revision-actions"><a href="#!" @click.prevent="navigateFilesListPage" class="view-files-button">View files in this revision</a></p>
  </template>
  <template v-else>Revision not found.</template>
</div>
`,
  setup(props) {
    const router = useRouter();
    const error = ref('');
    const loaded = ref(false);

    const hasText = value => value !== null && value !== undefined && `${value}`.trim().length > 0;

    const revision = computed(() => {
      const history = Array.isArray(props.repoStatus?.historyData?.history)
        ? props.repoStatus.historyData.history
        : [];
      return history.find(h => h && h.hash === props.hash) || null;
    });

    const isHead = computed(() => {
      const head = props.repoStatus?.historyData?.head;
      return !!head && head === props.hash;
    });

    const navigateFilesListPage = () => {
      router.push({ name: 'history-revision-files', params: { hash: props.hash } });
    };

    const load = async () => {
      error.value = '';
      loaded.value = false;
      try {
        await props.repoActions.updateHistory();
      } catch (e) {
        error.value = e;
      } finally {
        loaded.value = true;
      }
    };

    watch(
      () => props.hash,
      load,
      { immediate: true },
    );

    return {
      error,
      loaded,
      revision,
      isHead,
      hasText,
      navigateFilesListPage,
    };
  },
};

export default View;
