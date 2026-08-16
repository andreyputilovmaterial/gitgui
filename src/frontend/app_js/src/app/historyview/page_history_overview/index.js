

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
  <p class="description">History of previous commits/backups. Each is a snapshot of previous state. "Hash" is something like backup id - every snapshot is identified by its hash (first 7 letters are usually enough for addressing backups/commits in history for git).</p>
  <form @submit.prevent="handleSubmit" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
    <div class="error">{{ validationMessage }}</div>
    <div class="top-row mdmreport-banner"><fieldset class="mdmreport-controls">Compare selected versions: <button type="submit">Compare</button></fieldset></div>
    <history-records :history="repoStatus?.history" :formVerCompareFields="formVerCompareFields" :repoStatus="repoStatus" :repoCallbacks="repoCallbacks" />
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

    const navigateVersionComparePage = async () => {
      await props.repoCallbacks.createPage(h(PageVersionCompare,{...props,hashLeft:formFields.compareLeft,hashRight:formFields.compareRight}));
    };

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
        await navigateVersionComparePage();
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
