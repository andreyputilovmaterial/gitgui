

import { ref, computed } from 'vue';

import RecordCompact from './component_record_compact.js';

import './style.css';

const Records = {
  props: [
    'files',
    'namespace',
    'path',
    'navigate',
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="" v-if="!fileStatusInfoReady">Waiting for info on status of files in git...</div>
<component-filter-records-form
v-else
:columns="{
  'filepath':'File name',
  'modifiedAt':{ label: 'Modified at', type:'datetime' },
  'size':{ label: 'File size', type:'number' },
}"
  :keyField="'filepath'"
  :records="files"
  :needSort="true"
>
  <template #default="{ records }">
    <div class="files-records mdm-ui-records files-records-compact">
      <files-record-compact
          v-for="h in records"
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
          :navigate="navigate"
          :repoStatus="repoStatus"
          :repoActions="repoActions"
      />
    </div>
  </template>
</component-filter-records-form>
`,
  components: {
    'files-record-compact': RecordCompact,
  },
  setup(props) {

    const isBusy = ref(false);
    const error = ref('');
    const fileStatusInfoReady = computed(()=>Array.isArray(props.repoStatus?.statusData?.status)&&Array.isArray(props.repoStatus?.statusData?.trackedFiles));

    return {
      isBusy,
      error,
      fileStatusInfoReady,
    };
  },
};

export default Records;
