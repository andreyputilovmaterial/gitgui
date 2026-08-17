
import { ref, onMounted } from 'vue';

import './style.css';


import logError from '../../error_logger/logError';







const View = {
  props: [
    'resourcepath',
    'contentAsText',
    'repoStatus',
    'repoCallbacks',
    'resolve','reject', /* could both be called to close this window - parent will destroy the component once called */
  ],
  template: `
<div class="mdm-git-gui-fileview">
  <form  @submit.prevent="resolve">
    <fieldset class="mdmreport-controls">
      <p>Hey your file here</p>
      <div class="error">{{ error }}</div>
      <h2>{{ resourcepath }}</h2>
      <textarea readonly disabled class="mdm-git-gui-filecontents">{{ contentAsText }}</textarea>
      <div><input type="submit" value="Close" class="gitgui-button-close"></input></div>
    </fieldset>
  </form>
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
