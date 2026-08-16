

import { ref } from 'vue';

import Record from './component_record';

import './style.css';

const Records = {
  props: [
    'files',
    'repoStatus',
    'repoCallbacks',
  ],
  template: `
<component-filter-records-form :columns="{'filepath':'File path'}" :setComponentFilterRecordsClasses="setComponentFilterRecordsClasses">
  <div class="files-records mdm-ui-records">
    <files-record
      v-for="h in files"
      :key="h"
      :filepath="h"
      :componentFilterRecordsGetClassesCb="componentFilterRecordsGetClassesCb"
      :repoStatus="repoStatus"
      :repoCallbacks="repoCallbacks"
    />
  </div>
</component-filter-records-form>
`,
  components: {
    'files-record': Record,
  },
  setup(props) {
    const componentFilterRecordsGetClassesCb = ref(()=>[]);
    const setComponentFilterRecordsClasses = cb => componentFilterRecordsGetClassesCb.value = cb;
    return { componentFilterRecordsGetClassesCb, setComponentFilterRecordsClasses };
  },
};

export default Records;
