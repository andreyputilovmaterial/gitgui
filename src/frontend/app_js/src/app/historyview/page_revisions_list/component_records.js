

import { ref, computed, reactive } from 'vue';

import Record from './component_record';

import './style.css';

const Records = {
  props: [
    'history',
    'formVerCompareFields',
    'repoStatus',
    'repoCallbacks',
  ],
  template: `
<component-filter-records-form
  :columns="{
    'hash': 'Hash',
    'author': 'Author',
    'timestamp': {label:'Date/time',type:'datetime',},
    'message': 'Commit message'
  }"
  :keyField="'hash'"
  :records="historyWithRecordsForWorktreeAndIndex"
  :needSort="true"
  ref="filteringComponent"
>
  <div class="history-records mdm-ui-records">
    <history-record
      v-for="h in historySorted"
      :key="h.hash"
      :hash="h.hash"
      :author="h.author"
      :timestamp="h.timestamp"
      :message="h.message"
      :formVerCompareFields="formVerCompareFields"
      :componentRecordsFiltData="h.componentRecordsFiltData"
      :repoStatus="repoStatus"
      :repoCallbacks="repoCallbacks"
    />
  </div>
</component-filter-records-form>
`,
  components: {
    'history-record': Record,
  },
  setup(props) {
    const filteringComponent = ref(null);
    const worktreeTimestamp = ref(new Date());
    const indexTimestamp = ref(new Date());
    const historyWithRecordsForWorktreeAndIndex = computed(()=>[
      { hash: 'worktree', timestamp: worktreeTimestamp.value, },
      ...( props?.repoStatus?.isSomethingInStagingArea ? [{ hash: 'index', timestamp: indexTimestamp.value, }] : [] ),
      ...props.history,
    ]);

    const historySorted = computed(()=> {
      if( filteringComponent.value?.paginateAndSort ) {
        return filteringComponent.value?.paginateAndSort(historyWithRecordsForWorktreeAndIndex.value);
      } else {
        // return historyWithRecordsForWorktreeAndIndex.value; // returning all unfiltered results in full list rendered and crash on memory
        return [];
      }
    });

    return {
      filteringComponent,
      historyWithRecordsForWorktreeAndIndex,
      historySorted,
    };
  },
};

export default Records;
