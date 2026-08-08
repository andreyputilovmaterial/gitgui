// import { Vue } from "./vue.js";
import { FetchError, fetchWrapper } from './common_defs/networking';
import { cliCommandRaw } from './common_defs/cli';
import { ComponentSectionRollUp } from './common_components/rollable_sections';
import { ModalsSite } from './common_components/modals';
import { RepoInitView } from './app/repoinitview';
import { MainView } from './app/mainview';
import { TerminalSessionView } from './app/terminalview';
import { ErrorView } from './app/errorview';
import { __access_errorSite } from './error_logger/setup';



document.addEventListener("DOMContentLoaded", () => {

  const { createApp, ref, onMounted, onUnmounted, toRaw } = Vue

  const app = createApp({
    template: `
<div class="mdm-git-ui-app">
  <errorbanner :errors="errors"></errorbanner>
  <repoinit-view :repoInitRequiresAttention="repoInitRequiresAttention" :repoStatus="repoStatus" :repoCallbacks="repoCallbacks"></repoinit-view>
  <maingui-view></maingui-view>
  <terminalsession-view :commands="commands" :executeGitCommand="executeGitCommand"></terminalsession-view>
  <modals></modals>
</div>
`, // <modals></modals>
    components: {
      'errorbanner': ErrorView,
      'component-section-rollup': ComponentSectionRollUp,
      'repoinit-view': RepoInitView,
      'maingui-view': MainView,
      'terminalsession-view': TerminalSessionView,
      'modals': ModalsSite,
    },
    setup() {

      const repoStatus = ref({
      })
      const repoCallbacks = ref({
      })
      const errors = ref([])
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

      function executeGitCommand(args) {
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
        const promise = cliCommandRaw(args)
        const command_str = formatArgsString(args)
        const command = {
          timestamp: new Date(),
          message_stdout: command_str,
          message_stderr: '',
          returncode: '',
          payload: {'message':command_str},
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
              message_stdout: (((response||{}).payload||{}).stdout||''),
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
        return promise
      }
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
          const response = await fetchWrapper('HEAD', '/functionality/is-git-repo',{})
          handleResponse(true)
          return true
        } catch (e) {
          if( e instanceof FetchError) {
            handleResponse(false)
            return false
          } else {
            reportError(e);
            return;
          }
        }
      }
      repoCallbacks.value.updateGitRepoExistence = updateGitRepoExistence

      onMounted(async () => {
        await Promise.all([
          executeGitCommand(['git', 'status','--porcelain=v2','--branch']),
          executeGitCommand(['git', 'status']),
          executeGitCommand(['git','rev-parse','--show-toplevel']),
          updateGitRepoExistence(),
          gitignoreRead(),
        ])
      })

      return {
        errors,
        repoStatus,
        repoCallbacks,
        repoInitRequiresAttention,
        commands,
        executeGitCommand,
      }

    }
  })
  // FORCE VUE DEVTOOLS TO ACTIVATE
  app.config.performance = true;
  app.component('component-section-rollup', ComponentSectionRollUp)
  app.mount('#gitui_app')





});
