
import { ref, reactive, watch, computed, onMounted, toRaw } from 'vue';

import './style.css';

import logError from '../../error_logger/logError';

const View = {
  props: [
    'repoStatus', 'repoCallbacks',
  ],
  template: `
  <div class="mdm-git-gui-verifypack">
    <p class="description">View packed Git archive files.</p>
    <form @submit.prevent="handleGitGC" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
      <div class="error">{{ error }}</div>
      <div class="error">{{ validationMessage }}</div>
      <template v-if="!repoStatus?.history && !error">
        Quering data, please wait...
      </template>
      <template v-else-if="!!repoStatus?.history">
        <div class="top-row mdmreport-banner">
          <fieldset class="mdmreport-controls">
            <component-loader-spinner v-if="isBusy" />
            Cleanup unnecessary files and optimize the local repository: <button type="submit">Start activity</button>
          </fieldset>
        </div>
        Main content here...
      </template>
    </form>
  </div>
`,
  setup(props) {

    const error = ref('');
    const validationMessage = ref('');
    const isBusy = ref(false);

    const handleGitGC = async () => {
      try {
        validationMessage.value = '';
        isBusy.value = true;
        await props.repoCallbacks.executeGitCommand(['git','gc']);
        await new Promise(resolve=>{setTimeout(resolve,5000)});
        validationMessage.value = '';
        isBusy.value = false;
      } catch(e) {
        logError(e);
        logError('Failed when running git gc');
        throw e;
      }
    };

    onMounted(async () => {
      await Promise.all([
        props.repoCallbacks.updateHistory(),
      ])
    });

    watch(() => props?.repoStatus?.history, () => {
      console.log('[DEBUG-history]: new history:',toRaw(props?.repoStatus?.history));
    });

    return {
      error,
      isBusy,
      validationMessage,
      handleGitGC,
    };
  },
};

export default View;
