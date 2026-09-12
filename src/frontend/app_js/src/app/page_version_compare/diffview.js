
import { ref, onMounted, watch, nextTick } from 'vue';


import { makeFetchResponseErrorMessage, } from '../../common_defs/helper_functions.js';



import './style.css';
import './styles_diffview.css';




const MEMORYSAVE_LINES_LIMIT = 1000;
const MEMORYSAVE_CHARS_PER_LINE_LIMIT = 100;

const CONFIG_CONTEXT_INCLUDE_BEFOREAFTER = 10;
const CONFIG_CONTEXT_MIN_HIDE = 10;



function* diffAllParts(lhs, rhs, patches) {
    let lastl = 0;
    let lastr = 0;
    let lnothingfollows = false;
    let rnothingfollows = false;
    // for (const patch of patches) {
    for (const [patchIndex, patch] of patches.entries()) {
        // Unchanged part
        const islastpatch = patchIndex === patches.length - 1;
        lnothingfollows = false;
        rnothingfollows = false;
        if( islastpatch && !(patch.lhs.del>0) )
          lnothingfollows = true;
        if( islastpatch && !(patch.rhs.add>0) )
          rnothingfollows = true;
        const skipl = patch.lhs.at - lastl;
        const skipr = patch.rhs.at - lastr;
        if( ! ( lnothingfollows || rnothingfollows ) )
          if( !(skipl===skipr) )
            throw new Error(`diff: please verify results, internal qc is not matching for skipped part in left and right: ${skipl} !== ${skipr}`);
        if( (skipl>0)||(skipr>0) ) {
          yield {
              type: "keep",
              lhs: {
                  at: lastl,
                  length: skipl,
                  items: lhs.slice(lastl, lastl + skipl),
              },
              rhs: {
                  at: lastr,
                  length: skipr,
                  items: rhs.slice(lastr, lastr + skipr),
              }
          };
        }
        lastl = patch.lhs.at;
        lastr = patch.rhs.at;
        // Changed part
        yield {
            type: "patch",
            lhs: {
                at: patch.lhs.at,
                length: patch.lhs.del,
                items: lhs.slice(patch.lhs.at, patch.lhs.at + patch.lhs.del),
            },
            rhs: {
                at: patch.rhs.at,
                length: patch.rhs.add,
                items: rhs.slice(patch.rhs.at, patch.rhs.at + patch.rhs.add),
            }
        };
        lastl = patch.lhs.at + patch.lhs.del;
        lastr = patch.rhs.at + patch.rhs.add;
    }
    // Anything remaining is unchanged
    const patch = {
      lhs: {
        at: lhs.length,
        del: 0,
        add: 0,
      },
      rhs: {
        at: rhs.length,
        del: 0,
        add: 0,
      },
    };
    const skipl = patch.lhs.at - lastl;
    const skipr = patch.rhs.at - lastr;
    // lnothingfollows = true;
    // rnothingfollows = true;
    // if( ! ( lnothingfollows || rnothingfollows ) )
    //   if( !(skipl===skipr) )
    //     throw new Error(`diff: please verify results, internal qc is not matching for skipped part in left and right: ${skipl} !== ${skipr}`);
    if( (skipl>0)||(skipr>0) ) {
      yield {
          type: "keep",
          lhs: {
              at: lastl,
              length: skipl,
              items: lhs.slice(lastl, lastl + skipl),
          },
          rhs: {
              at: lastr,
              length: skipr,
              items: rhs.slice(lastr, lastr + skipr),
          }
      };
    }
}

function splitByTokens(txt) {
  return Array.from(txt.match(/\w+|[^\w\s]|\s+/g) ?? []).map(a=>`${a}`);
}


function identifyLineStatus(line) {
  let hasInserts = false;
  let hasUnchanged = false;
  let hasDeletions = false;
  for( const piece of line ) {
    if( piece.txt.length>0 ) {
      if( (piece.role==='ins') )
        hasInserts = true;
      else if( piece.role==='del' )
        hasDeletions = true;
      else
        hasUnchanged = true;
    }
  }
  if( !!hasInserts && !!hasDeletions )
    return 'mod';
  else if( !!hasInserts && !hasDeletions && !hasUnchanged )
    return 'ins';
  else if( !hasInserts && !!hasDeletions && !hasUnchanged )
    return 'del';
  else if( !hasInserts && !hasDeletions && !!hasUnchanged )
    return 'keep';
  else if( !hasInserts && !hasDeletions && !hasUnchanged )
    return 'blank';
  else
    return 'mod';
}



const LineNum = {
  props: [ 'line', 'side', ],
  template: `
<p :class="['code',\`status-\${line[side].status}\`]">{{ line[side].lineNum }}</p>
`,
  setup() {
    return {};
  },
}

const LineTxt = {
  props: [ 'line', 'side', ],
  template: `
<p :class="['code']"><span v-for="piece in line[side].content" :class="[\`status-\${piece.role}\`]">{{ piece.txt }}</span></p>
`,
  setup() {
    return {};
  },
}

const LineLinkShowTxt = {
  props: [ 'line', 'side', 'setCondensedState', 'linesCount', ],
  template: `
<p :class="['code']"><a href="#!" @click.prevent="setCondensedState">... Show {{ linesCount }} more lines ...</a></p>
`,
  setup() {
    return {};
  },
}

const LineBlockNum = {
  props: [ 'partBegin', 'partRemoved', 'partEnd', 'condensedState', 'setCondensedState', 'side', ],
  template: `
<div class="part-context">
  <div class="part-context-begin">
    <p-line-num v-for="line in partBegin" :key="line.globalIndex" :line="line" :side="side" />
  </div>
  <div class="part-context-condensed">
    <template v-if="condensedState">
      <p-line-num v-for="line in partRemoved.slice(0,1)" :key="line.globalIndex" :line="partRemoved[0]" :side="side" />
    </template>
    <template v-else>
      <p-line-num v-for="line in partRemoved" :key="line.globalIndex" :line="line" :side="side" />
    </template>
  </div>
  <div class="part-context-end">
    <p-line-num v-for="line in partEnd" :key="line.globalIndex" :line="line" :side="side" />
  </div>
</div>
`,
  components: {
    'p-line-num': LineNum,
  },
  setup() {
    return {};
  },
}

const LineBlockTxt = {
  props: [ 'partBegin', 'partRemoved', 'partEnd', 'condensedState', 'setCondensedState', 'side', ],
  template: `
<div class="part-context">
  <div class="part-context-begin">
    <p-line-txt v-for="line in partBegin" :key="line.globalIndex" :line="line" :side="side" />
  </div>
  <div class="part-context-condensed">
    <template v-if="condensedState">
      <p-line-link-txt v-for="line in partRemoved.slice(0,1)" :key="line.globalIndex" :line="partRemoved[0]" :side="side" :setCondensedState="setCondensedState" :linesCount="partRemoved.length" />
    </template>
    <template v-else>
      <p-line-txt v-for="line in partRemoved" :key="line.globalIndex" :line="line" :side="side" />
    </template>
  </div>
  <div class="part-context-end">
    <p-line-txt v-for="line in partEnd" :key="line.globalIndex" :line="line" :side="side" />
  </div>
</div>
`,
  components: {
    'p-line-txt': LineTxt,
    'p-line-link-txt': LineLinkShowTxt,
  },
  setup() {
    return {};
  },
}

const RecordNum = {
  props: [ 'line', 'setCondensedState', 'side', ],
  template: `
<p-line-num v-if="line.type==='line'" :line=line :side="side" />
<p-line-block-num v-else-if="line.type==='condensed-block'" :partBegin="line.partBegin" :partRemoved="line.partRemoved" :partEnd="line.partEnd" :side="side"  :condensedState="line.condensedState" :setCondensedState="setCondensedState" />
<div v-else class="errpr">Unrecognized line type: {{type }}</div>
`,
  components: {
    'p-line-num': LineNum,
    'p-line-block-num': LineBlockNum,
  },
  setup() {
    return {};
  },
}

const RecordTxt = {
  props: [ 'line', 'setCondensedState', 'side', ],
  template: `
<p-line-txt v-if="line.type==='line'" :line=line :side="side" />
<p-line-block-txt v-else-if="line.type==='condensed-block'" :partBegin="line.partBegin" :partRemoved="line.partRemoved" :partEnd="line.partEnd" :side="side"  :condensedState="line.condensedState" :setCondensedState="setCondensedState" />
<div v-else class="errpr">Unrecognized line type: {{type }}</div>
`,
  components: {
    'p-line-txt': LineTxt,
    'p-line-block-txt': LineBlockTxt,
  },
  setup() {
    return {};
  },
}

const View = {
  props: [
    'filepath',
    'blobIdLeft',
    'blobIdRight',
    'filepath_left', // not used
    'filepath_right', // not used
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-diffview">
  <div class="error">{{ error }}</div>
  <template v-if="(!hasValue(statisticsLeft.textFileSize) || !hasValue(statisticsRight.textFileSize)) && !error">Querying data, please wait...</template>
  <template v-else-if="memorysave">
    <form  @submit.prevent="memorysave=false" class="mdmreport-controls memorysave-form">
      <fieldset class="mdmreport-controls">
        <div><button type="submit" class="gitgui-button-show">Click to calc diff ({{ Math.max(statisticsLeft.textLineCount,statisticsRight.textLineCount) }} lines)</button></div>
      </fieldset>
    </form>
  </template>
  <template v-else>
    <div v-if="!lines" class="note">Calculating diff...</div>
    <div class="stats">Left file: <component-format-filesize :size="statisticsLeft?.binaryFileSize" />, right file: <component-format-filesize :size="statisticsRight?.binaryFileSize" /></div>
    <div class="two-sided-view">
      <div :class="{'pane': true, 'pane-left': true, 'diff-outputs': true, 'mdm-textconv-failed': Object.keys(statisticsLeft?.textconvHeadersRecognized || {}).includes('error'),}">
        <div class="linenumber-and-content-columns">
          <div class="linenum-col">
            <p-line-num v-for="line in lines" :key="line.globalIndex" :line="line" side="lhs" :setCondensedState="function(event){line.condensedState=false}" />
          </div>
          <div class="contents">
            <p-line-txt v-for="line in lines" :key="line.globalIndex" :line="line" side="lhs" :setCondensedState="function(event){line.condensedState=false}" />
          </div>
        </div>
      </div>
      <div :class="{'pane': true, 'pane-right': true, 'diff-outputs': true, 'mdm-textconv-failed': Object.keys(statisticsRight?.textconvHeadersRecognized || {}).includes('error'),}">
        <div class="linenumber-and-content-columns">
          <div class="linenum-col">
            <p-line-num v-for="line in lines" :key="line.globalIndex" :line="line" side="rhs" :setCondensedState="function(event){line.condensedState=false}" />
          </div>
          <div class="contents">
            <p-line-txt v-for="line in lines" :key="line.globalIndex" :line="line" side="rhs" :setCondensedState="function(event){line.condensedState=false}" />
          </div>
        </div>
      </div>
    </div>
  </template>
</div>
`,
  components: {
    'p-line-num': RecordNum,
    'p-line-txt': RecordTxt,
  },
  setup(props) {

    const error = ref('');
    const linesRef = ref(undefined);
    const statisticsLeft = ref({});
    const statisticsRight = ref({});
    const memorysave = ref(true);
    const memorySaveOffPromiseContext = {
      resolve: () => { throw new Error('promise not inited'); },
      reject: () => { throw new Error('promise not inited'); },
      promise: undefined,
    };
    const memorySaveOff = new Promise((resolve,reject)=>{
      memorySaveOffPromiseContext.resolve = resolve;
      memorySaveOffPromiseContext.reject = reject;
    });
    memorySaveOffPromiseContext.promise = memorySaveOff;

    const hasValue = v => {
      if( v==='' )
        return true;
      if( v===0 )
        return true;
      if( Array.isArray(v) && (v.length===0) )
        return true;
      return !!v;
    }

    async function getContentsFromBlob(blobid) {
      if( /^0+$/.test(blobid) )
        return new Uint8Array([]);
      const jobData = await props.repoActions.executeGitBinaryCommand(['git','cat-file','blob',blobid],{is_binary:true,is_interactive:true,stdout_chunk_size:8192,stderr_chunk_size:8192});
      await jobData.promiseDownloadLinkReady;
      // TODO: streamed
      // TODO: direct textconv
      const response = await fetch( jobData.download_url );
      if( !response.ok ) throw new Error(await makeFetchResponseErrorMessage(response));
      const bufferPromise = response.arrayBuffer();
      await jobData.promise;
      const buffer = await bufferPromise;
      return new Uint8Array(buffer);
    }

    const fetchDataLeft = async () => {
      try {
        statisticsLeft.value.binaryFileSize = '???';
        const binaryDataLeft = await getContentsFromBlob(props.blobIdLeft);
        statisticsLeft.value.binaryFileSize = binaryDataLeft.length;
        const contentLeft = await props.repoActions.textconv(binaryDataLeft,props.filepath);
        const txtLeft = contentLeft.text;
        statisticsLeft.value.textconvHeaders = contentLeft.headers;
        statisticsLeft.value.textconvHeadersRecognized = contentLeft.headersRecognized;
        statisticsLeft.value.textFileSize = txtLeft.length;
        return txtLeft;
      } catch(e) {
        error.value = e;
        props.repoActions.logError(e);
        props.repoActions.logError('Failed when fetching contents for left file');
        throw e;
      }
    };
    const fetchDataRight = async () => {
      try {
        statisticsRight.value.binaryFileSize = '???';
        const binaryDataRight = await getContentsFromBlob(props.blobIdRight);
        statisticsRight.value.binaryFileSize = binaryDataRight.length;
        const contentRight = await props.repoActions.textconv(binaryDataRight,props.filepath);
        const txtRight = contentRight.text;
        statisticsRight.value.textconvHeaders = contentRight.headers;
        statisticsRight.value.textconvHeadersRecognized = contentRight.headersRecognized;
        statisticsRight.value.textFileSize = txtRight.length;
        return txtRight;
      } catch(e) {
        error.value = e;
        props.repoActions.logError(e);
        props.repoActions.logError('Failed when fetching contents for right file');
        throw e;
      }
    };

    const normalizeLfCr = txt => txt.replace(/\r\n|\r|\n/g, '\n');

    const prepareDiffs = async ([left,right]) => {
      try {
        const leftNomralizedLfCr = normalizeLfCr(left);
        const rightNomralizedLfCr = normalizeLfCr(right);
        const leftLines = leftNomralizedLfCr.split('\n');
        statisticsLeft.value.textLineCount = leftLines.length;
        const rightLines = rightNomralizedLfCr.split('\n');
        statisticsRight.value.textLineCount = rightLines.length;
        const leftLinesOrLinePartsCount = leftLines.reduce( (count, line) => count + Math.ceil((line.length+1) / MEMORYSAVE_CHARS_PER_LINE_LIMIT), 0 );
        const rightLinesOrLinePartsCount = rightLines.reduce( (count, line) => count + Math.ceil((line.length+1) / MEMORYSAVE_CHARS_PER_LINE_LIMIT), 0 );
        if( (leftLinesOrLinePartsCount>MEMORYSAVE_LINES_LIMIT) || (rightLinesOrLinePartsCount>MEMORYSAVE_LINES_LIMIT) ) {
          memorysave.value = true;
        } else {
          memorysave.value = false;
          memorySaveOffPromiseContext.resolve(true);
        }
        await memorySaveOff;
        await nextTick();
        await new Promise(resolve=>setTimeout(resolve,30));
        const diffLinesPatches = props.repoActions.diff(leftLines,rightLines);
        const diffLinesAllBlocks = Array.from(diffAllParts(leftLines,rightLines,diffLinesPatches));
        const lines = [];
        let sequenceOfUnchangedStartedAt = 0;
        let globalCounter = 0;
        for( const block of diffLinesAllBlocks ) {
          const lineNumbersWithinBlock = Math.max( block.lhs.items.length, block.rhs.items.length );
          for( let lineNumberWithinBlock=0; lineNumberWithinBlock<lineNumbersWithinBlock; ++lineNumberWithinBlock ) {
            const lline = lineNumberWithinBlock<=block.lhs.items.length-1 ? block.lhs.items[lineNumberWithinBlock] : '';
            const rline = lineNumberWithinBlock<=block.rhs.items.length-1 ? block.rhs.items[lineNumberWithinBlock] : '';
            const llineSplitByTokens = splitByTokens(lline);
            const rlineSplitByTokens = splitByTokens(rline);
            const diffWithinLine = props.repoActions.diff(llineSplitByTokens,rlineSplitByTokens);
            const diffWithinLineParts = Array.from(diffAllParts(llineSplitByTokens,rlineSplitByTokens,diffWithinLine));
            const ltext = [];
            const rtext = [];
            for( const piece of diffWithinLineParts ) {
              if(piece.type==='keep') {
                ltext.push({'role':'keep','txt':piece.lhs.items.join(''),});
                rtext.push({'role':'keep','txt':piece.rhs.items.join(''),});
              } else if(piece.type==='patch') {
                if(piece.lhs.length>0)
                  ltext.push({'role':'del','txt':piece.lhs.items.join(''),});
                if(piece.rhs.length>0)
                  rtext.push({'role':'ins','txt':piece.rhs.items.join(''),});
              } else {
                throw new Error(`diff: within line, iterate over parts: unrecognized part type: "${piece.type}"`);
              };
            }
            const lstatus = identifyLineStatus(ltext);
            const rstatus = identifyLineStatus(rtext);
            const line = {
              lhs: {
                lineNum: 1 + block.lhs.at + Math.max(Math.min(lineNumberWithinBlock,block.lhs.items.length-1),0),
                content: ltext,
                status: lstatus,
              },
              rhs: {
                lineNum: 1 + block.rhs.at + Math.max(Math.min(lineNumberWithinBlock,block.rhs.items.length-1),0),
                content: rtext,
                status: rstatus,
              },
              type: 'line',
              globalIndex: globalCounter+1,
            };
            // detect "context" blocks to collapse, in between changed blocks
            const lchange = ( ['ins','del','mod'].includes(lstatus) ? true : ( ['blank','keep'].includes(lstatus) ? false : (()=>{throw new Error(`diff: can\'t detect line status: ${lstatus}`);})() ) );
            const rchange = ( ['ins','del','mod'].includes(rstatus) ? true : ( ['blank','keep'].includes(rstatus) ? false : (()=>{throw new Error(`diff: can\'t detect line status: ${rstatus}`);})() ) );
            const lineChanged = lchange || rchange;
            if( lineChanged ) {
              const currIndex = globalCounter;
              const countUnchangedInSequence = currIndex - sequenceOfUnchangedStartedAt;
              if( countUnchangedInSequence > 2*CONFIG_CONTEXT_INCLUDE_BEFOREAFTER+CONFIG_CONTEXT_MIN_HIDE) {
                const contextLines = lines.slice(sequenceOfUnchangedStartedAt,currIndex);
                lines.splice(sequenceOfUnchangedStartedAt,countUnchangedInSequence);
                lines.push({
                  type: 'condensed-block',
                  partBegin: contextLines.slice(0,CONFIG_CONTEXT_INCLUDE_BEFOREAFTER),
                  partRemoved: contextLines.slice(CONFIG_CONTEXT_INCLUDE_BEFOREAFTER,countUnchangedInSequence-CONFIG_CONTEXT_INCLUDE_BEFOREAFTER),
                  partEnd: contextLines.slice(countUnchangedInSequence-CONFIG_CONTEXT_INCLUDE_BEFOREAFTER,countUnchangedInSequence),
                  condensedState: true,
                  globalIndex: globalCounter+1,
                });
              }
              sequenceOfUnchangedStartedAt = currIndex;
            }
            lines.push(line);
            globalCounter++;
          }
        };
        const lineChanged = true;
        if( lineChanged ) {
          const currIndex = lines.length;
          const countUnchangedInSequence = currIndex - sequenceOfUnchangedStartedAt;
          if( countUnchangedInSequence > 2*CONFIG_CONTEXT_INCLUDE_BEFOREAFTER+CONFIG_CONTEXT_MIN_HIDE) {
            const contextLines = lines.slice(sequenceOfUnchangedStartedAt,currIndex);
            lines.splice(sequenceOfUnchangedStartedAt,countUnchangedInSequence);
            lines.push({
              type: 'condensed-block',
              partBegin: contextLines.slice(0,CONFIG_CONTEXT_INCLUDE_BEFOREAFTER),
              partRemoved: contextLines.slice(CONFIG_CONTEXT_INCLUDE_BEFOREAFTER,countUnchangedInSequence-CONFIG_CONTEXT_INCLUDE_BEFOREAFTER),
              partEnd: contextLines.slice(countUnchangedInSequence-CONFIG_CONTEXT_INCLUDE_BEFOREAFTER,countUnchangedInSequence),
              condensedState: true,
              globalIndex: globalCounter+1,
            });
          }
          sequenceOfUnchangedStartedAt = currIndex;
        }
        linesRef.value = lines;
      } catch(e) {
        error.value = e;
        props.repoActions.logError(e);
        props.repoActions.logError('Failed when preparing diff results');
        throw e;
      }
    };

    onMounted(async () => {
      await Promise.all([
        fetchDataLeft(),
        fetchDataRight(),
        (async () => { /* console.log(`[DEBUG-diffview-component]: mounted: `,props); */ return true; })(),
      ]).then(prepareDiffs)
    });

    watch(memorysave,()=>{
      if(!memorysave.value)
        memorySaveOffPromiseContext.resolve(true);
    });

    return { error, lines: linesRef, hasValue, statisticsLeft, statisticsRight, memorysave };
  },
}

export default View;
