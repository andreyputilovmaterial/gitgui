
import { ref, onMounted } from 'vue';

import logError from '../../../error_logger/logError';

import './style.css';
import './styles_diffview.css';

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
  <template v-if="(!hasValue(diffedLinesLeft) || !hasValue(diffedLinesRight)) && !error">Quering data, please wait...</template>
  <template v-else-if="hasValue(diffedLinesLeft) && hasValue(diffedLinesRight)">
    <div class="two-sided-view">
      <div class="pane pane-left">
        <div class="linenumber-and-content-columns">
          <div class="linenum-col">
          </div>
          <div class="contents diff-outputs">
            <p v-for="line in diffedLinesLeft" :class="['code']">{{ line }}</p>
          </div>
        </div>
      </div>
      <div class="pane pane-right">
        <div class="linenumber-and-content-columns">
          <div class="linenum-col">
          </div>
          <div class="contents diff-outputs">
            <p v-for="line in diffedLinesRight" :class="['code']">{{ line }}</p>
          </div>
        </div>
      </div>
    </div>
  </template>
</div>
`,
  setup(props) {

    const error = ref('');
    const binaryDataLeft = ref(undefined);
    const binaryDataRight = ref(undefined);
    const txtLinesLeft = ref(undefined);
    const txtLinesRight = ref(undefined);
    const diffedLinesLeft = ref(undefined);
    const diffedLinesRight = ref(undefined);
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

    const normalizeLinebreaks = (result) => {
      try {
        const [left,right] = result;
        return [left.split('\n'),right.split('\n')]
      } catch(e) {
        error.value = e;
        logError(e);
        logError('Failed when fetching contents for right file');
        throw e;
      }
    }
    const fetchDataLeft = async () => {
      try {
        binaryDataLeft.value = await getContentsFromBlob(props.blobIdOld);
        txtLinesLeft.value = await props.repoCallbacks.textconv(binaryDataLeft.value,props.filepath);
        return txtLinesLeft.value;
      } catch(e) {
        error.value = e;
        logError(e);
        logError('Failed when fetching contents for left file');
        throw e;
      }
    };
    const fetchDataRight = async () => {
      try {
        binaryDataRight.value = await getContentsFromBlob(props.blobIdNew);
        txtLinesRight.value = await props.repoCallbacks.textconv(binaryDataRight.value,props.filepath);
        return txtLinesRight.value;
      } catch(e) {
        error.value = e;
        logError(e);
        logError('Failed when fetching contents for right file');
        throw e;
      }
    };

    const prepareDiffs = async ([left,right]) => {
      try {
        const result = normalizeLinebreaks([left,right]);
        // const result = normalizeLinebreaks(await props.repoCallbacks.diff(left,right,'sidebyside'));
        diffedLinesLeft.value = result[0];
        diffedLinesRight.value = result[1];
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

    return { error, diffedLinesLeft, diffedLinesRight, hasValue };
  },
}

export default View;
