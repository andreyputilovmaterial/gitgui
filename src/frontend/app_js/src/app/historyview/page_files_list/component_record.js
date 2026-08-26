
import { ref, h, computed } from 'vue';

import PageFileView from '../../../app/fileviewerview/index';

import logError from '../../../error_logger/logError';

import './style.css';





const Record = {
  props: [
    'filepath',
    'hash',
    'componentRecordsFiltData',
    'showBulkRestoreCheckbox',
    'bulkRestoreVModel',
    'repoStatus',
    'repoCallbacks',
  ],
  // <input type="checkbox" id="vehicle2" name="vehicle2" value="Car">
  template: `
<div :class="[...['files-record','mdm-ui-record'],...(componentRecordsFiltData?.cssClasses||[])]" :key="filepath" :data-recordsfilter-filepath="filepath">
  <div class="error">{{ error }}</div>
  <div v-if="showBulkRestoreCheckbox" class="mdmreport-controls-group bulk-restore-checkbox-outer"><input v-model="bulkRestoreVModel.checked" class="bulk-restore-checkbox mdmreport-control" type="checkbox" :value="filepath"></div>
  <span class="link-view-file mdm-ui-record-col-view-file mdm-ui-record-col-1" title="View file"><component-loader-spinner v-if="fileViewLinkBusy" /><span class="label">View file: </span><a @click.prevent="navigateFileViewPage" href="#!">{{ '{' }}{{ '}' }}</a></span>
  <span class="link-download-file mdm-ui-record-col-download-file mdm-ui-record-col-2" title="Download file"><component-loader-spinner v-if="fileDownloadLinkBusy" /><span class="label">Download file: </span><a @click.prevent="handleDownloadFile" href="#!" download>⇩</a></span>
  <span class="filepath mdm-ui-record-col-filepath mdm-ui-record-col-3" title="File path"><span class="label">File path: </span>{{ filepath }}</span>
</div>
`,
  components: {
  },
  setup(props) {

    const error = ref('');
    const fileViewLinkBusy = ref(false);
    const fileDownloadLinkBusy = ref(false);;

    const navigateFileViewPage = async () => {
      try {
        fileViewLinkBusy.value = true;
        const resourcepath = `${props.hash}:${props.filepath}`;
        const filename = `${resourcepath}`.split('/').pop();

        error.value = '';
        const fileDataByteArray = await props.repoCallbacks.executeGitBinaryCommand(['git','cat-file','blob',`${props.hash}:${props.filepath}`]);
        const fileDataSize = fileDataByteArray.byteLength;

        // // Common Ecosystem Conversions

        // // To a DOM Image (Browser):
        // const blob = new Blob([buffer], { type: "image/jpeg" });
        // const imgUrl = URL.createObjectURL(blob);
        // document.querySelector("img").src = imgUrl;

        // // To utf-8 string:
        // // 2. Instantiate a TextDecoder for UTF-8
        // const decoder = new TextDecoder("utf-8");
        // // 3. Decode the ArrayBuffer into text
        // const text = decoder.decode(buffer);

        const contentAsText = await props.repoCallbacks.textconv(fileDataByteArray,filename);

        await props.repoCallbacks.createModal(h(PageFileView,{...props,resourcepath:resourcepath,contentAsText:contentAsText}));

        fileViewLinkBusy.value = false;
        error.value = '';

      } catch(e) {
        if( e instanceof Error ) {
          logError(e);
          logError(`Failed to navigate to page: history-file-view/${props?.hash}`);
          fileViewLinkBusy.value = false;
          throw e;
        }
        fileViewLinkBusy.value = false;
      } finally {
        fileViewLinkBusy.value = false;
      }
    };

    const handleDownloadFile = async () => {
      // git show <revision>:<path>
      // git cat-file blob
      const notEmpty = v => { if(!v) return false; if(/^\s*$/.test(v)) return false; return true; };
      try {
        fileDownloadLinkBusy.value = true;
        error.value = '';
        const response = await props.repoCallbacks.executeGitCommand(['git','cat-file','blob',`${props.hash}:${props.filepath}`],true);
        if( !(response.returncode===0) || notEmpty(response.stderr) ) {
          const errmsg = `Response from git show: returncode == ${response.returncode}, stderr == "${response.stderr}"`;
          error.value = errmsg;
          throw new Error(errmsg);
        }
        console.log('[DEBUG-history-download-file]: request finished, received: ',response.stdout);
        const filename = `${props.filepath}`.split('/').pop()
        const downloadUrl = `${new URL(response.stdout, window.location.origin)}`.replace('%FILENAME%',filename)
        console.log('[DEBUG-history-download-file]: fetching from download url: ',downloadUrl);
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
        //   },
        // );
        // if (!fileData.ok) {
        //   throw new Error(`Download failed: HTTP: ${fileData.status}`)
        // };
        // const blob = await fileData.blob();
        // const blobUrl = URL.createObjectURL(blob);
        // const a = document.createElement('a');
        // a.href = blobUrl;
        // a.download = 'report.pdf';
        // a.click();
        // URL.revokeObjectURL(blobUrl);
        error.value = '';
        fileDownloadLinkBusy.value = false;

      } catch(e) {
        logError(e);
        logError(`Failed fetching file for hash "${props.hash}", path "${props.filepath}"`);
        fileDownloadLinkBusy.value = false;
        throw e;
      } finally {
        fileDownloadLinkBusy.value = false;
      }
    };

    return {
      navigateFileViewPage,
      handleDownloadFile,
      fileViewLinkBusy,
      fileDownloadLinkBusy,
      error,
    };
  },
};

export default Record;
