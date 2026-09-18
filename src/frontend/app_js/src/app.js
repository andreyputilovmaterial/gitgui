
// import { Vue } from "./vue.js";
import { createApp, ref, onMounted, toRaw, watch, reactive, isReactive, h, version } from 'vue'


import './app.css';
import './app_form_control_adjustments.css';

// global tools
import { genId, prettyprintBytes, makeFetchResponseErrorMessage, } from './common_defs/helper_functions';
import cliCommandRaw from './common_defs/cli';
import parseGitStatus from './common_defs/parse_git_status';
import ConcurrencyManager from './common_defs/concurrency/semaphore.js';
import ReplayEvent from './common_defs/concurrency/subscribe.js';

// "lib"
import { diff } from './lib/myers-diff/src/index';
import textconvBackendFactory from './textconv_backend/index';

// all from "common_components"
import ComponentSectionRollup from './common_components/rollable_sections/index';
import ComponentTabbedPanes from './common_components/tabbed_panes/tabbed_panes';
import ComponentTabbedPane from './common_components/tabbed_panes/tabbed_pane';
import ComponentFilterRecordsForm from './common_components/filter_records_form/index';
import ComponentFormatDatetime from './common_components/format_datetime/index';
import ComponentFormatFilesize from './common_components/format_filesize/index';
import ComponentFormatHash from './common_components/format_hash/index';
import ComponentFormatLocalFilePath from './common_components/format_local_file_path/index';
import ComponentInputNumericRange from './common_components/input_numeric_range/index';
import ComponentInputDatetimeRange from './common_components/input_datetime_range/index';
import ComponentLoaderSpinner from './common_components/loader_spinner/index';
import ComponentLoaderInProgress from './common_components/loader_inprogress/index';
import './common_components/css_grid/styles.css';

// all "system" components - modals, pages, environment for showing errors...
import { _logErrorProxyContext } from './common_components/_log_error_proxy';
import { ModalsSite, createModal } from './common_components/modals/modals';
import ManipulateNavLinksDummyWrapper from './app/background_navlinks_attachmodals/manipulate_links';

// direct children shown in starting view in app - window panes
import AppOnlineIndicator from './app/background_onlineindicator_overlay/index.js';
import ErrorView from './app/apppane_errorview/index';
import TerminalSessionView from './app/apppane_terminalview/index';
// direct children shown in starting view in app - tabs in main view
import RepoInitView from './app/window_repoinitview/init_repo';
import PageWelcome from './app/apptab_welcomeview/index';
import PageFiles from './app/apptab_filesview/index';
import PageHistory from './app/apptab_historyview/index';
import PageGitignore from './app/window_repoinitview/section_gitignore';
import PagePackcompression from './app/apptab_packcompression/index';






document.addEventListener("DOMContentLoaded", () => {

  // const { createApp, ref, onMounted, onUnmounted, toRaw } = Vue;



  const app = createApp({
    template: `
<div class="mdm-git-ui-app">
  <div class="mdm-git-gui-app-section-errorbanner">
    <errorbanner :errors="errors"></errorbanner>
  </div>
  <div class="mdm-git-gui-app-section-mainview section">
    <div v-if="repoStatus.repoExists===undefined">Requesting repo status and fetching data, please wait...</div>
    <div v-else-if="repoStatus.repoExists===false" class="repo-existence-section">
      {{ !!repoStatus.repoExists ? '' : 'Repo is not initialized yet' }}
      <repo-init-form v-if="!repoStatus.repoExists" :repoStatus="repoStatus" :repoActions="repoActions" :config="config"></repo-init-form>
    </div>
    <div v-else-if="repoStatus.repoExists" class="mdm-git-gui-mainview">
      <template v-if="!repoStatus?.repoExists">
        Repo is not inited. Nothing to display.
      </template>
      <template v-else>
        <component-tabbed-panes active="home">
          <component-tabbed-pane id="home" title="Overview">
            <page-welcome :repoStatus="repoStatus" :repoActions="repoActions" />
          </component-tabbed-pane>
          <component-tabbed-pane id="files" title="Files">
            <page-files :repoStatus="repoStatus" :repoActions="repoActions" />
          </component-tabbed-pane>
          <component-tabbed-pane id="history" title="History">
            <page-history :repoStatus="repoStatus" :repoActions="repoActions" />
          </component-tabbed-pane>
          <component-tabbed-pane id="gitignore" title="Gitignore (tracked files)">
            <page-gitignore :repoStatus="repoStatus" :repoActions="repoActions" />
          </component-tabbed-pane>
          <component-tabbed-pane id="packstatus" title="Disk usage">
            <page-packcompression :repoStatus="repoStatus" :repoActions="repoActions" />
          </component-tabbed-pane>
        </component-tabbed-panes>
      </template>
    </div>
  </div>
  <div class="mdm-git-gui-app-section-terminal section">
    <terminalsession-view
      :commands="commands"
      :repoActions="repoActions"
    />
  </div>
  <modals></modals>
  <nav-links-manipulate-dummy-wrapper :repoActions="repoActions" />
  <online-indicator :isonline="isOnline" :repoActions="repoActions" :config="config" :configPathsFirstCaptured="configPathsFirstCaptured" :configPathsMismatch="configPathsMismatch"></online-indicator>
</div>
`,
    components: {
      'errorbanner': ErrorView,
      'repo-init-form': RepoInitView,
      'repoinit-view': RepoInitView,
      'page-welcome': PageWelcome,
      'page-files': PageFiles,
      'page-history': PageHistory,
      'page-gitignore': PageGitignore,
      'page-packcompression': PagePackcompression,
      'terminalsession-view': TerminalSessionView,
      'modals': ModalsSite,
      'nav-links-manipulate-dummy-wrapper': ManipulateNavLinksDummyWrapper,
      'online-indicator': AppOnlineIndicator,
    },
    setup() {

      const repoStatus = ref({});
      const repoActions = ref({});
      const config = ref({});
      const configPathsFirstCaptured = ref({working_tree:null,git_directory:null,git_paths_hash:null});
      const configPathsMismatch = ref(false);
      const errors = ref([]);
      const isOnline = ref(true);
      const isOnlinePollingTimer = ref(undefined);
      const repoInitRequiresAttention = ref(false);
      const commands = ref([]);
      const appBackendWarnings = ref([]);
      const gitCommandEvent = new ReplayEvent();
      const configUpdatesEvent = new ReplayEvent();
      const gitRepoReady = new Promise(resolve=>{
        watch(()=>repoStatus.value.repoExists,async ()=>{
          if( repoStatus.value.repoExists )
            resolve();
        });
      });
      const appReady = new Promise(resolve=>{
        watch(commands,async ()=>{
          if( commands.value.length>0 )
            resolve();
        });
      });
      const configReady = new Promise(resolve=>{
        watch(config,async ()=>{
          if( Object.keys(config.value).length>0 )
            resolve();
        });
      });



      function logError(e) {
        try {
          const timestamp = new Date();
          const errObjAppend = {
            error: e,
            id: genId([errors.value.length,timestamp]),
            time: timestamp,
          };
          errors.value.push(errObjAppend);
          console.error(e);
        } catch(fatale) {
          // I really don't understand why linter is still not happy
          // this seems to be literally impossible to make it happy
          // just recently it forced me to add that { cause: ...} everywhere when error is re-throw from catch clause
          // and now it says Error constructor accepts 0..1 arguments...
          const err_msg = new Error(`FATAL: Something has happened when processing error: ${fatale} from ${e}`,{cause:e});
          console.error(err_msg);
          throw err_msg;
        }
      }
      _logErrorProxyContext.promiseResolve(logError);
      repoActions.value.logError = logError;



      const fetchWrapper = async (method, endpoint, payload) => {
        const options = {
          method: method, // .toUpperCase(),
        };
        const normalizedMethod = method.trim().toUpperCase();
        // GET and HEAD requests cannot have a body.
        if (normalizedMethod !== "GET" && normalizedMethod !== "HEAD" && payload !== undefined) {
          options.body = JSON.stringify(payload);
        }
        options.headers = {
          "Content-Type": "application/json",
        };
        const response = await fetch(endpoint, options);
        if (!response.ok) {
          throw new Error(await makeFetchResponseErrorMessage(response));
        }
        const text = await response.text();
        if (!text.trim()) {
          return null;
        }
        return JSON.parse(text);
        // return await response.json();
      };
      repoActions.value.fetchWrapper = fetchWrapper;



      const gitCommandConcurrencyManager = new ConcurrencyManager(5);
      class OutputPlaceholderInProgress {
        toString() {
          return "⌛";
        }
        isInProgress() {
          return true;
        }
      }
      class OutputPlaceholderBinaryStream {
        constructor({download_url,filename}) {
          const isNotEmpty = value => {
            if( typeof value==='number' )
              return true;
            else if( typeof value==='string' )
              return !( /^\s*$/.test(value) );
            else
              return !!value;
          };
          this.desc = '[ binary data ]';
          if( isNotEmpty(download_url) ) {
            filename = isNotEmpty(filename) ? filename : 'output';
            const downloadUrl = `${new URL(download_url, window.location.origin)}`.replace('%FILENAME%',filename);
            this.desc = `[ download: ${ downloadUrl } ]`;
          }
        }
        toString() {
          return this.desc;
        }
        isBinaryStream() {
          return true;
        }
      }
      // a bit confusing arg name,
      // with "is_binary" style (with underscore) - because it maps to what is directly sent to backend
      // and "attachExistingJob" (camel-case) - for purely internal flags, dispatch and caught here in js
      function _executeGitCommand(command,{is_binary=false,attachExistingJob=false,parentJobId=null,...options} = {}) {
        const formatArgsString = args => {
          const formatArg = str => {
            const hasSpaces = str => /\s/.test(str);
            const isEmpty = str => {
              if( /^\s*$/.test(str) )
                return true;
              if( typeof str==='number' )
                return false;
              return !str;
            };
            if( !!hasSpaces(str) || isEmpty(str) )
              return '"' + ( isEmpty(str) ? '' : `${str}`.replaceAll('"','\\"') ) + '"';
            else
              return str;
          }
          return args.map(formatArg).join(' ')
        };
        if( !attachExistingJob ) {
          command = command || [];
          command = [ ...command ];
        }
        const timestamp = new Date();
        const cliRawCommandReturnObject = cliCommandRaw(command,{is_interactive:false,attachExistingJob,...options,is_binary,});
        const promise = options.is_interactive ? cliRawCommandReturnObject.promise : cliRawCommandReturnObject;
        let jobData = reactive( options.is_interactive ? {stdout:null,stderr:null,exit_code:null,...cliRawCommandReturnObject} : {stdout:null,stderr:null,exit_code:null,} );
        if( options.is_interactive )
          cliRawCommandReturnObject.subscribeUpdates( jobDataNew => Object.assign(jobData,jobDataNew) );
        else
          promise.then(jobData => jobData.subscribeUpdates( jobDataNew => Object.assign(jobData,jobDataNew) ));
        promise.then(()=>gitCommandEvent.emit(jobData));
        const command_str = !attachExistingJob ? formatArgsString(command) : null;
        const inputCommandRecord = !attachExistingJob ? reactive({
          timestamp: timestamp,
          id: genId(['input',command_str,timestamp]),
          stdout: command_str,
          stderr: '',
          exit_code: '',
          job_id: options.is_interactive ? null : jobData.job_id,
          is_binary: is_binary,
          is_interactive: options.is_interactive,
          // payload: {'message':command_str,'is_binary':is_binary},
          source: undefined,
          type: 'input',
        }) : null;
        if( !attachExistingJob ) {
          commands.value.push( inputCommandRecord );
          watch(
            ()=>jobData.job_id,
            newJob_id => inputCommandRecord.job_id = newJob_id,
            { immediate: true },
          );
        }
        const outputCommandRecord = reactive({
          timestamp: new Date(),
          id: genId(['output',command_str,new Date()]),
          stdout: null,
          stderr: null,
          job_id: jobData.job_id,
          exit_code: null,
          is_binary: is_binary,
          is_interactive: options.is_interactive,
          source: inputCommandRecord || {},
          'type': 'output',
        });
        watch(
          ()=>jobData.job_id,
          newJob_id => outputCommandRecord.job_id = newJob_id,
          { immediate: true },
        );
        if( !!attachExistingJob && !!parentJobId ) {
          function findParentCommandRecord(parentJobId) {
            const matching = commands.value.filter(c=>c.job_id===parentJobId);
            if( matching.length>0 )
              return matching[0];
            else
              return null;
          }
          const promiseParentFound = new Promise((resolve,reject) => {
            const stopWatcher = watch(
              jobData,
              newJobData => {
                const commandRecordWithParentJobId = findParentCommandRecord(parentJobId);
                if( commandRecordWithParentJobId )
                  resolve(commandRecordWithParentJobId);
              },
              { immediate: true, },
            );
          });
          promiseParentFound.then( commandRecordWithParentJobId => {
            outputCommandRecord.source = commandRecordWithParentJobId;
          } );
        }
        promise.then(
          jobData => {
            outputCommandRecord.job_id = jobData.job_id;
            outputCommandRecord.stdout = jobData.stdout;
            outputCommandRecord.stderr = jobData.stderr;
            outputCommandRecord.exit_code = jobData.exit_code;
            commands.value.push(outputCommandRecord);
          },
          async err => {
            const error = await makeFetchResponseErrorMessage(err);
            const command = reactive({
              timestamp: new Date(),
              id: genId(['error',command_str,new Date()]),
              stdout: '',
              stderr: error,
              exit_code: null,
              source: inputCommandRecord,
              'type': 'error',
            });
            commands.value.push(command);
          }
        );
        if( is_binary ) {
          outputCommandRecord.stdout = new OutputPlaceholderBinaryStream({download_url: jobData.download_url || 'output'});
        }
        if( options.is_interactive ) {
          return Promise.resolve(jobData);
        } else {
          return promise.then( jobDataFinal => {
            Object.assign(jobData,jobDataFinal);
            return jobData;
          } );
        }
      }
      async function _executeGitAsyncCommand(args,{is_binary=false,...options} = {}) {
        return _executeGitCommand(args,{...options,is_interactive:true});
      }
      async function _executeGitBinaryCommand(args,options={}) {
        return _executeGitCommand(args,{...options,is_interactive:true,is_binary:true});
      }
      const executeGitCommand = (...args) => gitCommandConcurrencyManager.run(()=>_executeGitCommand(...args));
      const executeGitAsyncCommand = (...args) => gitCommandConcurrencyManager.run(()=>_executeGitAsyncCommand(...args));
      const executeGitBinaryCommand = (...args) => gitCommandConcurrencyManager.run(()=>_executeGitBinaryCommand(...args));
      repoActions.value.executeGitCommand = executeGitCommand;
      repoActions.value.executeGitAsyncCommand = executeGitAsyncCommand;
      repoActions.value.executeGitBinaryCommand = executeGitBinaryCommand;
      repoActions.value.attachToRunningCommand = (job_id,options,...rest) => _executeGitCommand(job_id,{...options,attachExistingJob:true},...rest)

      async function gitignoreRead() {
        function handleResponse(response) {
          // repoStatus.value = {...repoStatus.value,'gitignore':response}
          repoStatus.value.gitignore = response;
        }
        try {
          const response = await fetchWrapper('GET', '/functionality/gitignore',{})
          handleResponse(response)
          return response
        } catch (e) {
          if( ( e instanceof Error) && ( /^\s*?HTTP\b\s*4\d{2}\b.*/.test(e.message) ) ) {
            handleResponse(null);
            return false
          } else {
             repoActions.value.logError(e);
          }
        }
      }
      repoActions.value.gitignoreRead = gitignoreRead;

      async function configCheckUpdates() {
        function handleResponse(response) {
          config.value = response
          repoStatus.value.config = response;
          Promise.resolve().then(()=>configUpdatesEvent.emit(repoStatus.value.config));
        }
        try {
          const response = await fetchWrapper('GET', '/functionality/config',{})
          handleResponse(response)
          return response
        } catch (e) {
           repoActions.value.logError(e);
        }
      }
      repoActions.value.configCheckUpdates = configCheckUpdates;

      async function updateGitRepoExistence() {
        function handleResponse(response) {
          // repoStatus.value = {...repoStatus.value,'repoExists':response}
          repoStatus.value.repoExists = response
          if(!response) {
            repoInitRequiresAttention.value = true
          }
        }
        try {
          const response = await fetchWrapper('HEAD', '/functionality/is-git-repo',{});
          handleResponse(true);
          return true;
        } catch (e) {
          if( ( e instanceof Error) && ( /^\s*?HTTP\b\s*4\d{2}\b.*/.test(e.message) ) ) {
            handleResponse(false);
            return false;
          } else {
             repoActions.value.logError(e);
            return;
          }
        }
      }
      repoActions.value.updateGitRepoExistence = updateGitRepoExistence;

      async function updateHistory() {
        function handleResponse(response) {
          repoStatus.value.history = response
            .split("\x1e")
            .filter(a => a && !/^\s*$/.test(a))
            .map(str => str.split("\x1f"))
            .map(ar => ({
              hash: ar[0].trim(),
              author: ar[1].trim(),
              message: ar[2],
              timestamp: new Date(ar[3].trim())
            }));
        }
        try {
          const response = await executeGitCommand(['git','log','--pretty=format:%H%x1f%an%x1f%s%x1f%ad%x1e','--date=iso-strict']);
          if( (response.exit_code===128) && (/.*does not have any commits.*/.test(response?.stderr)) ) {
            const stdout = '';
            try {
              return handleResponse(stdout);
            } catch(e) {
              throw new Error(`updateHistory: failed to parse response: "${stdout}"`,{cause:e});
            }
          }
          if( response?.stderr )
            throw response?.stderr;
          const stdout = response.stdout;
          try {
            return handleResponse(stdout);
          } catch(e) {
            throw new Error(`updateHistory: failed to parse response: "${stdout}"`,{cause:e});
          }
        } catch (e) {
           repoActions.value.logError(e);
          return;
        }
      }
      repoActions.value.updateHistory = updateHistory;

      async function checkIfSomethingInIndex() {
        function handleResponse(response) {
          if( response.exit_code === 0 )
            return false;
          else if( response.exit_code === 1 )
            return true;
          else
            throw new Error(`checkIfSomethingInIndex: failed to parse response: "${response.stdout}" ( exit_code == ${response.exit_code}, stderr == "${response.stderr}" )`);
        }
        try {
          if( !repoStatus.value.repoExists )
            return;
          const response = await executeGitCommand(['git','diff','--cached','--quiet']);
          // git diff --cached --quiet
          // Exit status tells you the answer:
          // 0 → nothing staged
          // 1 → something is staged
          // From Python:
          // result = subprocess.run(["git", "diff", "--cached", "--quiet"])
          // has_staged = result.exit_code != 0
          // If you also want to see what is staged, use:
          // git diff --cached --stat
          // or:
          // git diff --cached --stat

          if( response?.stderr )
            throw response?.stderr;
          try {
            repoStatus.value.isSomethingInStagingArea = handleResponse(response);
          } catch(e) {
            throw new Error(`checkIfSomethingInIndex: failed to parse response: (${response.exit_code}) "${response.stdout}": ${e}`,{cause:e});
          }
        } catch (e) {
           repoActions.value.logError(e);
        }
      }
      repoActions.value.checkIfSomethingInIndex = checkIfSomethingInIndex;
      gitCommandEvent.subscribe(event=>{
        const gitAppArgument = (()=>{
          const command = event.command;
          if( !command || (command.length<=1) || (command[0]!=='git') )
            return null;
          for(const arg of command.slice(1))
            if( /^(?:clone|init|add|mv|restore|rm|bisect|diff|grep|log|show|status|backfill|branch|commit|merge|rebase|reset|switch|tag|fetch|pull|push)$/.test(arg) )
              return arg;
          return null;
        })();
        if( ['add','commit','rebase','merge','cherry-pick','branch','switch','checkout'].includes(gitAppArgument) )
          checkIfSomethingInIndex();
      });

      async function getHEAD() {
        function handleResponse(response) {
          if( (response.exit_code === 0) && !(response.stderr) )
            return `${response.stdout}`.trim();
          else
            throw new Error(`getHEAD: failed to parse response: "${response.stdout}" ( exit_code == ${response.exit_code}, stderr == "${response.stderr}" )`);
        }
        try {
          if( !repoStatus.value.repoExists )
            return;
          const response = await executeGitCommand(['git', 'rev-parse', 'HEAD']);

          if( response.exit_code===128 ) {
            repoStatus.value.HEAD = null;
            return;
          }
          if( response?.stderr )
            throw new Error(`response?.stderr`);
          try {
            repoStatus.value.HEAD = handleResponse(response);
          } catch(e) {
            throw new Error(`getHEAD: failed to parse response: (${response.exit_code}) "${response.stdout}": ${e}`,{cause:e});
          }
        } catch (e) {
           repoActions.value.logError(e);
        }
      }
      repoActions.value.getHEAD = getHEAD;
      gitCommandEvent.subscribe(event=>{
        const gitAppArgument = (()=>{
          const command = event.command;
          if( !command || (command.length<=1) || (command[0]!=='git') )
            return null;
          for(const arg of command.slice(1))
            if( /^(?:clone|init|add|mv|restore|rm|bisect|diff|grep|log|show|status|backfill|branch|commit|merge|rebase|reset|switch|tag|fetch|pull|push)$/.test(arg) )
              return arg;
          return null;
        })();
        if( ['add','commit','rebase','merge','cherry-pick','branch','switch','checkout'].includes(gitAppArgument) )
          getHEAD();
      });

      async function getStatus() {
        const updStatusOnUntracked = records => records.map(a=> a.type==='untracked' ? ({...a,worktree:'A',index:'.'}) : a);
        try {
          // git status --porcelain=v2 -z
          const gitStatusCommandJobObject = await executeGitBinaryCommand(['git','status','--porcelain=v2','-z'],{is_binary:true,is_interactive:true,});
          await gitStatusCommandJobObject.promiseDownloadLinkReady;
          const filename = 'git status';
          const binaryData = await gitStatusCommandJobObject.downloadFullStdout(filename);
          await gitStatusCommandJobObject.promise;
          if( (gitStatusCommandJobObject.exit_code!==0) || (!!gitStatusCommandJobObject.stderr && (gitStatusCommandJobObject.stderr.trim().length>0)) ) {
            throw new Error(`exit_code: ${gitStatusCommandJobObject.exit_code}, stderr: ${gitStatusCommandJobObject.stderr}`);
          }
          repoStatus.value.status = updStatusOnUntracked(parseGitStatus(binaryData));
        } catch(e) {
          repoActions.value.logError(e);
          repoActions.value.logError('failed when getting repo status with git status --porcelain=v2 -z');
          throw e;
        }
      }
      repoActions.value.getStatus = getStatus;
      gitCommandEvent.subscribe(event=>{
        const gitAppArgument = (()=>{
          const command = event.command;
          if( !command || (command.length<=1) || (command[0]!=='git') )
            return null;
          for(const arg of command.slice(1))
            if( /^(?:clone|init|add|mv|restore|rm|bisect|diff|grep|log|show|status|backfill|branch|commit|merge|rebase|reset|switch|tag|fetch|pull|push)$/.test(arg) )
              return arg;
          return null;
        })();
        if( ['add','commit','rebase','merge','cherry-pick','branch','switch','checkout'].includes(gitAppArgument) )
          getStatus();
      });
      function checkFileStatus(filepath) {
        const isNonEmpty = a => {
          if( (typeof a==='undefined')||(a===null) )
            return false;
          else if( typeof a==='number' )
            return true;
          else if(typeof a==='string')
            return a!=='';
          else
            return !!a;
        };
        const asString = a => isNonEmpty(a) ? `${a}` : '';
        for(const record of repoStatus.value.status) {
          if( record.path===filepath ) {
            return record;
          }
        }
        for(const record of repoStatus.value.status) { // repeat checking untracked files, that are recorded as parent path, not exact file
          const recordPathClean = asString(record.path).replace(/[\/]$/ig,'')+'/'; // make sure it ends with a "/", it's it's really a subpath, not just partial match in file name
          if( filepath.startsWith(recordPathClean) ) {
            return record;
          }
        }
        return null;
      }
      repoActions.value.checkFileStatus = checkFileStatus;
      function checkFolderStatus(filepath) {
        const isNonEmpty = a => {
          if( (typeof a==='undefined')||(a===null) )
            return false;
          else if( typeof a==='number' )
            return true;
          else if(typeof a==='string')
            return a!=='';
          else
            return !!a;
        };
        const asString = a => isNonEmpty(a) ? `${a}` : '';
        function combineRecords(fieldType,vvs) {
          const asChar = a => { const r = asString(a); if(r==='') return ' '; else return r[0]; };
          const allEqual = arr => arr.every(v => v === arr[0]);
          const combinePaths = arr => {
            const paths = arr.map(a => asString(a).split(/[\\/]+/).filter(Boolean));
            const prefix = paths.reduce((prefix, path) =>
              prefix.filter((v, i) => v === path[i])
            );
            return (asString(arr[0]).match(/^[\\/]/) ? '/' : '') + prefix.join('/');
          };;
          const combinePermissionMasks = arr => {
            // hmmm, bitwise and is simpler and better?
            let result = '';
            const len = Math.max(...arr.map(a=>asString(a).length));
            for(let i=0;i<len;++i) {
              const toNumber = s => {
                if([' ','.',undefined,null].includes(s))
                  return -1;
                return Number(s); // if !isFinite, we still return NaN
              };
              const chars = values.map(v=>asChar(asString(v)[i]));
              const combinedInt = Math.max(...chars.map(toNumber));
              const char = !isFinite(combinedInt) ? 'N' : (combinedInt>9) ? '9' : (combinedInt<0?' ':((combinedInt>=0)&&(combinedInt<=9)&&(combinedInt===(combinedInt|0))?asChar(combinedInt):'?'));
              result += char;
            };
            return result;
          };
          const combineModifiedFlag = arr => {
            let result = '.';
            let level = 0;
            for(const iter of arr) {
              const l = ( iter==='U' ? 2 : ( iter==='.' ? 0 : 1 ) ); // 0 = unchanged, 1 = modified, 2 = merge conflict, higher pri
              if( l>level ) {
                level = l;
                result = level===1 ? 'M' : iter;
              }
            }
            return result;
          };
          const values = vvs.filter(a=>(typeof a!=='undefined'));
          if( values.length===0 )
            return undefined;
          if( allEqual(values) )
            return values[0];
          if( ['index','worktree','submodule.c','submodule.m','submodule.u'].includes(fieldType) )
            return combineModifiedFlag(values);
          else if( ['xy'].includes(fieldType) )
            return combineModifiedFlag(values.map(a=>`${asChar(asString(a)[0])}${asChar(asString(a)[1])}`));
          else if( ['headMode','indexMode','worktreeMode',].includes(fieldType) )
            return combinePermissionMasks(values);
          else if( ['path',].includes(fieldType) )
            return combinePaths(values);
          return NaN;
        }
        const filepathClean = asString(filepath).replace(/[\/]$/ig,'')+'/';
        const partialMatchesForDirectory = [];
        for(const record of repoStatus.value.status) {
          if( record.path.startsWith(filepathClean) )
            partialMatchesForDirectory.push(record);
          else if( filepathClean.startsWith(asString(record.path).replace(/[\/]$/ig,'')+'/') )
            partialMatchesForDirectory.push(record);
        }
        if( partialMatchesForDirectory.length>0 )
          return {
            "type": combineRecords('type',partialMatchesForDirectory.map(record=>record?.type)), // "ordinary"
            "index": combineRecords('index',partialMatchesForDirectory.map(record=>record?.index)), // "."
            "worktree": combineRecords('worktree',partialMatchesForDirectory.map(record=>record?.worktree||(record.type==='untracked'?'M':undefined)||record?.worktree)), // "M"
            "xy": combineRecords('xy',partialMatchesForDirectory.map(record=>record?.xy)), // ".M"
            "submodule": {
              "kind": combineRecords('submodule.kind',partialMatchesForDirectory.map(record=>record?.submodule?.kind)), // "normal"
              "isSubmodule": combineRecords('submodule.isSubmodule',partialMatchesForDirectory.map(record=>record?.submodule?.isSubmodule)), // false
              "c": combineRecords('submodule.c',partialMatchesForDirectory.map(record=>record?.submodule?.c)), // "."
              "m": combineRecords('submodule.m',partialMatchesForDirectory.map(record=>record?.submodule?.m)), // "."
              "u": combineRecords('submodule.u',partialMatchesForDirectory.map(record=>record?.submodule?.u)), // "."
            },
            "headMode": combineRecords('headMode',partialMatchesForDirectory.map(record=>record?.headMode)), // "100644"
            "indexMode": combineRecords('indexMode',partialMatchesForDirectory.map(record=>record?.indexMode)), // "100644"
            "worktreeMode": combineRecords('worktreeMode',partialMatchesForDirectory.map(record=>record?.worktreeMode)), // "100644"
            "headObject": combineRecords('headObject',partialMatchesForDirectory.map(record=>record?.headObject)), // "854d736acb73334c0e987c15e04d838b8d882a1f"
            "indexObject": combineRecords('indexObject',partialMatchesForDirectory.map(record=>record?.indexObject)), // "854d736acb73334c0e987c15e04d838b8d882a1f"
            "path": combineRecords('path',partialMatchesForDirectory.map(record=>record?.path)), // ".vscode/launch.json"
          };
        return null;
      }
      repoActions.value.checkFolderStatus = checkFolderStatus;

      async function getTrackedFiles() {
        function parseGitLsTrackedFiles(data) {
          const utf8Decoder = new TextDecoder("utf-8");
          function decodeUtf8(bytes) {
            return utf8Decoder.decode(bytes);
          }
          const result = [];
          let pos = 0;
          while (pos < data.length) {
            // Empty record (e.g. trailing NUL).
            if (data[pos] === 0) {
              pos++;
              continue;
            }
            const recordStart = pos;
            // Find the first NUL.
            while (pos < data.length && data[pos] !== 0) {
              pos++;
            }
            const record = data.subarray(recordStart, pos);
            if (record.length === 0) {
              pos++;
              continue;
            }
            result.push(decodeUtf8(record));
            // Skip NUL.
            if (pos < data.length) {
              pos++;
            }
          }
          return result;
        }
        try {
          // git status --porcelain=v2 -z
          const gitStatusCommandJobObject = await executeGitBinaryCommand(['git','ls-files','-z'],{is_binary:true,is_interactive:true,});
          await gitStatusCommandJobObject.promiseDownloadLinkReady;
          const filename = 'git status';
          const binaryData = await gitStatusCommandJobObject.downloadFullStdout(filename);
          await gitStatusCommandJobObject.promise;
          if( (gitStatusCommandJobObject.exit_code!==0) || (!!gitStatusCommandJobObject.stderr && (gitStatusCommandJobObject.stderr.trim().length>0)) ) {
            throw new Error(`exit_code: ${gitStatusCommandJobObject.exit_code}, stderr: ${gitStatusCommandJobObject.stderr}`);
          }
          repoStatus.value.trackedFiles = parseGitLsTrackedFiles(binaryData);
        } catch(e) {
          repoActions.value.logError(e);
          repoActions.value.logError('failed when getting repo status with git status --porcelain=v2 -z');
          throw e;
        }
      }
      repoActions.value.getTrackedFiles = getTrackedFiles;
      gitCommandEvent.subscribe(event=>{
        const gitAppArgument = (()=>{
          const command = event.command;
          if( !command || (command.length<=1) || (command[0]!=='git') )
            return null;
          for(const arg of command.slice(1))
            if( /^(?:clone|init|add|mv|restore|rm|bisect|diff|grep|log|show|status|backfill|branch|commit|merge|rebase|reset|switch|tag|fetch|pull|push)$/.test(arg) )
              return arg;
          return null;
        })();
        if( ['add','commit','rebase','merge','cherry-pick','branch','switch','checkout'].includes(gitAppArgument) )
          getTrackedFiles();
      });
      function checkFileTracked(filepath) {
        const isNonEmpty = a => {
          if( (typeof a==='undefined')||(a===null) )
            return false;
          else if( typeof a==='number' )
            return true;
          else if(typeof a==='string')
            return a!=='';
          else
            return !!a;
        };
        const asString = a => isNonEmpty(a) ? `${a}` : '';
        const norm = s => asString(s).replace(/[/\//]/ig,'/');
        const pathClean = norm(filepath);
        for( const trackedPath of ( [...repoStatus.value.trackedFiles,...( Array.isArray(repoStatus.value.status) ? repoStatus.value.status.filter(f=>f.type==='untracked').map(f=>f.path) : [] )] ) ) {
          if( trackedPath===pathClean )
            return true;
          else if( pathClean.startsWith( trackedPath.replace(/[\/\\]$/ig,'')+'/' ) )
            return true;
        }
        return false;
      }
      repoActions.value.checkFileTracked = checkFileTracked;
      function checkFolderTracked(filepath) {
        const isNonEmpty = a => {
          if( (typeof a==='undefined')||(a===null) )
            return false;
          else if( typeof a==='number' )
            return true;
          else if(typeof a==='string')
            return a!=='';
          else
            return !!a;
        };
        const asString = a => isNonEmpty(a) ? `${a}` : '';
        const norm = s => asString(s).replace(/[/\//]/ig,'/');
        const filepathClean = norm(filepath).replace(/[\/\\]$/ig,'')+'/';
        for(const record of ( [...repoStatus.value.trackedFiles,...( Array.isArray(repoStatus.value.status) ? repoStatus.value.status.filter(f=>f.type==='untracked').map(f=>f.path) : [] )] ) ) {
          if( record.startsWith(filepathClean) )
            return true;
          else if( filepathClean.startsWith(record.replace(/[\/\\]$/ig,'')+'/') )
            return true;
        }
        return false;
      }
      repoActions.value.checkFolderTracked = checkFolderTracked;

      async function setIsOnlineTimer() {
        const fn = async function () {
          try {
            await fetchWrapper('HEAD', '/functionality/isup.txt',{})
            isOnline.value = true
            return true
          } catch (e) {
            if( ( e instanceof Error) && ( /^\s*?HTTP\b\s*4\d{2}\b.*/.test(e.message) ) ) {
              isOnline.value = false
              return false
            } else {
              isOnline.value = false
              return false
            }
          }
        }
        isOnlinePollingTimer.value = setInterval(fn,7850);
      }

      repoActions.value.createModal = (Component) => createModal(h(Component,{repoStatus,repoActions,}));

      // repoActions.value.textconv_js = textconvJsFactory( ({ logError: (...args) => repoActions.value.logError(...args), }) );
      repoActions.value.textconv_backend = textconvBackendFactory( ({ logError: (...args) => repoActions.value.logError(...args),}) );
      repoActions.value.textconv = repoActions.value.textconv_backend;

      repoActions.value.diff = diff;

      const maintenanceAndDebug = async () => {
        const tasks = [
          () => {
            window.isReactive = isReactive;
            window.vueVersion = version;
          },
          () => {
            setIsOnlineTimer();
          },
          () => {
            configUpdatesEvent.subscribe( config => {
              try {
                // const configPathsFirstCaptured = ref({working_tree:null,git_directory:null,git_paths_hash:null});
                if(!configPathsFirstCaptured.value.working_tree)
                  configPathsFirstCaptured.value.working_tree = config.working_tree
                if(!configPathsFirstCaptured.value.git_directory)
                  configPathsFirstCaptured.value.git_directory = config.git_directory
                if(!configPathsFirstCaptured.value.git_paths_hash)
                  configPathsFirstCaptured.value.git_paths_hash = config.git_paths_hash
                if(
                     ( !!configPathsFirstCaptured.value.working_tree && !(configPathsFirstCaptured.value.working_tree==config.working_tree) )
                  || ( !!configPathsFirstCaptured.value.git_directory && !(configPathsFirstCaptured.value.git_directory==config.git_directory) )
                  || ( !!configPathsFirstCaptured.value.git_paths_hash && !(configPathsFirstCaptured.value.git_paths_hash==config.git_paths_hash) )

                )
                  configPathsMismatch.value = true;
              } catch(e) {
                logError(e);
                logError(`Failed when monitoring if config paths chanegd: ${e}`);
                configPathsMismatch.value = true;
                Promise.resolve().then(()=>{ throw e; });
              }
            });
          },
          () => {
            configUpdatesEvent.subscribe( config => {
              const newWarnings = (config?.warnings||[]).filter(message=>!appBackendWarnings.value.includes(message));
              appBackendWarnings.value.push(...newWarnings);
              for(const msg of newWarnings)
                logError(msg);
            });
          },
          // async () => {
          //   throw new Error('Check failed maintenance task!');
          // },
          () => {
            const doesBrowserSupportCssMediaRules = (()=>{
              try {
                return !!window.CSS && !!window.CSS.supports && window.CSS.supports('container-type: inline-size');
              } catch(e) {
                return false;
              }
              return false;
            })();
            if( !doesBrowserSupportCssMediaRules ) {
              logError(`Warning: your browser does not support css media rules. App might be rendered incorrectly. Please use newer browser, released after 2022.`);
            }
          },
        ];
        for( const task of tasks) {
          try {
            await task();
          } catch(e) {
            logError(e);
            Promise.resolve().then(()=>{ throw e; });
          }
        }
        return null; // so that can be called in batch from Promise.all and is not causing linter warning, cause it's result might be used...
      };

      onMounted(async () => {
        await Promise.all([
          executeGitCommand(['git', 'status']), // for the beautiful message in terminal view, so it prints git status
          configCheckUpdates(),
          updateGitRepoExistence(),
          gitignoreRead(),
          (()=>{
            gitRepoReady.then(checkIfSomethingInIndex);
            gitRepoReady.then(getHEAD);
            gitRepoReady.then(getStatus);
            gitRepoReady.then(getTrackedFiles);
            gitRepoReady.then(gitignoreRead);
            return null; // to make linter happy, that return value becomes part of promise, and it is not "void"
          })(),
          maintenanceAndDebug(),
        ])
      });

      // To watch a deeply nested property passed via props, you should use a getter function returning the specific field you are interested in, combined with the { deep: true } option if you want to detect changes inside that nested structure.
      watch(isOnline, (newValue, oldValue) => {
        if (!oldValue && !!newValue) {
          // triggered specifically on false → true
          configCheckUpdates()
        }
      });

      window.getRepoStatus = () => repoStatus;

      return {
        errors,
        repoStatus,
        repoActions,
        config,
        configPathsFirstCaptured,
        configPathsMismatch,
        isOnline,
        repoInitRequiresAttention,
        commands,
        executeGitCommand,
      }

    }
  })
  // FORCE VUE DEVTOOLS TO ACTIVATE
  app.config.performance = true;
  app.component('component-section-rollup', ComponentSectionRollup);
  app.component('component-tabbed-panes', ComponentTabbedPanes);
  app.component('component-tabbed-pane', ComponentTabbedPane);
  app.component('component-filter-records-form', ComponentFilterRecordsForm);
  app.component('component-format-datetime', ComponentFormatDatetime);
  app.component('component-format-filesize', ComponentFormatFilesize);
  app.component('component-format-hash', ComponentFormatHash);
  app.component('component-format-local-file-path', ComponentFormatLocalFilePath);
  app.component('component-input-numericrange',ComponentInputNumericRange);
  app.component('component-input-datetimerange',ComponentInputDatetimeRange);
  app.component('component-loader-spinner', ComponentLoaderSpinner);
  app.component('component-loader-inprogress', ComponentLoaderInProgress);
  app.mount('#gitui_app');





});
