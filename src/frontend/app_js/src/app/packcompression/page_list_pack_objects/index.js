
import { ref, reactive, watch, computed, onMounted, toRaw } from 'vue';

import PackRecord from './component_record.js';
import StatisticsPane from './component_statistics_pane';

import './style.css';

import logError from '../../../error_logger/logError';
import { fetchWrapper } from '../../../common_defs/networking';





const View = {
  props: [
    'repoStatus', 'repoCallbacks',
  ],
  template: `
  <div class="mdm-git-gui-verifypack">
    <p class="description">View packed Git archive files.</p>
    <form @submit.prevent="handleGitGC" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
      <div class="error">{{ error }}</div>
      <div class="error">{{ validationMessage }}</div>
      <template v-if="!repoStatus?.history && !error">
        Querying data, please wait...
      </template>
      <template v-else-if="!!repoStatus?.history">
        <div class="top-row mdmreport-banner">
          <fieldset class="mdmreport-controls">
            <component-loader-spinner v-if="isBusy" />
            Compress and cleanup history: <button  :class="{'click-me-next':!gitPackCompressionIsReady}"type="submit">Start activity</button>
          </fieldset>
        </div>
      </template>
    </form>
    <template v-if="!!repoStatus?.history">
      <div v-if="!gitPackCompressionIsReady" class="note">Please hit the button above to see packed files.<br /><div class="footnote"></div></div>
      <div v-else class="mdm-git-gui-verifypack-inner">
        <div v-if="!allIsReady" class="note">
          Querying data, please wait...
          <div>Waiting when history compression is ready... {{ gitPackCompressionIsReady ? 'ok!' : 'working on it...' }}</div>
          <div>Waiting when config is ready... {{ configIsReady ? 'ok!' : 'working on it...' }}</div>
          <div>Waiting when history is ready... {{ historyIsReady ? 'ok!' : 'working on it...' }}</div>
          <div>Waiting when pack file info is ready... {{ packFilesIsReady ? 'ok!' : 'working on it...' }}</div>
          <div>Waiting when pack object info is ready... {{ packPhysicalObjectsIsReady ? 'ok!' : 'working on it...' }}</div>
          <div>Waiting when appended history info is ready... {{ packObjectsIsReady ? 'ok!' : 'working on it...' }}</div>
        </div>
        <template v-else>
        <statistics :packObjects="packObjects" :repoStatus="repoStatus" :repoCallbacks="repoCallbacks" />
          <component-filter-records-form
            :columns="{
              hash: 'Pack object hash',
              objectType: 'Object type',
              revisionHash: 'Revision hash',
              revisionAuthor: 'Revision author',
              revisionTimestamp: { label: 'Revision timestamp', type:'datetime' },
              revisionMessage: 'Revision message',
              filePath: 'File path',
              fileMode: 'File Mode',
              sizeSource: { label: 'Size of file', type:'number' },
              sizeCompressed: { label: 'Size Compressed', type:'number' },
              deltaDepth: 'Delta Depth',
              deltaBase: 'Delta Base',
            }"
            :keyField="'hash'"
            :records="packObjects"
            :needSort="true"
            ref="filteringComponent"
          >
            <div class="mdm-git-gui-pack-files pack-file-records mdm-ui-records">
              <packobject-record
                v-for="h in packObjectsSorted"
                :key="h.hash"
                :hash="h.hash"
                :objectType="h.objectType"
                :revisionHash="h.revisionHash"
                :revisionAuthor="h.revisionAuthor"
                :revisionTimestamp="h.revisionTimestamp"
                :revisionMessage="h.revisionMessage"
                :blobHash="h.blobHash"
                :filePath="h.filePath"
                :fileMode="h.fileMode"
                :sizeSource="h.sizeSource"
                :sizeCompressed="h.sizeCompressed"
                :deltaDepth="h.deltaDepth"
                :deltaBase="h.deltaBase"
                :statistics="statistics"
                :componentRecordsFiltData="h.componentRecordsFiltData"
                :repoStatus="repoStatus"
                :repoCallbacks="repoCallbacks"
              />
            </div>
          </component-filter-records-form>
        </template>
      </div>
    </template>
  </div>
`,
  components: {
    'packobject-record': PackRecord,
    'statistics': StatisticsPane,
  },
  setup(props) {

    const error = ref('');
    const validationMessage = ref('');
    const isBusy = ref(false);
    const gitPackCompressionIsReady = ref(false);
    const packFiles = ref(undefined);
    const packPhysicalObjects = ref(undefined); // purely parsed from git verify-output
    const packObjects = ref(undefined); // same as packPhysicalObjects but with appended associated data on revisions from history
    const gitPackCompressionIsReadyPromise = new Promise(resolve=>{
      watch(gitPackCompressionIsReady, value => {
        if( value ) {
          resolve();
        }
      });
    });

    const cumulativeComputedSource = computed(() => {
      try {
        if( !packObjects.value ) return NaN;
        return packObjects.value.reduce((acc,e)=>acc+Number(e.sizeSource),0);
      } catch(e) {
        logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        logError('Git Pack View: Failed retrieving data');
        error.value = e;
        throw e;
      }
    });

    const cumulativeComputedCompressed = computed(() => {
      try {
        if( !packObjects.value ) return NaN;
        return packObjects.value.reduce((acc,e)=>acc+Number(e.sizeCompressed),0);
      } catch(e) {
        logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        logError('Git Pack View: Failed retrieving data');
        error.value = e;
        throw e;
      }
    });

    const configIsReady = ref(undefined);
    const configIsReadyPromise = new Promise(resolve => {
      const checkConfigIsReady = () => {
        const value = !!props.repoStatus?.config?.dir_git_repo;
        if(value){
          configIsReady.value = true;
          resolve();
        }
      }
      watch(()=>props.repoStatus?.config?.dir_git_repo,checkConfigIsReady);
      checkConfigIsReady();
    });

    const packFilesIsReady = ref(undefined);
    const packFilesIsReadyPromise = new Promise(resolve => {
      const checkPackFilesIsReady = () => {
        const value = !!packFiles.value;
        if(value){
          packFilesIsReady.value = true;
          resolve();
        }
      }
      watch(packFiles,checkPackFilesIsReady);
      checkPackFilesIsReady();
    });

    const packPhysicalObjectsIsReady = ref(undefined);
    const packPhysicalObjectsIsReadyPromise = new Promise(resolve => {
      const checkPackPhysicalObjectsIsReady = () => {
        const value = !!packPhysicalObjects.value;
        if(value){
          packPhysicalObjectsIsReady.value = true;
          resolve();
        }
      }
      watch(packPhysicalObjects,checkPackPhysicalObjectsIsReady);
      checkPackPhysicalObjectsIsReady();
    });

    const packObjectsIsReady = ref(undefined);
    const packObjectsIsReadyPromise = new Promise(resolve => {
      const checkPackObjectsIsReady = () => {
        const value = !!packObjects.value;
        if(value){
          packObjectsIsReady.value = true;
          resolve();
        }
      }
      watch(packObjects,checkPackObjectsIsReady);
      checkPackObjectsIsReady();
    });

    const historyIsReady = ref(undefined);
    const historyIsReadyPromise = new Promise(resolve => {
      const checkHistoryIsReady = () => {
        const value = ref(!!props.repoStatus?.history);
        if(value) {
          historyIsReady.value = true;
          resolve();
        }
      }
      watch(()=>props.repoStatus?.history,checkHistoryIsReady);
      checkHistoryIsReady();
    });

    const handleGitGC = async () => {
      try {
        validationMessage.value = '';
        isBusy.value = true;
        await props.repoCallbacks.executeGitCommand(['git','gc']);
        gitPackCompressionIsReady.value = true;
        validationMessage.value = '';
        isBusy.value = false;
      } catch(e) {
        error.value = e;
        logError(e);
        logError('Failed when running git gc');
        throw e;
      }
    };

    const initGetPackFiles = async () => {
      try {
        const retrievedPackFiles = await fetchWrapper( 'GET','/functionality/git-ls-pack-files',undefined );
        packFiles.value = retrievedPackFiles;
        // const packFileFullPath = ref(`${props.repoStatus?.config?.dir_git_repo.replace(/[\\/]+$/, '')}/${`${props.packFile}`.replace(/^[\\/]+/, '')}`);
        // const outputs = ref(undefined);
        return retrievedPackFiles;
      } catch(e) {
        logError(e);
        logError('Git Pack View: initGetPackFiles: Failed retrieving data');
        error.value = e;
        throw e;
      }
    };

    const initGetPackPhysicalObjects = async (basePath,packFiles) => {
      function detectIfValidPackPhysicalObjectLine(outputsLine) {
        if( /^\s*$/.test(outputsLine) )
          return false;
        else if( /.*:.*/.test(outputsLine) )
          // non delta: 6 objects
          // chain length = 1: 1 object
          // /Users/andrej/work/gitgui/tests-real-sensitive-data/test-project-repo/.git/objects/pack/pack-aab45fb6a2984fd829d0c480193933dc0a483536.pack: ok
          return false;
        else if( /^\w+\s+\w+\s+\d+\s+\d+\s+\d+\b.*/.test(outputsLine) )
          // <sha> <type> <size> <compressed-size> <offset>=
          // <sha> <type> <size> <compressed-size> <offset> <depth> <base-sha>
          return true;
        else
          throw new Error(`Processing outputs from git verify-pack: unrecognized line format: "${outputsLine}"`);
      }
      function parseVerifyPackResultLine(line) {
        // non-delta:
        // <sha> <type> <size> <compressed-size> <offset>
        // delta-object:
        // <sha> <type> <size> <compressed-size> <offset> <depth> <base-sha>
        const parts = line.split(/\s+/);
        const hash = parts[0];
        const objectType = parts[1];
        const sizeSource = isFinite(Number(parts[2])) ? Number(parts[2]) : parts[2];
        const sizeCompressed = isFinite(Number(parts[3])) ? Number(parts[3]) : parts[3];
        // const offset = parts[4]; // useless
        const deltaDepth = parts[5]; // might be "undefined" but that's absolutely not a problem
        const deltaBase = parts[6]; // might be "undefined" but that's absolutely not a problem
        return {
          hash,
          objectType,
          sizeSource,
          sizeCompressed,
          deltaDepth,
          deltaBase,
        };
      }
      try {
        const retrievedPackPhysicalObjects = {};
        let i = 1;
        for( const path of packFiles ) {
          const packFileFullPath = ref(`${`${basePath}`.replace(/[\\/]+$/, '')}/${`${path}`.replace(/^[\\/]+/, '')}`);
          const result = await props.repoCallbacks.executeGitCommand(['git', 'verify-pack', '-v',packFileFullPath.value]);
          if( (result.returncode!==0) || !!result?.stderr )
            throw new Error(`returncode ${result.returncode}: ${result?.stderr}`);
          for( const outputsLine of result.stdout.split('\n') ) {
            if( !detectIfValidPackPhysicalObjectLine(outputsLine) )
              continue;
            const retrievedPackPhysicalObject = parseVerifyPackResultLine(outputsLine);
            retrievedPackPhysicalObjects[retrievedPackPhysicalObject.hash] = {...retrievedPackPhysicalObject,order:i};
            ++i;
          };
        };
        packPhysicalObjects.value = retrievedPackPhysicalObjects;
        return retrievedPackPhysicalObjects;
      } catch(e) {
        logError(e);
        logError('Git Pack View: initGetPackPhysicalObjects: Failed retrieving data');
        error.value = e;
        throw e;
      }
    };

    const initParseHistory = async () => {
      function parseLsTreeResult(line) {
        // 100644 blob ce013625030ba8dba906f756967f9e9ca394464a	README.txt
        const partsOuter = line.split('\t');
        const partsHeader = partsOuter[0].split(/\s+/);
        const fileMode = partsHeader[0];
        const objectType = partsHeader[1];
        const blobHash = partsHeader[2];
        const filePath = partsOuter[1];
        return {
          fileMode,
          objectType,
          blobHash,
          filePath,
        };
      }
      try {
        const retrievedPackObjects = {};
        for( const { hash, author, message, timestamp } of props.repoStatus.history) {
          // 0: Object {
          //   author: The-city-not-present
          //   hash: b4c0edf2997fe2bfef7da19b25b4423635d10323
          //   message: Hey
          //   timestamp: Sun Aug 16 2026 15:12:18 GMT+0300 (Moscow Standard Time)
          // }
          const revisionHash = hash;
          const revisionAuthor = author;
          const revisionTimestamp = timestamp;
          const revisionMessage = message;
          const result = await props.repoCallbacks.executeGitCommand(['git','ls-tree','-r','-z',hash,]);
          if( (result.returncode!==0) || !!result?.stderr )
            throw new Error(`returncode ${result.returncode}: ${result?.stderr}`);
          // 100644 blob ce013625030ba8dba906f756967f9e9ca394464a	README.txt
          // 100644 blob 33e0cb25e00b89f3bd9feeb51eb7b62033c54d67	let.me
          for( const outputsLine of result.stdout.split('\0') ) {
            if( /^\s*$/.test(outputsLine) )
              continue;
            const { fileMode, objectType, blobHash, filePath } = parseLsTreeResult( outputsLine );
            if( !retrievedPackObjects[blobHash] )
              retrievedPackObjects[blobHash] = [];
            retrievedPackObjects[blobHash].push({
              revisionHash,
              revisionAuthor,
              revisionTimestamp,
              revisionMessage,
              blobHash,
              filePath,
              fileMode,
            });
          }
        }
        return retrievedPackObjects;
      } catch(e) {
        logError(e);
        logError('Git Pack View: initParseHistory: Failed retrieving data');
        error.value = e;
        throw e;
      }
    };

    const init = async () => {
      try {
        await gitPackCompressionIsReadyPromise;
        const packFiles = await initGetPackFiles();
        await configIsReadyPromise;
        const basePackFilePath = props.repoStatus?.config?.dir_git_repo;
        const packPhysicalObjects = await initGetPackPhysicalObjects(basePackFilePath,packFiles);
        await historyIsReadyPromise;
        const revisionObjects = await initParseHistory();
        // and finally appended associated data from both together
        const objs = {};
        for( const [hash,obj] of Object.entries( packPhysicalObjects) ) {
          if(!objs[hash]) objs[hash] = {};
          objs[hash] = {...objs[hash],...obj};
        }
        for( const [hash,revisions] of Object.entries(revisionObjects) ) {
          if(!objs[hash]) objs[hash] = {};
          const obj = Array.from(revisions).sort((a, b) => (new Date(b.revisionTimestamp)) - (new Date(a.revisionTimestamp)))[0];
          objs[hash] = {...obj,...objs[hash]};
        }
        for( const [key,o] of Object.entries(objs) ) {
          if( !o.order )
            o.order = 0;
        }
        packObjects.value = Object.entries(objs).map(([hash,o])=>({...o,hash})).sort((a,b)=>a.order-b.order);
      } catch(e) {
        logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        logError('Git Pack View: Failed retrieving data');
        error.value = e;
        throw e;
      }
    };

    onMounted(async () => {
      await Promise.all([
        props.repoCallbacks.updateHistory(),
        props.repoCallbacks.configAskFor(),
        init(),
      ])
    });

    const allIsReady = computed(() =>
      gitPackCompressionIsReady.value &&
      configIsReady.value &&
      packFilesIsReady.value &&
      packPhysicalObjectsIsReady.value &&
      packObjectsIsReady.value &&
      historyIsReady.value
    );

    const statistics = computed(()=>({
      cumulativeComputedSource: cumulativeComputedSource.value,
      cumulativeComputedCompressed: cumulativeComputedCompressed.value,
    }));

    const filteringComponent = ref(null);

    const packObjectsSorted = computed(()=> {
      if( filteringComponent.value?.paginateAndSort ) {
        return filteringComponent.value?.paginateAndSort(packObjects.value);
      } else {
        // return packObjects.value; // returning all unfiltered results in full list rendered and crash on memory
        return [];
      }
    });

    return {
      error,
      isBusy,
      validationMessage,

      handleGitGC,

      gitPackCompressionIsReady,
      configIsReady,
      packFilesIsReady,
      packPhysicalObjectsIsReady,
      packObjectsIsReady,
      historyIsReady,
      allIsReady,

      packFiles,
      packPhysicalObjects,
      packObjects,

      statistics,

      filteringComponent,
      packObjectsSorted,
    };
  },
};

export default View;
