

import { ref, computed } from 'vue';

import Record from './component_record';

import './style.css';

const Records = {
  props: [
    'files',
    'hash',
    'repoStatus',
    'repoCallbacks',
  ],
  template: `
<component-filter-records-form
  :columns="{'filepath':'File path'}"
  :needSort="true"
  ref="filteringComponent"
>
  <div class="files-records mdm-ui-records">
    <files-record
      v-for="h in files"
      :key="h"
      :filepath="h"
      :generateFileringCssClasses="!!filteringComponent ? filteringComponent?.generateFileringCssClasses : ()=>[]"
      :repoStatus="repoStatus"
      :repoCallbacks="repoCallbacks"
      :hash="hash"
    />
  </div>
</component-filter-records-form>
`,
  components: {
    'files-record': Record,
  },
  setup(props) {
    const filteringComponent = ref(null);
    const filesSorted = computed(()=> !!filteringComponent && !!filteringComponent?.sort ? filteringComponent?.sort(props.files) : props.files );
    return {
      filteringComponent,
      filesSorted,
    };
  },
};

export default Records;
