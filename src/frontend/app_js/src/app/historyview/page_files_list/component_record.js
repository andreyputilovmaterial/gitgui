
import { ref } from 'vue';

import './style.css';




const Record = {
  props: [
    'filepath',
    'componentFilterRecordsGetClassesCb',
    'repoStatus',
    'repoCallbacks',
  ],
  template: `
<div :class="[...['files-record','mdm-ui-record'],...componentFilterRecordsGetClassesCb({'filepath':filepath})]" :key="filepath" :data-recordsfilter-filepath="filepath">
  <span class="link-view-file mdm-ui-record-col-view-file mdm-ui-record-col-1" title="View file"><span class="label">View file: </span><a href="">{{ '{' }}{{ '}' }}</a></span>
  <span class="link-download-file mdm-ui-record-col-download-file mdm-ui-record-col-2" title="Download file"><span class="label">Download file: </span><a href="">⇩</a></span>
  <span class="filepath mdm-ui-record-col-filepath mdm-ui-record-col-3" title="File path"><span class="label">File path: </span>{{ filepath }}</span>
</div>
`,
  components: {
  },
  setup() {
    return {};
  },
};

export default Record;
