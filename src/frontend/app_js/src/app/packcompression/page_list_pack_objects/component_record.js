
import { h } from 'vue';

import logError from '../../../error_logger/logError';

import './style.css';

import PageFilesList from '../../historyview/page_history_overview/index';


const PackRecord = {
  props: [
    'hash',
    'objectType',
    'revisionHash',
    'revisionAuthor',
    'revisionTimestamp',
    'revisionMessage',
    'blobHash',
    'filePath',
    'fileMode',
    'sizeSource',
    'sizeCompressed',
    'deltaDepth',
    'deltaBase',
    'repoStatus',
    'repoCallbacks',
    'componentFilterRecordsGetClassesCb',
  ],
  template: `
<div :class="['mdm-ui-record','mdm-git-gui-pack-object-record',...componentFilterRecordsGetClassesCb({hash,objectType,revisionHash,revisionAuthor,revisionTimestamp,revisionMessage,blobHash,filePath,fileMode,sizeSource,sizeCompressed,deltaDepth,deltaBase,})]">
  <span class="blob-record-element hash" title="Pack object hash">
    <span class="label">Pack object hash: </span>
    <component-format-hash :hash="hash" highlight="auto" />
  </span>
  <span class="blob-record-element object-type" title="Type">
    <span class="label">Type: </span>
    {{ objectType }}
  </span>
  <span class="blob-record-element blob-hash" title="Blob Hash">
    <span class="label">Blob hash: </span>
    <component-format-hash :hash="blobHash" highlight="skip" />
  </span>
  <span class="blob-record-element filesizes">
    <div class="inner">
      <span class="length" title="Size of source object">
        <span class="label">Size of source object: </span>
        <component-format-filesize :size="sizeSource" />
      </span>
      <span class="size-compressed" title="Size compressed">
        <span class="label">Size compressed: </span>
        <component-format-filesize :size="sizeCompressed" />
      </span>
    </div>
  </span>
  <span class="blob-record-element revision-info" v-if="revisionHash||filePath||revisionMessage||revisionTimestamp||revisionAuthor">
    <div class="inner">
      <span class="revision-hash" title="Revision hash">
        <span class="label">Revision hash: </span>
        <a href="#!" @click.prevent="navigateRevisionPage" class="link-unstyled">
          <component-format-hash :hash="revisionHash" highlight="auto" />
        </a>
      </span>
      <span class="file-path" title="File path">
        <span class="label">File path: </span>
        {{ filePath }}
      </span>
      <span class="file-mode" title="File mode">
        <span class="label">File mode: </span>
        {{ fileMode }}
      </span>
      <span class="revision-timestamp" title="Revision timestamp">
        <span class="label">Revision timestamp: </span>
        <component-format-date :dt="revisionTimestamp" />
      </span>
      <span class="revision-author" title="Revision author">
        <span class="label">Revision author: </span>
        {{ revisionAuthor }}
      </span>
      <span class="revision-message" title="Revision message" v-if="revisionMessage">
        <span class="label">Revision message: </span>
        <div class="inner">
          {{ revisionMessage }}
        </div>
      </span>
    </div>
  </span>
  <span class="blob-record-element delta-info" v-if="deltaBase">
    <div class="inner">
      <span class="delta-depth" title="Delta depth" v-if="deltaDepth">
        <span class="label">Delta depth: </span>
        {{ deltaDepth }}
      </span>
      <span class="delta-base" title="Delta base">
        <span class="label">Delta base: </span>
        <component-format-hash :hash="deltaBase" highlight="auto" />
      </span>
    </div>
  </span>
</div>
`,
  setup(props) {

    const navigateRevisionPage = async () => {
      try {
        await props.repoCallbacks.createPage(h(PageFilesList,{...props,hash:props.hash}));
      } catch(e) {
        if( e instanceof Error ) {
          logError(e);
          logError(`Failed to navigate to page: history-files-list/${props?.hash}`);
          throw e;
        }
      }
    };

    return { navigateRevisionPage };

  },
};


export default PackRecord;
