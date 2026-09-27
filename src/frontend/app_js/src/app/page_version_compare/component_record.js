
import { h, ref } from 'vue';

import DiffView from './diffview.js';

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
  	'repoActions',
  	'old_mode',
  	'new_mode',
  	'old_oid',
  	'new_oid',
  	'status',
    'path',
    'old_path',
    'new_path',
    'repoStatus',
    'repoActions',
  ],
  template: `
<div :class="['diff-record','mdm-ui-record','mdm-git-gui-diff-record',...(isBusy?['is-busy']:[]),...(componentRecordsFiltData?.cssClasses||[])]">
  <component-section-rollup :header="h(RecordHeader,{status,filepath:path,old_path,new_path})" :condensed="false">
    <form class="choose-textconv-params mdm-git-gui-diff-record-inner" action="#!" @submit.prevent="()=>undefined">
      <div class="error" style="color: #900; font-weight: 500;">{{ error }}</div>
      Choose textconv processor...
      <diff
        :filepath="path"
        :filepathLeft="old_path"
        :filepathRight="new_path"
        :getTextconvOutputsLeft="getTextconvOutputsLeft"
        :getTextconvOutputsRight="getTextconvOutputsRight"
        :repoStatus="repoStatus"
        :repoActions="repoActions"
      />
      <div class="is-busy-overlay">Working on it, please wait...</div>
    </form>
  </component-section-rollup>
</div>
`,
  components: {
    'diff': DiffView,
  },
  setup(props) {

    const error = ref(null);
    const isBusy = ref(false);

    function gitEntryType(mode) {
        const m = parseInt(mode, 8);
        if(m===0)
          return "nocontent";
        const type = m & 0o170000;

        switch (type) {
            case 0o100000:
                return "blob";       // regular file
            case 0o120000:
                return "symlink";
            case 0o160000:
                return "gitlink";    // submodule
            case 0o040000:
                return "tree";       // directory
            default:
                return "unknown";
        }
    }
    
    async function getContentsFromBlob(blobid,filemode,filename=null) {
      const filetype = gitEntryType(filemode);
      if( (filetype==='nocontent') )
        return await props.repoActions.textconvParseHeaders('');
      else if( !(filetype==='blob') )
        return await props.repoActions.textconvParseHeaders(`${filetype} ${blobid}`);
      return await props.repoActions.catFileTextconv(blobid,filename||props.new_path);
    }

    const getTextconvOutputsLeft = async () => {
      try{
        error.value = null;
        isBusy.value = true;
        return await getContentsFromBlob(props.old_oid,props.old_mode,props.old_path||props.path);
      } catch(e) {
        error.value = e;
        props.repoActions.logError(e);
        props.repoActions.logError('Failed when preparing diff results');
        throw e;
      } finally {
        isBusy.value = false;
      }
    };

    const getTextconvOutputsRight = async () => {
      try {
        error.value = null;
        isBusy.value = true;
        return await getContentsFromBlob(props.new_oid,props.new_mode,props.new_path||props.path);
      } catch(e) {
        error.value = e;
        props.repoActions.logError(e);
        props.repoActions.logError('Failed when preparing diff results');
        throw e;
      } finally {
        isBusy.value = false;
      }
    };

    return {
      error,
      isBusy,
      h,
      RecordHeader,
      getTextconvOutputsLeft,
      getTextconvOutputsRight,
    };

  },
};

export default Record;
