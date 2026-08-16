

import { ref, reactive, watch } from 'vue';

import './style.css';


import logError from '../../../error_logger/logError';

import HistoryRecords from './component_records';




const View = {
  props: [
    'repoStatus',
    'repoCallbacks',
  ],
  template: `
  <form @submit.prevent="handleSubmit" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
    <div class="error">{{ validationMessage }}</div>
    <div class="top-row mdmreport-banner"><fieldset class="mdmreport-controls">Compare selected versions: <button type="submit">Compare</button></fieldset></div>
    <history-records :history="repoStatus?.history" :formVerCompareFields="formVerCompareFields" />
  </form>
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

    return {
      isBusy,
      formVerCompareFields: formFields,
      validationMessage,
      handleSubmit,
    };
  },
};

export default View;
