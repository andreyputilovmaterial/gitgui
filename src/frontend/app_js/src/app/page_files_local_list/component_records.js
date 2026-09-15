

import { ref, computed } from 'vue';

import Record from './component_record.js';

import './style.css';

const Records = {
  props: [
    'files',
    'namespace',
    'path',
    'repoStatus',
    'repoActions',
  ],
  template: `
<component-filter-records-form
:columns="{
  'filepath':'File name',
  'type':'File/directory',
  'size':{ label: 'File file', type:'number' },
  'modifiedAt':{ label: 'Modified at', type:'datetime' },
  'metadataChangedAt':{ label: 'Metadata updated at', type:'datetime' },
  'createdAt':{ label: 'Created at', type:'datetime' },
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
        :namespace="namespace"
        :fullFilepath="h.fullFilepath"
        :type="h.type"
        :size="h.size"
        :modifiedAt="h.modifiedAt"
        :metadataChangedAt="h.metadataChangedAt"
        :createdAt="h.createdAt"
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
