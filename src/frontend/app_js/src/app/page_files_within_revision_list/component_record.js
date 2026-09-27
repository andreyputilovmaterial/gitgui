
import { ref, h } from 'vue';

import { makeFetchResponseErrorMessage } from '@/common_defs/helper_functions.js';

import PageFileView from '@/app/window_fileviewer/index.js';

import './style.css';





const Record = {
  props: [
    'filepath',
    'hash',
    'componentRecordsFiltData',
    'showBulkRestoreCheckbox',
    'bulkRestoreVModel',
    'repoStatus',
    'repoActions',
  ],
  // <input type="checkbox" id="vehicle2" name="vehicle2" value="Car">
  template: `
<div :class="[...['files-record','mdm-ui-record'],...(componentRecordsFiltData?.cssClasses||[])]" :key="filepath" :data-recordsfilter-filepath="filepath">
  <div class="error">{{ error }}</div>
  <div v-if="showBulkRestoreCheckbox" class="mdmreport-controls-group bulk-restore-checkbox-outer"><input v-model="bulkRestoreVModel.checked" class="bulk-restore-checkbox mdmreport-control" type="checkbox" :value="filepath"></div>
  <span class="link-view-file mdm-ui-record-col-view-file mdm-ui-record-col-1" title="View file"><component-loader-spinner v-if="fileViewLinkBusy && !fileViewLinkWindowIsOpen" /><span class="label">View file: </span><a @click.prevent="navigateFileViewPage" href="#!">{{ '{' }}{{ '}' }}</a></span>
  <span class="link-download-file mdm-ui-record-col-download-file mdm-ui-record-col-2" title="Download file"><component-loader-spinner v-if="fileDownloadLinkBusy" /><span class="label">Download file: </span><a @click.prevent="handleDownloadFile" href="#!" download>⇩</a></span>
  <span class="filepath mdm-ui-record-col-filepath mdm-ui-record-col-3" title="File path"><span class="label">File path: </span>{{ filepath }}</span>
</div>
`,
  setup(props) {

    const error = ref('');
    const fileViewLinkBusy = ref(false);
    const fileViewLinkWindowIsOpen = ref(false);
    const fileDownloadLinkBusy = ref(false);;

    const navigateFileViewPage = async () => {
      try {
        fileViewLinkBusy.value = true;
        fileViewLinkWindowIsOpen.value = false;
        const resourcepath = `${props.hash}:${props.filepath}`;
        const filename = `${resourcepath}`.replace(/^\w+:/ig,'').replace(/\/\\/ig,'/').split('/').pop();

        error.value = '';
        const content = await props.repoActions.catFileTextconv(`${props.hash}:${props.filepath}`,filename,props.filepath);

        try {
          fileViewLinkWindowIsOpen.value = true;
          await props.repoActions.createModal(h(PageFileView,{
            ...props,
            resourcepath: resourcepath,
            size: content?.headersRecognized?.bytes_consumed,
            contentAsText: content.text,
            contentHeaders: content.headers,
            headersRecognized: content.headersRecognized,
          }));
        } finally {
          fileViewLinkWindowIsOpen.value = false;
        }

        fileViewLinkBusy.value = false;
        error.value = '';

      } catch(e) {
        if( e instanceof Error ) {
          props.repoActions.logError(e);
          props.repoActions.logError(`Failed to navigate to page: history-file-view/${props?.hash}`);
          error.value = e;
          fileViewLinkBusy.value = false;
          throw e;
        }
        fileViewLinkBusy.value = false;
      } finally {
        fileViewLinkBusy.value = false;
        fileViewLinkWindowIsOpen.value = false;
      }
    };

    const handleDownloadFile = async () => {
      // git show <revision>:<path>
      // git cat-file blob
      const notEmpty = v => { if(!v) return false; if(/^\s*$/.test(v)) return false; return true; };
      try {
        fileDownloadLinkBusy.value = true;
        error.value = '';
        const jobData = await props.repoActions.executeGitBinaryCommand(['git','cat-file','blob',`${props.hash}:${props.filepath}`],{is_interactive:true,});
        await jobData.promiseDownloadLinkReady;
        const filename = `${props.filepath}`.split('/').pop();
        const downloadUrl = await jobData.getDownloadUrl(filename);
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
        props.repoActions.logError(e);
        props.repoActions.logError(`Failed fetching file for hash "${props.hash}", path "${props.filepath}"`);
        error.value = e;
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
      fileViewLinkWindowIsOpen,
      fileDownloadLinkBusy,
      error,
    };
  },
};

export default Record;
