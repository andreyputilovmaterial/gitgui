

import { ref, onMounted } from 'vue';

import './style.css';


import logError from '../../../error_logger/logError';

// import FilesRecords from './component_records';




const View = {
  props: [
    'hashLeft',
    'hashRight',
    'repoStatus',
    'repoCallbacks',
    'resolve','reject', /* could both be called to close this window - parent will destroy the component once called */
  ],
  template: `
<div class="mdm-git-gui-historyfileslistview">
  <p class="description">Compare {{ hashLeft }} and {{ hashRight }}</p>
  <div class="error">{{ error }}</div>
  <template v-if="!files">Quering data, please wait...</template>
  <template v-else-if="!files">
    ...
  </template>
</div>
`,
  components: {
    // 'files-records': FilesRecords,
  },
  setup(props) {

    const files = ref(null);
    const error = ref('');

    const getFiles = async () => {
      function handleResult(outputs) {
        // :<old mode> <new mode> <old oid> <new oid> <status>\t<path>\0
        return [];
      }
      try {
        error.value = '';
        // git diff --raw -z --no-abbrev -M ec18f2c b4c0edf
        const result = await props.repoCallbacks.executeGitBinaryCommand(['git', 'diff', '--raw', '-z', '--no-abbrev', '-M', props.hashLeft, props.hashRight]);
        files.value = handleResult(result);
        error.value = '';
      } catch(e) {
        logError(e);
        logError(`Failed fetching diff for hash "${props.hashLeft}" and "${props.hashRight}"`);
        throw e;
      }
    };

    onMounted(async () => {
      await Promise.all([
        getFiles(),
      ])
    });

    return {
      error,
      files,
    };
  },
};

export default View;
