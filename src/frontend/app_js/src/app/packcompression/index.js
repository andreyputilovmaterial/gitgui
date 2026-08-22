
import { ref, reactive, watch, computed, onMounted, toRaw } from 'vue';

import './style.css';

import logError from '../../error_logger/logError';
import { fetchWrapper } from '../../common_defs/networking';




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
  <span class="blob-record-element hash" title="Hash">
    <span class="label">Hash: </span>
    {{ hash }}
  </span>
  <span class="blob-record-element objectType" title="Type">
    <span class="label">Type: </span>
    {{ objectType }}
  </span>
  <span class="blob-record-element revisionHash" title="Revision ash">
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
  <span class="blob-record-element fileMode" title="fileMode">
    <span class="label">fileMode: </span>
    {{ fileMode }}
  </span>
  <span class="blob-record-element length" title="length">
    <span class="label">length: </span>
    {{ length }}
  </span>
  <span class="blob-record-element sizeCompressed" title="sizeCompressed">
    <span class="label">sizeCompressed: </span>
    {{ sizeCompressed }}
  </span>
  <span class="blob-record-element deltaDepth" title="deltaDepth">
    <span class="label">deltaDepth: </span>
    {{ deltaDepth }}
  </span>
  <span class="blob-record-element deltaBase" title="deltaBase">
    <span class="label">deltaBase: </span>
    {{ deltaBase }}
  </span>
</div>
`,
  setup() {
    return {};
  },
};




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
            Cleanup unnecessary files and optimize the local repository: <button  :class="{'click-me-next':!gitPackCompressionIsReady}"type="submit">Start activity</button>
          </fieldset>
        </div>
      </template>
    </form>
    <template v-if="!!repoStatus?.history">
      <div v-if="!gitPackCompressionIsReady" class="note">Please hit the button above to see packed files.<br /><div class="footnote">WARNING: could take a while</div></div>
      <div v-else class="mdm-git-gui-verifypack-inner">
        <div v-if="!allIsReady" class="note">
          Querying data, please wait...
          <div class="">Waiting when history is compressed... {{ gitPackCompressionIsReady ? 'ok!' : 'working on it...' }}</div>
          <div class="">Waiting when config is ready... {{ configIsReady ? 'ok!' : 'working on it...' }}</div>
          <div class="">Waiting when history is ready... {{ historyIsReady ? 'ok!' : 'working on it...' }}</div>
          <div class="">Waiting when info about pack files is ready... {{ packFilesIsReady ? 'ok!' : 'working on it...' }}</div>
          <div class="">Waiting when info about pack objects is ready... {{ packPhysicalObjectsIsReady ? 'ok!' : 'working on it...' }}</div>
          <div class="">Waiting when appended info from history... {{ packObjectsIsReady ? 'ok!' : 'working on it...' }}</div>
        </div>
        <component-filter-records-form v-else :columns="{ 'hash': 'Hash', 'objectType': 'Object type', 'revisionHash': 'Revision hash', 'filePath': 'File path', 'fileMode': 'File Mode', 'length': 'Size of file', 'sizeCompressed': 'Size Compressed', 'deltaDepth': 'Delta Depth', 'deltaBase': 'Delta Base', }" :setComponentFilterRecordsClasses="setComponentFilterRecordsClasses">
          <div class="mdm-git-gui-pack-files pack-file-records mdm-ui-records">
            <packobject-record
              v-for="(packObject,hash) in packObjects"
              :key="packObject.hash"
              :hash="packObject.hash"
              :objectType="packObject.objectType"
              :revisionHash="packObject.revisionHash"
              :blobHash="packObject.blobHash"
              :filePath="packObject.filePath"
              :fileMode="packObject.fileMode"
              :length="packObject.length"
              :sizeCompressed="packObject.sizeCompressed"
              :deltaDepth="packObject.deltaDepth"
              :deltaBase="packObject.deltaBase"
              :componentFilterRecordsGetClassesCb="componentFilterRecordsGetClassesCb"
              :repoStatus="repoStatus"
              :repoCallbacks="repoCallbacks"
            />
          </div>
        </component-filter-records-form>
      </div>
    </template>
  </div>
`,
  components: {
    'packobject-record': PackRecord,
  },
  setup(props) {

    const error = ref('');
    const validationMessage = ref('');
    const isBusy = ref(false);
    const componentFilterRecordsGetClassesCb = ref(()=>[]);
    const setComponentFilterRecordsClasses = cb => componentFilterRecordsGetClassesCb.value = cb;
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
        const length = parts[2];
        const sizeCompressed = parts[3];
        // const offset = parts[4]; // useless
        const deltaDepth = parts[5]; // might be "undefined" but that's absolutely not a problem
        const deltaBase = parts[6]; // might be "undefined" but that's absolutely not a problem
        return {
          hash,
          objectType,
          length,
          sizeCompressed,
          deltaDepth,
          deltaBase,
        };
      }
      try {
        const retrievedPackPhysicalObjects = {};
        for( const path of packFiles ) {
          const packFileFullPath = ref(`${`${basePath}`.replace(/[\\/]+$/, '')}/${`${path}`.replace(/^[\\/]+/, '')}`);
          const result = await props.repoCallbacks.executeGitCommand(['git', 'verify-pack', '-v',packFileFullPath.value]);
          if( (result.returncode!==0) || !!result?.stderr )
            throw new Error(`returncode ${result.returncode}: ${result?.stderr}`);
          for( const outputsLine of result.stdout.split('\n') ) {
            if( !detectIfValidPackPhysicalObjectLine(outputsLine) )
              continue;
            const retrievedPackPhysicalObject = parseVerifyPackResultLine(outputsLine);
            retrievedPackPhysicalObjects[retrievedPackPhysicalObject.hash] = retrievedPackPhysicalObject;
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
        const parts = line.split(/\s+/);
        const fileMode = parts[0];
        const objectType = parts[1];
        const blobHash = parts[2];
        const filePath = parts[3];
        return {
          fileMode,
          objectType,
          blobHash,
          filePath,
        };
      }
      try {
        const retrievedPackObjects = {};
        for( const { hash } of props.repoStatus.history) {
          // 0: Object {
          //   author: The-city-not-present
          //   hash: b4c0edf2997fe2bfef7da19b25b4423635d10323
          //   message: Hey
          //   timestamp: Sun Aug 16 2026 15:12:18 GMT+0300 (Moscow Standard Time)
          // }
          const revisionHash = hash;
          const result = await props.repoCallbacks.executeGitCommand(['git','ls-tree','-r',hash,]);
          if( (result.returncode!==0) || !!result?.stderr )
            throw new Error(`returncode ${result.returncode}: ${result?.stderr}`);
          // 100644 blob ce013625030ba8dba906f756967f9e9ca394464a	README.txt
          // 100644 blob 33e0cb25e00b89f3bd9feeb51eb7b62033c54d67	let.me
          for( const outputsLine of result.stdout.split('\n') ) {
            if( /^\s*$/.test(outputsLine) )
              continue;
            const { fileMode, objectType, blobHash, filePath } = parseLsTreeResult( outputsLine );
            retrievedPackObjects[blobHash] = {
              revisionHash,
              blobHash,
              filePath,
              fileMode,
            }
          }
        }
        // packObjects.value = retrievedPackObjects;
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
        const blobObjects = await initParseHistory();
        // and finally appended associated data from both together
        const objs = {};
        for( const [hash,obj] of Object.entries(blobObjects) ) {
          if(!objs[hash]) objs[hash] = {};
          objs[hash] = {...objs[hash],...obj};
        }
        for( const [hash,obj] of Object.entries( packPhysicalObjects) ) {
          if(!objs[hash]) objs[hash] = {};
          objs[hash] = {...objs[hash],...obj};
        }
        packObjects.value = objs;
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

      componentFilterRecordsGetClassesCb,
      setComponentFilterRecordsClasses,
    };
  },
};

export default View;
