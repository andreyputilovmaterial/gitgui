
import { ref, h, computed } from 'vue';

import { makeFetchResponseErrorMessage } from '@/common_defs/helper_functions.js';

import PageFileView from '@/app/window_fileviewer/index.js';

import './style.css';





const Record = {
  props: [
    'namespace',
    'filepath',
    'fullFilepath',
    'type',
    'size',
    'modifiedAt',
    'metadataChangedAt',
    'createdAt',
    'navigate',
    'componentRecordsFiltData',
    'repoStatus',
    'repoActions',
  ],
  template: `
<div
  :class="[
    ...['files-record','files-record-compact','mdm-ui-record'],
    ...(!!fileModifiedWorkingTree||!!fileModifiedIndex ? ['files-record-mod'] : []),
    ...(!!fileMergeConflict ? ['files-record-mergeconflict'] : []),
    ...(!!fileTracked ? ['files-record-tracked'] : []),
    ...(componentRecordsFiltData?.cssClasses||[]),
  ]"
  :key="filepath"
  :data-recordsfilter-filepath="filepath"
  :title="!fileTracked ? 'Untracked file/directory - ignored per rules in .gitignore' : undefined"
>
  <div class="error">{{ error }}</div>
  <span class="git-status-indicator mdm-ui-record-col-gitstatusindicator mdm-ui-record-col-1" :title=" fileTracked ? 'Status' : 'Status (Untracked file/directory - ignored per rules in .gitignore)' "> 
  </span>
  <span v-if="type==='file'" class="link-view-file mdm-ui-record-col-view-file mdm-ui-record-col-2" :title=" fileTracked ? 'View file' : 'View file (Untracked file/directory - ignored per rules in .gitignore)' ">
    <component-loader-spinner v-if="fileViewLinkBusy && !fileViewLinkWindowIsOpen" />
    <span class="label">View file: </span>
      <a @click.prevent="navigateFileViewPage" href="#!">{{ '{' }}{{ '}' }}</a>
    </span>
    <span v-else class="mdm-ui-record-col-view-file mdm-ui-record-col-2"></span>
    <span v-if="type==='file'" class="filepath mdm-ui-record-col-filepath mdm-ui-record-col-3" :title=" fileTracked ? 'File path' : 'File path (Untracked file/directory - ignored per rules in .gitignore)' ">
      <span class="label">File path: </span>
      {{ filepath }}
    </span>
    <a v-else class="filepath mdm-ui-record-col-filepath mdm-ui-record-col-3" href="#!" @click.prevent="navigateInside" :title=" fileTracked ? 'File path' : 'File path (Untracked file/directory - ignored per rules in .gitignore)' ">
      <span class="label">File path: </span>
      {{ filepath }}
    </a>
    <span v-if="type==='file'" class="size mdm-ui-record-col-size mdm-ui-record-col-4" :title=" fileTracked ? 'File size' : 'File size (Untracked file/directory - ignored per rules in .gitignore)' "><component-format-filesize :size="size" /></span>
    <span v-else class="mdm-ui-record-col-size mdm-ui-record-col-4"></span>
  <span class="modifiedat mdm-ui-record-col-modifiedat mdm-ui-record-col-5" :title=" fileTracked ? 'Modified at' : 'Modified at (Untracked file/directory - ignored per rules in .gitignore)' "><component-format-datetime :dt="modifiedAt" /></span>
</div>
`,
  components: {
  },
  setup(props) {

    const error = ref('');
    const fileViewLinkBusy = ref(false);
    const fileViewLinkWindowIsOpen = ref(false);

    const fileTracked = computed(()=>(props.type==='directory')?props.repoActions.checkFolderTracked(props.filepath):props.repoActions.checkFileTracked(props.filepath));
    const fileStatus = computed(()=>(props.type==='directory')?props.repoActions.checkFolderStatus(props.filepath):props.repoActions.checkFileStatus(props.filepath));
    const fileModifiedWorkingTree = computed(()=>!(fileStatus.value===null) && !(fileStatus.value?.worktree==='.'));
    const fileModifiedIndex = computed(()=>!(fileStatus.value===null) && !(fileStatus.value?.index==='.'));
    const fileMergeConflict = computed(()=>!(fileStatus.value===null) && ((fileStatus.value?.worktree==='U')||(fileStatus.value?.index==='U')));

    const navigateFileViewPage = async () => {
      try {
        fileViewLinkBusy.value = true;
        fileViewLinkWindowIsOpen.value = false;
        const resourcepath = `${props.namespace}:${props.filepath}`;
        const filename = `${resourcepath}`.split('/').pop();

        error.value = '';
        const response = await fetch(
          `/browse/${resourcepath}`,
          {
            method: 'DOWNLOAD',
            headers: { "Content-Type": "application/octet-stream" },
          },
        );
        if( !response.ok ) {
            throw new Error(await makeFetchResponseErrorMessage(response) );
        }
        const bufferPromise = response.arrayBuffer();
        const buffer = await bufferPromise;
        const binaryData = new Uint8Array(buffer);
        const content = await props.repoActions.textconv(binaryData,filename);
      
        try {
          fileViewLinkWindowIsOpen.value = true;
          await props.repoActions.createModal(h(PageFileView,{
            ...props,
            resourcepath: resourcepath,
            size: binaryData.length,
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
          props.repoActions.logError(`Failed to navigate to file viewer page: ${props?.filepath}`);
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

    const navigateInside = event => {
      try {
        error.value = '';
        if( props.type!=='directory' )
          return false;
        const newPath = `${props.filepath}`;
        props.navigate(newPath);
        // fileNavigateBusy.value = false;
        return false;
      } catch(e) {
        if( e instanceof Error ) {
          props.repoActions.logError(e);
          props.repoActions.logError(`Failed to navigate to directory: ${props?.filepath}`);
          error.value = e;
          // fileNavigateBusy.value = false;
          throw e;
        }
        // fileNavigateBusy.value = false;
      } finally {
        // fileNavigateBusy.value = false;
        // fileNavigateWindowIsOpen.value = false;
      }
    };

    return {
      navigateFileViewPage,
      fileViewLinkBusy,
      fileViewLinkWindowIsOpen,
      navigateInside,
      fileStatus,
      fileModifiedWorkingTree,
      fileModifiedIndex,
      fileMergeConflict,
      fileTracked,
      error,
    };
  },
};

export default Record;
