

import { ref, reactive, watch } from 'vue';

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
  <p class="description">Compare {{ hashLeft }} and {{ hashRight }}</p>
`,
  components: {
    // 'files-records': FilesRecords,
  },
  setup() {

    return {

    };
  },
};

export default View;
