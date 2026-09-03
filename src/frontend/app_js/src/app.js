
// import { Vue } from "./vue.js";
import { createApp, ref, onMounted, toRaw, watch, reactive, isReactive, h, version } from 'vue'


import './app.css';
import './app_form_control_adjustments.css';

// global tools
import { genId, prettyprintBytes, makeFetchResponseErrorMessage, } from './common_defs/helper_functions';
import cliCommandRaw from './common_defs/cli';
import ConcurrencyManager from './common_defs/concurrency/semaphore.js';

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
import ComponentInputNumericRange from './common_components/input_numeric_range/index';
import ComponentInputDatetimeRange from './common_components/input_datetime_range/index';
import ComponentLoaderSpinner from './common_components/loader_spinner/index';
import ComponentLoaderInProgress from './common_components/loader_inprogress/index';
import './common_components/css_grid/styles.css';

// all "system" components - modals, pages, environment for showing errors...
import { _logErrorProxyContext } from './common_components/_log_error_proxy';
import { ModalsSite, createModal } from './common_components/modals/modals';
import ManipulateNavLinksDummyWrapper from '@/app/background_navlinks_attachmodals/manipulate_links';

// direct children shown in starting view in app - window panes
import AppOnlineIndicator from './app/background_onlineindicator_overlay/index.js';
import ErrorView from '@/app/apppane_errorview/index';
import TerminalSessionView from '@/app/apppane_terminalview/index';
// direct children shown in starting view in app - tabs in main view
import RepoInitView from '@/app/window_repoinitview/init_repo';
import PageWelcome from '@/app/apptab_mainview_welcome/index';
import PageFiles from '@/app/apptab_filesview/index';
import PageHistory from '@/app/apptab_historyview/index';
import PageGitignore from '@/app/window_repoinitview/section_gitignore';
import PagePackcompression from '@/app/apptab_packcompression/index';






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
          <component-tabbed-pane id="gitignore" title="gitignore (tracked files)">
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
      const configPathsFirstCaptured = ref({dir_work_tree:null,dir_git_repo:null,git_paths_hash:null});
      const configPathsMismatch = ref(false);
      const errors = ref([]);
      const isOnline = ref(true);
      const isOnlinePollingTimer = ref(undefined);
      const repoInitRequiresAttention = ref(false);
      const commands = ref([]);
      const gitRepoReady = new Promise(resolve=>{
        watch(()=>repoStatus.value.repoExists,async ()=>{
          if( repoStatus.value.repoExists )
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
      function _executeGitCommand(args,{is_binary=false,...options} = {}) {
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
        args = args || [];
        args = [...args];
        const timestamp = new Date();
        const cliRawCommandReturnObject = cliCommandRaw(args,{is_interactive:false,...options,is_binary,});
        const promise = options.is_interactive ? cliRawCommandReturnObject.promise : cliRawCommandReturnObject;
        const jobData = options.is_interactive ? cliRawCommandReturnObject : null;
        const command_str = formatArgsString(args);
        const command = reactive({
          timestamp: timestamp,
          id: genId(['input',command_str,timestamp]),
          stdout: command_str,
          stderr: '',
          exit_code: '',
          is_binary: is_binary,
          is_interactive: options.is_interactive,
          // payload: {'message':command_str,'is_binary':is_binary},
          source: undefined,
          type: 'input',
        });
        const source_command = command;
        commands.value.push(command);
        const outputCommand = reactive({
          timestamp: new Date(),
          id: genId(['output',command_str,new Date()]),
          job_id: null,
          stdout: null,
          stderr: null,
          exit_code: null,
          is_binary: is_binary,
          is_interactive: options.is_interactive,
          source: source_command,
          'type': 'output',
        });
        promise.then(
          jobData => {
            outputCommand.job_id = jobData.job_id;
            outputCommand.stdout = jobData.stdout;
            outputCommand.stderr = jobData.stderr;
            outputCommand.exit_code = jobData.exit_code;
            commands.value.push(outputCommand);
          },
          async err => {
            const error = await makeFetchResponseErrorMessage(err);
            const command = reactive({
              timestamp: new Date(),
              id: genId(['error',command_str,new Date()]),
              stdout: '',
              stderr: error,
              exit_code: null,
              source: source_command,
              'type': 'error',
            });
            commands.value.push(command);
          }
        );
        if( is_binary ) {
          outputCommand.stdout = new OutputPlaceholderBinaryStream({download_url: jobData.download_url || 'output'});
        }
        // if( is_binary ) {
        //   return promise.then( async jobData => {
        //     if( noDownload ) {
        //       outputCommand.stdout = new OutputPlaceholderBinaryStream({download_url: jobData.download_url});
        //       return jobData;
        //     }
        //     throw new Error(`Return final binary response from executeGitCommand is no longer supported: response is "binary", it means it can get big - please download streamed response separately`);
        //     // const filename = 'output';
        //     // const downloadUrl = `${new URL(jobData.download_url, window.location.origin)}`.replace('%FILENAME%',filename);
        //     // const fileDataResponse = await fetch(
        //     //   downloadUrl,
        //     //     {method: 'GET',
        //     //     headers: {
        //     //         "Content-Type": "application/octet-stream"
        //     //     },
        //     //   },
        //     // );
        //     // if (!fileDataResponse.ok) {
        //     //   throw Error(`Download failed: HTTP ${fileDataResponse.status}`);
        //     // }
        //     // const fileDataBuffer = await fileDataResponse.arrayBuffer();
        //     // const fileDataByteArray = new Uint8Array(fileDataBuffer);
        //     // // const fileDataSize = fileDataByteArray.byteLength;
        //     // outputCommand.stdout = prettyprintBytes(fileDataByteArray);
        //     // return fileDataByteArray;
        //   });
        // } else
        //   // if text
        //   return promise;
        if( options.is_interactive ) {
          return Promise.resolve(jobData);
        } else {
          return promise;
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
          // const configPathsFirstCaptured = ref({dir_work_tree:null,dir_git_repo:null,git_paths_hash:null});
          if(!configPathsFirstCaptured.value.dir_work_tree)
            configPathsFirstCaptured.value.dir_work_tree = response.dir_work_tree
          if(!configPathsFirstCaptured.value.dir_git_repo)
            configPathsFirstCaptured.value.dir_git_repo = response.dir_git_repo
          if(!configPathsFirstCaptured.value.git_paths_hash)
            configPathsFirstCaptured.value.git_paths_hash = response.git_paths_hash
          if(
               ( !!configPathsFirstCaptured.value.dir_work_tree && !(configPathsFirstCaptured.value.dir_work_tree==response.dir_work_tree) )
            || ( !!configPathsFirstCaptured.value.dir_git_repo && !(configPathsFirstCaptured.value.dir_git_repo==response.dir_git_repo) )
            || ( !!configPathsFirstCaptured.value.git_paths_hash && !(configPathsFirstCaptured.value.git_paths_hash==response.git_paths_hash) )

          )
            configPathsMismatch.value = true
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
          console.log('[DEBUG-vue-vars]',toRaw(repoStatus.value))
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

      async function checkIfSomethingIsInStagingArea() {
        function handleResponse(response) {
          if( response.exit_code === 0 )
            return false;
          else if( response.exit_code === 1 )
            return true;
          else
            throw new Error(`checkIfSomethingIsInStagingArea: failed to parse response: "${response.stdout}" ( exit_code == ${response.exit_code}, stderr == "${response.stderr}" )`);
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
            throw new Error(`checkIfSomethingIsInStagingArea: failed to parse response: (${response.exit_code}) "${response.stdout}": ${e}`,{cause:e});
          }
        } catch (e) {
           repoActions.value.logError(e);
        }
      }
      repoActions.value.checkIfSomethingIsInStagingArea = checkIfSomethingIsInStagingArea;

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

      onMounted(async () => {
        await Promise.all([
          executeGitCommand(['git', 'status']),
          updateGitRepoExistence(),
          configCheckUpdates(),
          gitignoreRead(),
          setIsOnlineTimer(),
          (()=>{
            gitRepoReady.then(checkIfSomethingIsInStagingArea);
            gitRepoReady.then(getHEAD);
            return null; // to make linter happy, that return value becomes part of promise, and it is not "void"
          })(),
          (()=>{
            // console.log(`[DEBUG]: vue version is ${version}`);
            window.isReactive = isReactive;
            window.vueVersion = version;
            return null; // to make linter happy, that return value becomes part of promise, and it is not "void"
          })(),
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
  app.component('component-input-numericrange',ComponentInputNumericRange);
  app.component('component-input-datetimerange',ComponentInputDatetimeRange);
  app.component('component-loader-spinner', ComponentLoaderSpinner);
  app.component('component-loader-inprogress', ComponentLoaderInProgress);
  app.mount('#gitui_app');





});
