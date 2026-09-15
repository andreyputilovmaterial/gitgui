

import { ref, onMounted } from 'vue';

import './style.css';



import FilesRecords from './component_records.js';






const View = {
  props: [
    'hash',
    'repoStatus',
    'repoActions',
    'resolve','reject', /* could both be called to close this window - parent will destroy the component once called */
  ],
  template: `
<div class="mdm-git-gui-historyfileslistview">
  <p class="description">View files from revision <component-format-hash :hash="hash" :highlight="'auto'" /></p>
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

    const getFilesList = async () => {
      const notEmpty = v => { if(!v) return false; if(/^\s*$/.test(v)) return false; return true; };
      try {
        error.value = '';
        const response = await props.repoActions.executeGitCommand(['git','ls-tree','-r','--name-only',props.hash]);
        if( !(response.exit_code===0) || notEmpty(response.stderr) ) {
          const errmsg = `Response from git ls-tree: exit_code == ${response.exit_code}, stderr == "${response.stderr}"`;
          error.value = errmsg;
          throw new Error(errmsg);
        }
        filesList.value = response.stdout.split('\n').filter(a=>a!=='').map(filepath=>({filepath}));
      } catch(e) {
        props.repoActions.logError(e);
        props.repoActions.logError(`Failed fetching file list for hash "${props.hash}"`);
        throw e;
      }
    };

    onMounted(async () => {
      await Promise.all([
        getFilesList(),
      ])
    });

    return {
      filesList, error,
    };
  },
};

export default View;
