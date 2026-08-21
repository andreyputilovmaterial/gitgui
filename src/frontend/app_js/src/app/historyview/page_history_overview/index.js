

import { ref, reactive, watch, h } from 'vue';

import './style.css';

import PageVersionCompare from '../page_version_compare/index';

import logError from '../../../error_logger/logError';

import HistoryRecords from './component_records';




const View = {
  props: [
    'repoStatus',
    'repoCallbacks',
    'resolve','reject', /* could both be called to close this window - parent will destroy the component once called */
  ],
  template: `
<div class="mdm-git-gui-historylogview">
  <p class="description">History of revisions. Each is a snapshot of your files at that point in time.</p>
  <form @submit.prevent="handleCompare" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
    <div class="error">{{ error }}</div>
    <div class="error">{{ validationMessage }}</div>
    <template v-if="!repoStatus?.history && !error">
      Quering data, please wait...
    </template>
    <template v-else-if="!!repoStatus?.history">
      <div class="top-row mdmreport-banner"><fieldset class="mdmreport-controls">Compare selected versions: <button type="submit">Compare</button></fieldset></div>
      <history-records :history="repoStatus?.history" :formVerCompareFields="formVerCompareFields" :repoStatus="repoStatus" :repoCallbacks="repoCallbacks" />
    </template>
  </form>
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
    const error = ref('');

    const navigateVersionComparePage = async () => {
      await props.repoCallbacks.createPage(h(PageVersionCompare,{...props,hashLeft:formFields.compareLeft,hashRight:formFields.compareRight}));
    };

    const handleCompare = async () => {
      try {
        isBusy.value = true;
        error.value = '';
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
        await navigateVersionComparePage();
      } catch (err) {
        error.value = err;
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
      error,
      formVerCompareFields: formFields,
      validationMessage,
      handleCompare,
    };
  },
};

export default View;
