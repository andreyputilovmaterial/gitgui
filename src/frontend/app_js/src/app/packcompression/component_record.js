

import './style.css';



const PackRecord = {
  props: [
    'hash',
    'objectType',
    'revisionHash',
    'blobHash',
    'filePath',
    'fileMode',
    'length',
    'sizeCompressed',
    'deltaDepth',
    'deltaBase',
    'repoStatus',
    'repoCallbacks',
    'componentFilterRecordsGetClassesCb',
  ],
  template: `
<div :class="['mdm-ui-record','mdm-git-gui-blob-record',...componentFilterRecordsGetClassesCb({hash,objectType,revisionHash,blobHash,filePath,fileMode,length,sizeCompressed,deltaDepth,deltaBase,})]">
  <span class="blob-record-element hash" title="Pack object hash">
    <span class="label">Pack object hash: </span>
    {{ hash }}
  </span>
  <span class="blob-record-element objectType" title="Type">
    <span class="label">Type: </span>
    {{ objectType }}
  </span>
  <span class="blob-record-element revisionHash" title="Revision hash">
    <span class="label">Revision hash: </span>
    {{ revisionHash }}
  </span>
  <span class="blob-record-element blobHash" title="Blob Hash">
    <span class="label">Blob hash: </span>
    {{ blobHash }}
  </span>
  <span class="blob-record-element filePath" title="File path">
    <span class="label">File path: </span>
    {{ filePath }}
  </span>
  <span class="blob-record-element fileMode" title="File mode">
    <span class="label">File mode: </span>
    {{ fileMode }}
  </span>
  <span class="blob-record-element length" title="length (size)">
    <span class="label">Length (size): </span>
    {{ length }}
  </span>
  <span class="blob-record-element sizeCompressed" title="Size compressed">
    <span class="label">Size compressed: </span>
    {{ sizeCompressed }}
  </span>
  <span class="blob-record-element deltaDepth" title="Delta depth">
    <span class="label">Delta depth: </span>
    {{ deltaDepth }}
  </span>
  <span class="blob-record-element deltaBase" title="Delta base">
    <span class="label">Delta base: </span>
    {{ deltaBase }}
  </span>
</div>
`,
  setup() {
    return {};
  },
};


export default PackRecord;
