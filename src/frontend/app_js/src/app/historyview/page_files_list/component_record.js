
import { ref, h } from 'vue';

import PageFileView from '../page_file_view/index';

import logError from '../../../error_logger/logError';

import './style.css';



const notEmpty = v => {
  if(!v) return false;
  if(/^\s*$/.test(v)) return false;
  return true;
};





const Record = {
  props: [
    'filepath',
    'hash',
    'componentFilterRecordsGetClassesCb',
    'repoStatus',
    'repoCallbacks',
  ],
  template: `
<div class="error">{{ error }}</div>
<div :class="[...['files-record','mdm-ui-record'],...componentFilterRecordsGetClassesCb({'filepath':filepath})]" :key="filepath" :data-recordsfilter-filepath="filepath">
  <span class="link-view-file mdm-ui-record-col-view-file mdm-ui-record-col-1" title="View file"><span class="label">View file: </span><a @click.prevent="navigateFileViewPage" href="#!">{{ '{' }}{{ '}' }}</a></span>
  <span class="link-download-file mdm-ui-record-col-download-file mdm-ui-record-col-2" title="Download file"><span class="label">Download file: </span><a @click.prevent="handleDownloadFile" href="#!" download>⇩</a></span>
  <span class="filepath mdm-ui-record-col-filepath mdm-ui-record-col-3" title="File path"><span class="label">File path: </span>{{ filepath }}</span>
</div>
`,
  components: {
  },
  setup(props) {

    const error = ref('');

    const navigateFileViewPage = async () => {
      try {
        await props.repoCallbacks.createPage(h(PageFileView,{...props,hash:props.hash,filepath:props.filepath}));
      } catch(e) {
        if( e instanceof Error ) {
          logError(e);
          logError(`Failed to navigate to page: history-file-view/${props?.hash}`);
          throw e;
        }
      }
    };

    const handleDownloadFile = async () => {
      // git show <revision>:<path>
      // git cat-file blob
      try {
        error.value = '';
        const response = await props.repoCallbacks.executeGitCommand(['git','cat-file','blob',`${props.hash}:${props.filepath}`],true);
        if( !(response.returncode===0) || notEmpty(response.stderr) ) {
          const errmsg = `Response from git show: returncode == ${response.returncode}, stderr == "${response.stderr}"`;
          error.value = errmsg;
          throw new Error(errmsg);
        }
        // filesList.value = response.stdout.split('\n').filter(a=>a!=='');
        console.log('[DEBUG-history-view-file]: request finished, received: ',response.stdout);
        const filename = `${props.filepath}`.split('/').pop()
        const downloadUrl = `${new URL(response.stdout, window.location.origin)}`.replace('%FILENAME%',filename)
        console.log('[DEBUG-history-view-file]: fetching from download url: ',downloadUrl);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        a.click();
        // const fileData = await fetch(
        //   downloadUrl,
        //     {method: 'GET',
        //     headers: {
        //         "Content-Type": "application/octet-stream"
        //     },
        //     body: JSON.stringify(payload),
        //   },
        // );
        // if (!fileData.ok) {
        //   throw new Error(`Download failed: ${response.status}`)
        // };
        // const blob = await fileData.blob();
        // const blobUrl = URL.createObjectURL(blob);
        // const a = document.createElement('a');
        // a.href = blobUrl;
        // a.download = 'report.pdf';
        // a.click();
        // URL.revokeObjectURL(blobUrl);

      } catch(e) {
        logError(e);
        logError(`Failed fetching file for hash "${props.hash}", path "${props.filepath}"`);
        throw e;
      }
    };

    return { navigateFileViewPage, handleDownloadFile, error };
  },
};

export default Record;
