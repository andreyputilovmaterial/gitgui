

import { ref, reactive, h } from 'vue';

import './style.css';

import PageVersionCompare from '../page_version_compare/index';

import HistoryRecords from './component_records';




const View = {
  props: [
    'repoStatus',
    'repoActions',
    'resolve','reject', /* could both be called to close this window - parent will destroy the component once called */
  ],
  template: `
<div class="mdm-git-gui-historyoverview mdm-git-gui-page-history-overview">
  <p class="description">History of revisions. Each is a snapshot of your files at that point in time.</p>
  <form @submit.prevent="handleCompare" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
    <div class="error">{{ error }}</div>
    <div class="error">{{ validationMessage }}</div>
    <template v-if="!repoStatus?.history && !error">
      Querying data, please wait...
    </template>
    <template v-else-if="!!repoStatus?.history">
      <div class="top-row mdmreport-banner"><fieldset class="mdmreport-controls">Compare selected versions: <button type="submit">Compare</button></fieldset></div>
      <history-records :history="repoStatus?.history" :formVerCompareFields="formVerCompareFields" :repoStatus="repoStatus" :repoActions="repoActions" />
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
      await props.repoActions.createPage(h(PageVersionCompare,{...props,hashLeft:formFields.compareLeft,hashRight:formFields.compareRight}));
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
        props.repoActions.logError(err);
        props.repoActions.logError('Failed to call for version compare window');
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
