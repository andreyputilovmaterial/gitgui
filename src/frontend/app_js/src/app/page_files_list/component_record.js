
import { ref, h } from 'vue';

import { makeFetchResponseErrorMessage } from '../../common_defs/helper_functions.js';

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
        const jobData = await props.repoActions.executeGitBinaryCommand(['git','cat-file','blob',`${props.hash}:${props.filepath}`],{is_interactive:true,});
        await jobData.promiseDownloadLinkReady;
        // const promiseContext = {
        //   resolve: () => { throw new Error('promise not inited'); },
        //   reject:  () => { throw new Error('promise not inited'); },
        //   onData:  () => { throw new Error('onData not inited'); },
        // };
        // const promise = new Promise((resolve,reject) => {
        //   promiseContext.resolve = resolve;
        //   promiseContext.reject = reject;
        // });
        // const stream = new ReadableStream({
        //   async start(controller) {
        //     promiseContext.onData = chunk => controller.enqueue(chunk);
        //     await promise;
        //     controller.close();
        //   },
        // });
        // const contentAsTextPromise = props.repoActions.textconv(stream,filename);
        //
        // for await ( const chunk of jobData.getData() ) {
        //   promiseContext.onData( chunk );
        // }
        // const contentAsText = await contentAsTextPromise;
        // TODO: streamed
        // TODO: direct textconv
        const response = await fetch( jobData.download_url );
        if( !response.ok ) throw new Error(await makeFetchResponseErrorMessage(response));
        const bufferPromise = response.arrayBuffer();
        await jobData.promise;
        const buffer = await bufferPromise;
        const binaryData = new Uint8Array(buffer);
        const contentAsText = await props.repoActions.textconv(binaryData,filename);

        await props.repoActions.createModal(h(PageFileView,{...props,resourcepath:resourcepath,contentAsText:contentAsText}));

        fileViewLinkBusy.value = false;
        error.value = '';

      } catch(e) {
        if( e instanceof Error ) {
          props.repoActions.logError(e);
          props.repoActions.logError(`Failed to navigate to page: history-file-view/${props?.hash}`);
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
