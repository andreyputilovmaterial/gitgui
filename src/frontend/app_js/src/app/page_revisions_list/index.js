

import { ref, reactive, computed, onMounted, } from 'vue';
import { useRouter } from 'vue-router';

import './style.css';

import HistoryRecords from './component_records.js';
import HistoryRecordsCompact from './component_records_compact.js';




const View = {
  props: [
    'repoStatus',
    'repoActions',
    'viewMode',
  ],
  template: `
<div class="mdm-git-gui-historyoverview mdm-git-gui-page-history-overview">
  <p v-if="!isCompactView" class="description">History of revisions. Each is a snapshot of your files at that point in time.</p>
  <template v-if="!isCompactView">
    <div class="error">{{ error }}</div>
    <div class="error">{{ validationMessage }}</div>
    <template v-if="!repoStatus?.historyData?.history && !error">
      Querying data, please wait...
    </template>
    <template v-else-if="!!repoStatus?.historyData?.history">
      <form @submit.prevent="handleCompare" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
        <div class="top-row mdmreport-banner"><fieldset class="mdmreport-controls">Compare selected versions: <button type="submit">Compare</button></fieldset></div>
      </form>
      <form @submit.prevent="handleFindInHistory" class="mdmreport-controls mdm-git-gui-history-search">
        <div class="top-row mdmreport-banner">
          <fieldset class="mdmreport-controls">
            <div class="mdm-git-gui-history-search-row">
              <label for="find-in-history-query">Find within history:</label>
              <component-input-regextext
                id="find-in-history-query"
                v-model="searchQuery"
                class="mdm-git-gui-history-search-input"
                placeholder="Search for added or removed text"
              />
              <button type="submit">Search</button>
            </div>
          </fieldset>
        </div>
      </form>
      <history-records
        :history="repoStatus?.historyData?.history"
        :formVerCompareFields="formVerCompareFields"
        :repoStatus="repoStatus"
        :repoActions="repoActions"
      />
    </template>
  </template>
  <template v-else-if="!!repoStatus?.historyData?.history">
    <history-records-compact
      :history="repoStatus?.historyData?.history"
      :formVerCompareFields="formVerCompareFields"
      :repoStatus="repoStatus"
      :repoActions="repoActions"
    />
  </template>
  <template v-else>
    Querying data, please wait...
  </template>
</div>
`,
  components: {
    'history-records': HistoryRecords,
    'history-records-compact': HistoryRecordsCompact,
  },
  setup(props) {

    const router = useRouter();
    const isBusy = ref(false);
    const formFields = reactive({
      compareLeft: '',
      compareRight: '',
    });
    const validationMessage = ref('');
    const error = ref('');
    const searchQuery = ref('');
    const isCompactView = computed(()=>props.viewMode==='compact');

    const navigateVersionComparePage = () => {
      router.push({ name: 'history-compare', params: { left: formFields.compareLeft, right: formFields.compareRight } });
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
        navigateVersionComparePage();
      } catch (err) {
        error.value = err;
        props.repoActions.logError(`Failed to call for version compare window: ${err}`);
        console.error('Failed to call for versioncompare window',err)
      } finally {
        isBusy.value = false
      }
    };

    const handleFindInHistory = async () => {
      // TODO: launch the "find within history" activity here. The submitted
      // query is available as `searchQuery.value`.
    };

    onMounted(async () => {
      await Promise.all([
        props.repoActions.updateHistory(),
      ])
    });

    return {
      isBusy,
      error,
      isCompactView,
      formVerCompareFields: formFields,
      validationMessage,
      searchQuery,
      handleCompare,
      handleFindInHistory,
    };
  },
};

export default View;
