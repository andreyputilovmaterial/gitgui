

import { ref, computed } from 'vue';

import Record from './component_record.js';

import './style.css';

const Records = {
  props: [
    'history',
    'formVerCompareFields',
    'repoStatus',
    'repoActions',
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
>
  <template #default="{ records }">
    <div class="history-records mdm-ui-records">
      <history-record
        v-for="h in records"
        :key="h.hash"
        :hash="h.hash"
        :author="h.author"
        :timestamp="h.timestamp"
        :message="h.message"
        :formVerCompareFields="formVerCompareFields"
        :componentRecordsFiltData="h.componentRecordsFiltData"
        :repoStatus="repoStatus"
        :repoActions="repoActions"
      />
    </div>
  </template>
</component-filter-records-form>
`,
  components: {
    'history-record': Record,
  },
  setup(props) {
    const worktreeTimestamp = ref(new Date());
    const indexTimestamp = ref(new Date());
    const isSomethingInStagingArea = computed(()=> Array.isArray(props.repoStatus?.statusData?.status) && (props.repoStatus?.statusData?.status.filter(f=>f.index!=='.').length>0) );
    const historyWithRecordsForWorktreeAndIndex = computed(()=>[
      { hash: 'worktree', timestamp: worktreeTimestamp.value, },
      ...( isSomethingInStagingArea.value ? [{ hash: 'index', timestamp: indexTimestamp.value, }] : [] ),
      ...props.history,
    ]);

    return {
      historyWithRecordsForWorktreeAndIndex,
    };
  },
};

export default Records;
