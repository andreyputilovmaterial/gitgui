
// import { Vue } from "./vue.js";
import { createApp, ref, onMounted, onUnmounted, toRaw, watch } from 'vue'

import './app.css';
import './app_form_control_adjustments.css';


import { FetchError, fetchWrapper } from './common_defs/networking';
import { cliCommandRaw } from './common_defs/cli';
import ComponentSectionRollup from './common_components/rollable_sections/index';
import ComponentTabbedPanes from './common_components/tabbed_panes/tabbed_panes';
import ComponentTabbedPane from './common_components/tabbed_panes/tabbed_pane';
import ComponentFilterRecordsForm from './common_components/filter_records_form/index';
import './common_components/css_grid/styles.css';
import { ModalsSite } from './common_components/modals/modals';
import RepoInitView from './app/repoinitview/init_repo';
import MainView from './app/mainview/index';
import TerminalSessionView from './app/terminalview/index';
import ManipulateNavLinksDummyWrapper from './app/beautify_page_nav_links_handler/manipulate_links';
import AppOnlineIndicator from './app/onlineindicator';
import ErrorView from './app/errorview/index';
import { __access_errorSite } from './error_logger/setup';



document.addEventListener("DOMContentLoaded", () => {

  // const { createApp, ref, onMounted, onUnmounted, toRaw } = Vue



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
      <repo-init-form v-if="!repoStatus.repoExists" :repoStatus="repoStatus" :repoCallbacks="repoCallbacks" :config="config"></repo-init-form>
    </div>
    <maingui-view v-else-if="repoStatus.repoExists" :repoStatus="repoStatus" :repoCallbacks="repoCallbacks"></maingui-view>
  </div>
  <div class="mdm-git-gui-app-section-terminal section">
    <terminalsession-view :commands="commands" :executeGitCommand="executeGitCommand"></terminalsession-view>
  </div>
  <modals></modals>
  <nav-links-manipulate-dummy-wrapper></nav-links-manipulate-dummy-wrapper>
  <online-indicator :isonline="isOnline" :repoCallbacks="repoCallbacks" :config="config" :configPathsFirstCaptured="configPathsFirstCaptured" :configPathsMismatch="configPathsMismatch"></online-indicator>
</div>
`, // <modals></modals>
    components: {
      'errorbanner': ErrorView,
      'component-section-rollup': ComponentSectionRollup,
      'component-tabbed-panes': ComponentTabbedPanes,
      'component-tabbed-pane': ComponentTabbedPane,
      'component-filter-records-form': ComponentFilterRecordsForm,
      'repo-init-form': RepoInitView,
      'repoinit-view': RepoInitView,
      'maingui-view': MainView,
      'terminalsession-view': TerminalSessionView,
      'modals': ModalsSite,
      'nav-links-manipulate-dummy-wrapper': ManipulateNavLinksDummyWrapper,
      'online-indicator': AppOnlineIndicator,
    },
    setup() {

      const repoStatus = ref({});
      const repoCallbacks = ref({});
      const config = ref({});
      const configPathsFirstCaptured = ref({dir_work_tree:null,dir_git_repo:null,git_paths_hash:null});
      const configPathsMismatch = ref(false);
      const errors = ref([]);
      const isOnline = ref(true);
      const isOnlinePollingTimer = ref(undefined);
      const repoInitRequiresAttention = ref(false)
      // const commands = ref([{timestamp:new Date(),payload:'test-first-record',message_stdout:'test-first-record','message_stderr':'','source':null,'type':'test'}])
      const commands = ref([])

      function logError(e) {
        try {
          function genId() {
            const idbase = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
              const r = Math.random() * 16 | 0;
              const v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
            const idadd = `${errors.length}`;
            return `${idbase}-${idadd}`;
          }
          const errObjAppend = {error:e,id:genId(),time:new Date(),};
          errors.value.push(errObjAppend);
          console.error(e);
        } catch(fatale) {
          const err_msg = new Error(`FATAL: Something has happened when processing error: ${fatale} from ${e}`);
          console.error(err_msg);
          throw err_msg;
        }
      }
      repoCallbacks.value.logError = logError;
      __access_errorSite().promiseResolve(logError);
      __access_errorSite().promise = Promise.resolve(logError);

      function executeGitCommand(args,is_binary=false) {
        const formatArgsString = args => {
          const formatArg = str => {
            const hasSpaces = /\s/.test(str)
            if(!hasSpaces)
              return str;
            else {
              return '"' + str.replaceAll('"','\\"') + '"'
            }
          }
          return args.map(formatArg).join(' ')
        }
        args = args || []
        args = [...args]
        const promise = cliCommandRaw(args,is_binary)
        const command_str = formatArgsString(args)
        const command = {
          timestamp: new Date(),
          message_stdout: command_str,
          message_stderr: '',
          returncode: '',
          payload: {'message':command_str,'is_binary':is_binary},
          source: undefined,
          'type': 'request',
        }
        const source_command = command
        commands.value = [...commands.value,command]
        const getReturnCode = response => {
          const returnCode = ((response||{}).payload||{}).returncode
          if((returnCode==0)||!!returnCode) return `${returnCode}`; else return '';
        }
        promise.then(
          response => {
            const command = {
              timestamp: new Date(),
              message_stdout: ( is_binary ? '<raw bytes>' : (((response||{}).payload||{}).stdout||'') ),
              message_stderr: (((response||{}).payload||{}).stderr||''),
              returncode: getReturnCode(response),
              payload: response,
              source: source_command,
              'type': 'response',
            }
            commands.value = [...commands.value,command]
          },
          async err => {
            let response = {}
            try {
              response = await response.json();
            } catch(e) { }
            const command = {
              timestamp: new Date(),
              payload: err,
              message_stdout: '',
              message_stderr: err,
              returncode: getReturnCode(response),
              source: source_command,
              'type': 'error',
            }
            commands.value = [...commands.value,command]
          }
        )
        return promise.then(response=>{
          if( !response.ok )
            throw Error(`HTTP ${response.status}`);
          return response.payload;
        });
      };
      repoCallbacks.value.executeGitCommand = executeGitCommand;

      async function gitignoreRead() {
        function handleResponse(response) {
          // repoStatus.value = {...repoStatus.value,'gitignore':response}
          repoStatus.value.gitignore = response
          console.log('[DEBUG-vue-vars]',toRaw(repoStatus.value))
        }
        try {
          const response = await fetchWrapper('GET', '/functionality/gitignore',{})
          handleResponse(response)
          return response
        } catch (e) {
          if( e instanceof FetchError) {
            handleResponse(null)
            return false
          } else {
            logError(e);
            return;
          }
        }
      }
      repoCallbacks.value.gitignoreRead = gitignoreRead;

      async function configAskFor() {
        function handleResponse(response) {
          config.value = response
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
          logError(e);
        }
      }
      repoCallbacks.value.configAskFor = configAskFor;

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
          if( e instanceof FetchError) {
            handleResponse(false);
            return false;
          } else {
            logError(e);
            return;
          }
        }
      }
      repoCallbacks.value.updateGitRepoExistence = updateGitRepoExistence

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
          const response = await executeGitCommand(['git','log','--pretty=format:%H%x1f%an%x1f%s%x1f%ad%x1e','--date=iso-strict'])
          if( (response.returncode==128) && (/.*does not have any commits.*/.test(response?.stderr)) )
            return handleResponse('');
          if( response?.stderr )
            throw response?.stderr;
          return handleResponse(response.stdout);
        } catch (e) {
          logError(e);
          return;
        }
      }
      repoCallbacks.value.updateHistory = updateHistory

      async function setIsOnlineTimer() {
        const fn = async function () {
          try {
            const response = await fetchWrapper('HEAD', '/functionality/isup.txt',{})
            isOnline.value = true
            return true
          } catch (e) {
            if( e instanceof FetchError) {
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

      onMounted(async () => {
        await Promise.all([
          executeGitCommand(['git', 'status']),
          updateGitRepoExistence(),
          configAskFor(),
          gitignoreRead(),
          setIsOnlineTimer(),
        ])
      })

      // To watch a deeply nested property passed via props, you should use a getter function returning the specific field you are interested in, combined with the { deep: true } option if you want to detect changes inside that nested structure.
      watch(isOnline, (newValue, oldValue) => {
        if (!oldValue && !!newValue) {
          // triggered specifically on false → true
          configAskFor()
        }
      })
      return {
        errors,
        repoStatus,
        repoCallbacks,
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
  app.mount('#gitui_app');





});
