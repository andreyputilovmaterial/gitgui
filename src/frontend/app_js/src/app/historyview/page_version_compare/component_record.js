
import { h, computed } from 'vue';

import DiffView from './diffview';

import './style.css';



// old_mode: "000000",
// new_mode: "100644",
// old_oid: "0000000000000000000000000000000000000000",
// new_oid: "33e0cb25e00b89f3bd9feeb51eb7b62033c54d67",
// status: "A",
// path: "let.me",

// // status:
// A	Added — new file
// M	Modified — file contents and/or mode changed
// D	Deleted — file removed
// R	Renamed — old path → new path
// C	Copied — file copied from another path
// T	Type changed — e.g. regular file ↔ symlink
// U	Unmerged — unresolved merge conflict

// // Permissiom mask:
function gitModeToString(mode) {
  mode = String(mode).padStart(6, "0");

  switch (mode) {
    case "100644":
      return "-rw-r--r--";
    case "100755":
      return "-rwxr-xr-x";
    case "120000":
      return "lrwxrwxrwx";
    case "160000":
      return "gitlink";
    case "000000":
      return "(none)";
    default:
      return mode;
  }
}

function gitStatusToString(status) {
// A	Added — new file
// M	Modified — file contents and/or mode changed
// D	Deleted — file removed
// R	Renamed — old path → new path
// C	Copied — file copied from another path
// T	Type changed — e.g. regular file ↔ symlink
// U	Unmerged — unresolved merge conflict
  switch (status) {
    case "A":
      return "Added"; // Added - new file
    case "M":
      return "Modified"; // Modified - file contents and/or mode changed
    case "D":
      return "Deleted"; // Deleted - file removed
    case "R":
      return "Renamed"; // Renamed - old path → new path
    case "C":
      return "Copied"; // Copied - file copied from another path
    case "T":
      return "Type changed"; // Type changed - e.g. regular file ↔ symlink
    case "U":
      return "Unmerged"; // Unmerged - unresolved merge conflict
    default:
      return status
  }
}

const Status = {
  props: [ 'status' ],
  template: `{{ gitStatusToString(status) }}`,
  setup() {
    return { gitStatusToString };
  },
};

const RecordHeader = {
  props: [
    'status',
    'filepath',
  ],
  template: `
<div class="mdm-git-gui-diff-fileheader">
  <span :class="['status', \`status-\${status}\`]"><status :status="status" /></span>
  <span class="filepath"><code>{{ filepath }}</code></span>
</div>
`,
  components: {
    'status': Status,
  },
  setup() {
    return {};
  },
}

const Record = {
  props: [
    'generateFileringCssClasses',
  	'repoStatus',
  	'repoCallbacks',
  	'old_mode',
  	'new_mode',
  	'old_oid',
  	'new_oid',
  	'status',
  	'path',
    'repoStatus', 'repoCallbacks',
  ],
  template: `
<div :class="[...['diff-record','mdm-ui-record'],...filteringClasses]">
  <component-section-rollup :header="h(RecordHeader,{'status':status,'filepath':path,})" :condensed="false">
    <diff :filepath="path" :blobIdOld="old_oid" :blobIdNew="new_oid" :repoStatus="repoStatus" :repoCallbacks="repoCallbacks" />
  </component-section-rollup>
</div>
`,
  components: {
    'diff': DiffView,
  },
  setup(props) {
    const filteringClasses = computed(()=>props.generateFileringCssClasses(props));
    return {
      h,
      RecordHeader,
      filteringClasses,
    };
  },
};

export default Record;
