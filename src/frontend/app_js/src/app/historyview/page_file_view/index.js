
import { ref, onMounted } from 'vue';

import './style.css';


import logError from '../../../error_logger/logError';




const notEmpty = v => {
  if(!v) return false;
  if(/^\s*$/.test(v)) return false;
  return true;
};




const View = {
  props: [
    'hash',
    'filepath',
    'repoStatus',
    'repoCallbacks',
    'resolve','reject', /* could both be called to close this window - parent will destroy the component once called */
  ],
  template: `
<div class="mdm-git-gui-historyfileview">
  <p>Hey your file here</p>
  <div class="error">{{ error }}</div>
  <p>{{hash}}:{{filepath}}</p>
</div>
`,
  components: {
  },
  setup() {

    const error = ref('');

    onMounted(async () => {
      await Promise.all([
        // getFilesList(),
      ])
    });

    return {
      error,
    };
  },
};

export default View;
