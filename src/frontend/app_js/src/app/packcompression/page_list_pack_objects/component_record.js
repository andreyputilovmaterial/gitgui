
import { h, computed } from 'vue';

import logError from '../../../error_logger/logError';

import './style.css';

import PageFilesList from '../../historyview/page_files_list/index';



function cap(level, low, high) {
  return ( level<low ? low : ( level>high ? high : ( ((level>=low)&&(level<=high)) ? level : level ) ) );
}

function calcWarningLevel(size,statistics) {
  const levelAbsoluteScale = cap( (Math.log(Number(size))/Math.log(1000000000))**5.88, 0, 1 );
  const levelRelativeScale = Number(size) / Number(statistics.cumulativeComputedCompressed);
  const weightRelative = cap( (Math.log(Number(size))/Math.log(1000000000))**1.69, 0, 1 );
  return levelRelativeScale * weightRelative + levelAbsoluteScale * (1-weightRelative);
}

function calcWarningColor(level) {
  if( !isFinite(level) )
    return '#ffffff';
  const point = cap( level, 0, 1 );
  const pointFlatNumber = (point*255)|0;

  // const low = [ 0xF0, 0xF0, 0xF0 ];
  // const high = [ 0xF0, 0x40, 0x4A ];
  // return `#${Number((low[0]+(-low[0]+high[0])*point)|0).toString(16)}${Number((low[1]+(-low[1]+high[1])*point)|0).toString(16)}${Number((low[2]+(-low[2]+high[2])*point)|0).toString(16)}`;

  const keyColorFrames = {
    0:       [ 0xF1, 0xF1, 0xF1 ],
    63:      [ 0xFF, 0xF8, 0xCC ],
    127:     [ 0xFF, 0xE0, 0x66 ],
    191:     [ 0xFF, 0xAD, 0x4D ],
    255:     [ 0xFF, 0x44, 0x44 ],
    100000:  [ 0xFF, 0x44, 0x44 ],
  };
  const k1 = Math.max( ...Object.keys(keyColorFrames).map(a=>Number(a)).filter(a=>a<=pointFlatNumber) );
  const k2 = Math.min( ...Object.keys(keyColorFrames).map(a=>Number(a)).filter(a=>a>=pointFlatNumber) );
  const low = keyColorFrames[k1];
  const high = keyColorFrames[k2];
  const pointRelative = k2>k1 ? ( pointFlatNumber - k1 ) / ( k2 - k1 ) : 0;
  return `#${Number((low[0]+(-low[0]+high[0])*pointRelative)|0).toString(16)}${Number((low[1]+(-low[1]+high[1])*pointRelative)|0).toString(16)}${Number((low[2]+(-low[2]+high[2])*pointRelative)|0).toString(16)}`;

}


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
    'statistics',
    'repoStatus',
    'repoCallbacks',
    'generateFileringCssClasses',
  ],
  template: `
<div :class="['mdm-ui-record','mdm-git-gui-pack-object-record',...filteringClasses]">
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
      <span
        class="warning-level-indicator"
        :style="{ backgroundColor: objectSizeWarningColor }"
        :title="( objectSizeWarningLevel<0.069249 ? 'Not in warning territory' : ( objectSizeWarningLevel<0.3 ? 'Nothing to worry about' : 'Worth noticing this file has significant size, compared to others' ) )"
      ></span>
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
        <component-format-datetime :dt="revisionTimestamp" />
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

    const objectSizeWarningLevel = computed(()=>calcWarningLevel(props.sizeCompressed,props.statistics));
    const objectSizeWarningColor = computed(()=>calcWarningColor(objectSizeWarningLevel.value));

    const filteringClasses = computed(()=>props.generateFileringCssClasses(props));

    const navigateRevisionPage = async () => {
      try {
        await props.repoCallbacks.createPage(h(PageFilesList,{...props,hash:props.revisionHash}));
      } catch(e) {
        if( e instanceof Error ) {
          logError(e);
          logError(`Failed to navigate to page: history-files-list/${props?.revisionHash}`);
          throw e;
        }
      }
    };

    return { navigateRevisionPage, objectSizeWarningColor, objectSizeWarningLevel, filteringClasses };

  },
};


export default PackRecord;
