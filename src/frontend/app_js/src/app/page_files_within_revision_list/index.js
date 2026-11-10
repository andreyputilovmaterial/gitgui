

import { ref, computed, watch, } from 'vue';

import './style.css';



import FilesRecords from './component_records.js';






const View = {
  props: [
    'hash',
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-historyfileslistview">
  <p class="description">View files from revision <component-format-hash :hash="hash" :highlight="'auto'" /></p>
  <div v-if="revision" class="revision-info">
    <div v-if="hasText(revision.timestamp)" class="revision-info-field revision-info-timestamp"><span class="label">Date/time: </span><component-format-datetime :dt="revision.timestamp" /></div>
    <div v-if="hasText(revision.author)" class="revision-info-field revision-info-author"><span class="label">Author: </span><span class="value">{{ revision.author }}</span></div>
    <div v-if="hasText(revision.message)" class="revision-info-field revision-info-message"><span class="label">Commit message: </span><span class="value">{{ revision.message }}</span></div>
  </div>
  <div class="error">{{ error }}</div>
  <template v-if="!filesList && !error">Querying data, please wait...</template>
  <template v-else-if="!!filesList">
    <files-records :files="filesList" :repoStatus="repoStatus" :repoActions="repoActions" :hash="hash" />
  </template>
</div>
`,
  components: {
    'files-records': FilesRecords,
  },
  setup(props) {

    const filesList = ref(null);
    const error = ref('');

    const hasText = value => value !== null && value !== undefined && `${value}`.trim().length > 0;

    const revision = computed(() => {
      const history = Array.isArray(props.repoStatus?.historyData?.history)
        ? props.repoStatus.historyData.history
        : [];
      return history.find(h => h && h.hash === props.hash) || null;
    });

    const getFilesList = async () => {
      const notEmpty = v => { if(!v) return false; if(/^\s*$/.test(v)) return false; return true; };
      error.value = '';
      filesList.value = null;
      try {
        const response = await props.repoActions.executeGitCommand(['git','ls-tree','-r','--name-only',props.hash]);
        if( !(response.exit_code===0) || notEmpty(response.stderr) ) {
          const errmsg = `Response from git ls-tree: exit_code == ${response.exit_code}, stderr == "${response.stderr}"`;
          error.value = errmsg;
          throw new Error(errmsg);
        }
        filesList.value = response.stdout.split('\n').filter(a=>a!=='').map(filepath=>({filepath}));
      } catch(e) {
        props.repoActions.logError(`Failed fetching file list for hash "${props.hash}": ${e}`);
        throw e;
      }
    };

    watch(
      () => props.hash,
      () => { getFilesList(); },
      { immediate: true },
    );

    // Load history so the revision's author, date/time and commit message are
    // available (deep-linking straight to this page doesn't otherwise load it).
    // updateHistory reports its own errors via repoActions.logError.
    watch(
      () => props.hash,
      async () => {
        try {
          await props.repoActions.updateHistory();
        } catch {
          // Already reported by updateHistory.
        }
      },
      { immediate: true },
    );

    return {
      filesList, error, revision, hasText,
    };
  },
};

export default View;
