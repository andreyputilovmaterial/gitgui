

import { ref, computed } from 'vue';

import Record from './component_record.js';

import './style.css';

const Records = {
  props: [
    'files',
    'path',
    'repoStatus',
    'repoActions',
  ],
  template: `
<component-filter-records-form
:columns="{
  'filepath':'File name',
}"
  :keyField="'filepath'"
  :records="files"
  :needSort="true"
  ref="filteringComponent"
>
  <div class="files-records mdm-ui-records">
    <files-record
        v-for="h in filesSorted"
        :key="h.filepath"
        :filepath="h.filepath"
        :componentRecordsFiltData="h.componentRecordsFiltData"
        :repoStatus="repoStatus"
        :repoActions="repoActions"
        :path="path"
    />
  </div>
</component-filter-records-form>
`,
  components: {
    'files-record': Record,
  },
  setup(props) {

    const filteringComponent = ref(null);

    const isBusy = ref(false);
    const error = ref('');

    const filesSorted = computed(() => {
      if( filteringComponent.value?.paginateAndSort ) {
        return filteringComponent.value?.paginateAndSort(props.files);
      } else {
        // return props.files; // returning all unfiltered results in full list rendered and crash on memory
        return [];
      }
    });

    return {
      isBusy,
      error,
      filteringComponent,
      filesSorted,
    };
  },
};

export default Records;
