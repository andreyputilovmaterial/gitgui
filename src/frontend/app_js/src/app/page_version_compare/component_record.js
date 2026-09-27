
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

    async function getContentsFromBlob(blobid,filename=null) {
      if( /^0+$/.test(blobid) )
        return new TextDecoder('utf-8').decode(new Uint8Array([]));
      const jobData = await props.repoActions.executeGitBinaryCommand(['git','cat-file','blob',blobid],{is_binary:true,is_interactive:true,stdout_chunk_size:8192,stderr_chunk_size:8192});
      await jobData.promiseDownloadLinkReady;
      const downloadUrl = jobData.getDownloadUrl(filename||props.new_path);

      const pipeArgs = [ 'textconv', '--filename', filename||props.path||props.new_path ];
      const pipeRequest = await fetch(
        downloadUrl,
        {
          method: 'PUT',
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify([...pipeArgs]),
        },
      );
      if( !pipeRequest.ok ) {
        error.value = `textconv: process failed`;
        props.repoActions.logError('textconv failed');
        throw new Error(await makeFetchResponseErrorMessage(pipeRequest));
      }
      const pipeJobRequestPlaced = await pipeRequest.json();
      const pipeJobId = pipeJobRequestPlaced.job_id;
      const pipeJobData = await props.repoActions.attachToRunningCommand(pipeJobId,{parentJobId:jobData.job_id,is_binary:true,is_interactive:true});
      await jobData.promise;
      if( (jobData.exit_code!==0) || (!!jobData.stderr) ) {
        const msg = `textconv: failed with exit_code ${jobData.exit_code}: ${jobData.stderr}`;
        throw new Error(msg);
      }
      await pipeJobData.promise;
      if( (pipeJobData.exit_code!==0) || (!!pipeJobData.stderr) ) {
        const msg = `textconv: failed with exit_code ${pipeJobData.exit_code}: ${pipeJobData.stderr}`;
        throw new Error(msg);
      }
      await pipeJobData.promiseDownloadLinkReady;
      const response = await fetch( pipeJobData.download_url );
      if( !response.ok ) throw new Error(await makeFetchResponseErrorMessage(response));
      const bufferPromise = response.arrayBuffer();
      await jobData.promise;
      const buffer = await bufferPromise;
      const result = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
      return result;
    }

    const getTextconvOutputsLeft = async () => {
      try{
        error.value = null;
        isBusy.value = true;
        return await getContentsFromBlob(props.old_oid,props.old_path||props.path);
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
        return await getContentsFromBlob(props.new_oid,props.new_path||props.path);
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
