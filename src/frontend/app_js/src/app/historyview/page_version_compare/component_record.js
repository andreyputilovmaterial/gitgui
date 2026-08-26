
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
  // A  Added — new file
  // M  Modified — file contents and/or mode changed
  // D  Deleted — file removed
  // R  Renamed — old path → new path
  // C  Copied — file copied from another path
  // T  Type changed — e.g. regular file ↔ symlink
  // U  Unmerged — unresolved merge conflict

  switch (status[0]) {
    case "A":
      return "Added";
    case "M":
      return "Modified";
    case "D":
      return "Deleted";
    case "R":
      return "Renamed";
    case "C":
      return "Copied";
    case "T":
      return "Type changed";
    case "U":
      return "Unmerged";
    default:
      return status;
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
    'old_path',
    'new_path',
  ],
  template: `
<div class="mdm-git-gui-diff-fileheader">
  <span :class="['status', \`status-\${status}\`]"><status :status="status" /></span>
  <span class="filepath"><code>{{ !!old_path||!!new_path ? \`\${old_path||filepath} -> \${new_path||filepath}\` : filepath }}</code></span>
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
    'componentRecordsFiltData',
  	'repoStatus',
  	'repoCallbacks',
  	'old_mode',
  	'new_mode',
  	'old_oid',
  	'new_oid',
  	'status',
    'path',
    'old_path',
    'new_path',
    'repoStatus',
    'repoCallbacks',
  ],
  template: `
<div :class="[...['diff-record','mdm-ui-record'],...(componentRecordsFiltData?.cssClasses||[])]">
  <component-section-rollup :header="h(RecordHeader,{status,filepath:path,old_path,new_path})" :condensed="false">
    <diff :filepath="path" :blobIdOld="old_oid" :blobIdNew="new_oid" :repoStatus="repoStatus" :repoCallbacks="repoCallbacks" />
  </component-section-rollup>
</div>
`,
  components: {
    'diff': DiffView,
  },
  setup(props) {
    return {
      h,
      RecordHeader,
    };
  },
};

export default Record;
