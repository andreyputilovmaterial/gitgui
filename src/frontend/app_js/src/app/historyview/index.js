
import { ref, reactive, watch, computed, onMounted, toRaw } from 'vue';

import logError from '../../error_logger/logError';

import HistoryRecords from './component_records';

import './style.css';

const View = {
  props: [
    'repoStatus', 'repoCallbacks',
  ],
  template: `
<div class="mdm-git-gui-historyview">
  <p class="description">History of previous commits/backups</p>
  <template v-if="!repoStatus?.history">
    Fetching history...
  </template>
  <template v-else-if="!!repoStatus?.history">
    <form @submit.prevent="handleSubmit" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
      <div class="error">{{ validationMessage }}</div>
      <div class="top-row mdmreport-banner"><fieldset class="mdmreport-controls">Compare selected versions: <button type="submit">Compare</button></fieldset></div>
      <history-records :history="repoStatus?.history" :formVerCompareFields="formVerCompareFields" />
    </form>
  </template>
</div>
`,
  components: {
    'history-records': HistoryRecords,
  },
  setup(props) {

    const isBusy = ref(false);
    const formFields = reactive({
      compareLeft: '',
      compareRight: '',
    });
    const validationMessage = ref('');

    const handleSubmit = async () => {
      try {
        isBusy.value = true;
        validationMessage.value = '';
        if( !formFields.compareLeft ) {
          validationMessage.value = 'Please select some version to compare as Left';
          isBusy.value = false;
          return;
        }
        if( !formFields.compareRight ) {
          validationMessage.value = 'Please select some version to compare as Right';
          isBusy.value = false;
          return;
        }
        throw new Error('Compare: not implemented');
      } catch (err) {
        logError(err);
        logError('Failed to call for version compare window');
        console.error('Failed to call for versioncompare window',err)
        // Promise.resolve().then(()=>{throw err;});
        return props.reject(err)
      } finally {
        isBusy.value = false
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
      isBusy,
      formVerCompareFields: formFields,
      validationMessage,
      handleSubmit,
    };
  },
};

export default View;
