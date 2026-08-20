
import { ref, onMounted } from 'vue';

import logError from '../../../error_logger/logError';

import './style.css';
import './styles_diffview.css';


function* diffAllParts(lhs, rhs, patches) {
    let li = 0;
    let ri = 0;
    for (const patch of patches) {
        const l = patch.lhs;
        const r = patch.rhs;
        // Unchanged part before this patch.
        const keep = l.at - li;
        if (keep > 0) {
            yield {
                type: "keep",
                lhs: { at: li, length: keep, items: lhs.slice(li, li + keep), },
                rhs: { at: ri, length: keep, items: lhs.slice(li, li + keep), },
            };
            li += keep;
            ri += keep;
        }
        // Changed part.
        yield {
            type: "patch",
            lhs: {
                at: li,
                length: l.del,
                items: lhs.slice(li, li + l.del)
            },
            rhs: {
                at: ri,
                length: r.add,
                items: rhs.slice(ri, ri + r.add)
            }
        };
        li += l.del;
        ri += r.add;
    }
    // Anything remaining is unchanged.
    const keep = lhs.length - li;
    if (keep > 0) {
        yield {
            type: "keep",
            lhs: { at: li, length: keep, items: lhs.slice(li, li + keep) },
            rhs: { at: ri, length: keep, items: rhs.slice(ri, ri + keep) },
        };
        li += keep;
        ri += keep;
    }
    // If lengths can differ in a way not represented by patches,
    // you could handle remaining rhs here as well.
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
  if( !!hasInserts && !hasDeletions && !hasUnchanged )
    return 'ins';
  else if( !hasInserts && !!hasDeletions && !hasUnchanged )
    return 'del';
  else if( !!hasInserts && !!hasDeletions && !hasUnchanged )
    return 'keep';
  else if( !hasInserts && !hasDeletions && !hasUnchanged )
    return 'blank';
  else
    return 'mod';
}


const View = {
  props: [
    'filepath',
    'blobIdOld',
    'blobIdNew',
    'repoStatus', 'repoCallbacks',
  ],
  template: `
<div class="mdm-git-gui-diffview">
  <div class="error">{{ error }}</div>
  <template v-if="(!hasValue(linesLeft) || !hasValue(linesRight)) && !error">Quering data, please wait...</template>
  <template v-else-if="hasValue(linesLeft) && hasValue(linesRight)">
    <div class="two-sided-view">
      <div class="pane pane-left diff-outputs">
        <div class="linenumber-and-content-columns">
          <div class="linenum-col">
            <p v-for="line in linesLeft" :class="['code',\`status-\${line.status}\`]">{{ line.lineNum }}</p>
          </div>
          <div class="contents">
            <p v-for="line in linesLeft" :class="['code']"><span v-for="piece in line.content" :class="[\`status-\${piece.role}\`]">{{ piece.txt }}</span></p>
          </div>
        </div>
      </div>
      <div class="pane pane-right diff-outputs">
        <div class="linenumber-and-content-columns">
          <div class="linenum-col">
            <p v-for="line in linesRight" :class="['code',\`status-\${line.status}\`]">{{ line.lineNum }}</p>
          </div>
          <div class="contents">
            <p v-for="line in linesRight" :class="['code']"><span v-for="piece in line.content" :class="[\`status-\${piece.role}\`]">{{ piece.txt }}</span></p>
          </div>
        </div>
      </div>
    </div>
  </template>
</div>
`,
  setup(props) {

    const error = ref('');
    const linesLeft = ref(undefined);
    const linesRight = ref(undefined);
    const hasValue = v => {
      if( v==='' )
        return true;
      if( v===0 )
        return true;
      if( v===[] )
        return true;
      return !!v;
    }

    async function getContentsFromBlob(blobid) {
      if( /^0+$/.test(blobid) )
        return new Uint8Array([]);
      return await props.repoCallbacks.executeGitBinaryCommand(['git','cat-file','blob',blobid]);
    }

    const fetchDataLeft = async () => {
      try {
        const binaryDataLeft = await getContentsFromBlob(props.blobIdOld);
        const txtLinesLeft = await props.repoCallbacks.textconv(binaryDataLeft,props.filepath);
        return txtLinesLeft;
      } catch(e) {
        error.value = e;
        logError(e);
        logError('Failed when fetching contents for left file');
        throw e;
      }
    };
    const fetchDataRight = async () => {
      try {
        const binaryDataRight = await getContentsFromBlob(props.blobIdNew);
        const txtLinesRight = await props.repoCallbacks.textconv(binaryDataRight,props.filepath);
        return txtLinesRight;
      } catch(e) {
        error.value = e;
        logError(e);
        logError('Failed when fetching contents for right file');
        throw e;
      }
    };

    const normalizeLfCr = txt => txt.replace(/\r\n|\r|\n/g, '\n');

    const prepareDiffs = async ([left,right]) => {
      try {
        const leftNomralizedLfCr = normalizeLfCr(left);
        const rightNomralizedLfCr = normalizeLfCr(right);
        const leftLines = leftNomralizedLfCr.split('\n');
        const rightLines = rightNomralizedLfCr.split('\n');
        const diffLinesPatches = props.repoCallbacks.diff(leftLines,rightLines);
        const diffLinesAllBlocks = Array.from(diffAllParts(leftLines,rightLines,diffLinesPatches));
        const lines = [];
        for( const block of diffLinesAllBlocks ) {
          const steps = Math.max( block.lhs.items.length, block.rhs.items.length );
          for( let step=0; step<steps; ++step ) {
            const lline = step<=block.lhs.items.length-1 ? block.lhs.items[step] : '';
            const rline = step<=block.rhs.items.length-1 ? block.rhs.items[step] : '';
            const llineSplitByTokens = splitByTokens(lline);
            const rlineSplitByTokens = splitByTokens(rline);
            const diffWithinLine = props.repoCallbacks.diff(llineSplitByTokens,rlineSplitByTokens);
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
            const line = {
              lhs: {
                lineNum: block.lhs.at + Math.max(Math.min(step,block.lhs.items.length-1),0),
                content: ltext,
                status: identifyLineStatus(ltext),
              },
              rhs: {
                lineNum: block.rhs.at + Math.max(Math.min(step,block.rhs.items.length-1),0),
                content: rtext,
                status: identifyLineStatus(rtext),
              },
            };
            lines.push(line);
          }
        }
        linesLeft.value = lines.map(l=>l.lhs);
        linesRight.value = lines.map(l=>l.rhs);
      } catch(e) {
        error.value = e;
        logError(e);
        logError('Failed when preparing diff results');
        throw e;
      }
    };

    onMounted(async () => {
      await Promise.all([
        fetchDataLeft(),
        fetchDataRight(),
      ]).then(prepareDiffs)
    });

    return { error, linesLeft, linesRight, hasValue };
  },
}

export default View;
