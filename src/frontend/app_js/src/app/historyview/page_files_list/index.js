

import { ref, reactive, watch } from 'vue';

import './style.css';


import logError from '../../../error_logger/logError';

import FilesRecords from './component_records';




const View = {
  props: [
    'hash',
    'repoStatus',
    'repoCallbacks',
    'resolve','reject', /* could both be called to close this window - parent will destroy the component once called */
  ],
  template: `
  <p class="description">View files from hash {{ hash }}</p>
`,
  components: {
    'files-records': FilesRecords,
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
