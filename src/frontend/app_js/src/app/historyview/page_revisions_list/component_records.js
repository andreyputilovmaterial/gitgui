

import { ref, computed } from 'vue';

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
  :columns="{'hash':'Hash','author':'Author','timestamp':{label:'Date/time',type:'datetime',},'message':'Commit message'}"
  :needSort="true"
  ref="filteringComponent"
>
  <div class="history-records mdm-ui-records">
    <history-record
      :key="'worktree'"
      :hash="'worktree'"
      :author="''"
      :timestamp="''"
      :message="''"
      :formVerCompareFields="formVerCompareFields"
      :generateFileringCssClasses="!!filteringComponent ? filteringComponent?.generateFileringCssClasses : ()=>[]"
      :repoStatus="repoStatus"
      :repoCallbacks="repoCallbacks"
    />
    <history-record
      v-if="repoStatus.isSomethingInStagingArea"
      :key="'index'"
      :hash="'index'"
      :author="''"
      :timestamp="''"
      :message="''"
      :formVerCompareFields="formVerCompareFields"
      :generateFileringCssClasses="!!filteringComponent ? filteringComponent?.generateFileringCssClasses : ()=>[]"
      :repoStatus="repoStatus"
      :repoCallbacks="repoCallbacks"
    />
    <history-record
      v-for="h in historySorted"
      :key="h.hash"
      :hash="h.hash"
      :author="h.author"
      :timestamp="h.timestamp"
      :message="h.message"
      :formVerCompareFields="formVerCompareFields"
      :generateFileringCssClasses="!!filteringComponent ? filteringComponent?.generateFileringCssClasses : ()=>[]"
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
    const historySorted = computed(()=> !!filteringComponent && !!filteringComponent?.sort ? filteringComponent?.sort(props.history) : props.history );
    return {
      filteringComponent,
      historySorted,
    };
  },
};

export default Records;
