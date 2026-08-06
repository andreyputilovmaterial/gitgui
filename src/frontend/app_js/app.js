// import { Vue } from "./vue.js";
import { formatDate, delay } from './common_defs/functions';
import { FetchError, fetchWrapper } from './common_defs/networking';
import { parseCommand, cliCommandRaw } from './common_defs/cli';

document.addEventListener("DOMContentLoaded", () => {

  const { createApp, ref, onMounted, onUnmounted, toRaw } = Vue

  const globalRepoSetup = {}














  const ComponentSectionRollUp = {
    props: {
      'header': String,
      'condensed': {
        type: [String, Boolean], // Accepts either a string "true" or an actual boolean true
        default: "true",          // The default value if the prop is missing
      },
      // How to check the prop value inside your TemplateYou can
      // use Vue directives directly in your HTML template string
      // to react to the prop:
      // To toggle visibility:
      // <div class="body" v-if="condensed === 'true'">
      // To toggle a CSS class:
      // <div :class="{ 'is-condensed': condensed === 'true' }">
      // pro tip:
      // condensed: {
      //   type: Boolean,
      //   default: true
      // }
      // Use code with caution.
      // If you do this, passing it via plain HTML like
      // condensed="false"
      // will still evaluate as a string and cause bugs.
      // To pass a real JavaScript boolean from your HTML file,
      // you must use Vue's binding colon (:):
      // <section-roll-up :condensed="false">
      // Would you like to see how to use this condensed prop to dynamically add a CSS class to your container element?

    },
    template: `
<div class="mdm-ui-rollup"
   :data-condensed="isCondensed"
   :class="{
     'mdm-ui-rollup-condensed': isCondensed == 'true' || isCondensed === true,
     'mdm-ui-rollup-open': isCondensed != 'true' && isCondensed !== true
   }"><div class="mdm-ui-rollup-header" @click="isCondensed = !isCondensed">{{ header }}</div>
<div class="mdm-ui-rollup-body"><slot></slot></div>
</div>
`,
    setup(props) {
      const {ref,watch} = Vue
      const determineInitialState = () => {
        return props.condensed === 'true' || props.condensed === true
      }
      const isCondensed = ref(determineInitialState())
      watch(() => props.condensed, () => {
        isCondensed.value = determineInitialState()
      })
      return {isCondensed}
    }
  }

  const RepoInitViewGitignoreSection = {
    props: [
      'repoInitRequiresAttention',
      'repoStatus',
      'repoCallbacks',
    ],
    template: `
    <form  @submit.prevent="handleSubmit" :class="\`mdmreport-controls git-repo-gitignore-edit-form \${isBusy ? 'mdmreport-form-busy' : ''}\`">
      <h3>gitignore Setup</h3>
      <fieldset class="mdmreport-controls">
        <div class="mdmreport-controls-group">
          <label>gitignore file: </label>
          <textarea type="text" name="gitignore" value="" placeholder="" style="width: 100%;" v-model="formFields.gitignore" disabled></textarea>
        </div>
      </fieldset>
    </form>
`,
  setup(props) {
    const { ref, reactive, watch } = Vue

    const isBusy = ref(false)

    const formFields = reactive({
      gitignore: '',
    })
    const handleSubmit = async () => {

       try {
         isBusy.value = true

       } catch (error) {
         console.error("Form submission failed:", error)
       } finally {
         isBusy.value = false
       }
     }
     watch(() => props.repoStatus, () => {
       formFields.gitignore = props.repoStatus.gitignore
     })

    return { formFields, handleSubmit, isBusy }
    }
  }

  const RepoInitViewInitTheRepo = {
    props: [
      'repoStatus',
      'repoCallbacks',
    ],
    template: `
    <form  @submit.prevent="handleSubmit" :class="\`mdmreport-controls git-repo-init-form \${isBusy ? 'mdmreport-form-busy' : ''}\`">
      <h3>Init as git repo</h3>
      <fieldset class="mdmreport-controls">
        <div class="mdmreport-controls-group">
          <input type="submit" class="init-repo-action-call-button submit" value="Init git"></input>
        </div>
      </fieldset>
    </form>
`,
  setup(props) {
    const { ref, reactive, watch } = Vue

    const isBusy = ref(false)

    const formFields = reactive({
    })
    const handleSubmit = async () => {

       try {
         isBusy.value = true
         console.log('[DEBUG-initrepo-form-submit]: initiating "git init" command...')
         await props.repoCallbacks.executeGitCommand(['git','init'])
         await props.repoCallbacks.updateGitRepoExistence(),
         await props.repoCallbacks.updateGitignore(),
         console.log('[DEBUG-initrepo-form-submit]: after await')
       } catch (error) {
         console.error("Form submission failed:", error)
       } finally {
         isBusy.value = false
       }
     }

    return { formFields, handleSubmit, isBusy }
    }
  }

  const RepoInitView = {
    props: [
      'repoInitRequiresAttention',
      'repoStatus',
      'repoCallbacks',
    ],
    template: `
      <component-section-rollup header="Repo Init View" :condensed="!repoInitRequiresAttention">
        <div class="git-repo-intro-setup-section">
          <div class="repo-existence-section">
            {{ !!repoStatus.repoExists ? '' : 'Repo is not initialized yet' }}
            <repo-init-form v-if="!repoStatus.repoExists" :repoStatus="repoStatus" :repoCallbacks="repoCallbacks"></repo-init-form>
          </div>
          <div class="gitignore-section">
            <gitignore-section :repoInitRequiresAttention="repoInitRequiresAttention" :repoStatus="repoStatus" :repoCallbacks="repoCallbacks"></gitignore-section>
          </div>
        </div>
      </component-section-rollup>
    `,
    components: {
      'gitignore-section': RepoInitViewGitignoreSection,
      'repo-init-form': RepoInitViewInitTheRepo,
    },
    setup(props) {
      const { ref, toRaw, watch } = Vue
      // console.log("[debug-vue-component-RepoInitView] (setup()): props repoStatus:", props.repoStatus);
      // console.log("[debug-vue-component-RepoInitView] (setup()): props repoStatus.repoExists:", props.repoStatus.repoExists);
      // watch(() => props.repoStatus?.repoExists, () => {
      //   console.log("[debug-vue-component-RepoInitView] (watch()): props repoStatus:", props.repoStatus);
      //   console.log("[debug-vue-component-RepoInitView] (watch()): props repoStatus.repoExists:", props.repoStatus.repoExists);
      // })

      return {} // { toRaw }
    }
  }

  const MainView = {
    template: `
      <component-section-rollup header="Main Status View" :condensed="false">
      Hey, your current status is...
      </component-section-rollup>
    `,
    setup() {
      return {  }
    }
  }

  const TerminalSubmitForm = {
    props: [
      'executeGitCommand',
    ],
    template: `
      <form  @submit.prevent="handleSubmit" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
        <fieldset class="mdmreport-controls">
          <div class="error">{{ formFields.validationError }}</div>
          <div class="mdmreport-controls-group">
            <label style="display: none;">COMMAND:  </label>
            <input type="text" name="command" value="" placeholder="git command: " v-model="formFields.command"></input>
            <input type="submit" value="Execute" class="submit"></input>
            <p class="hint"><small>Note: every command gets --git-dir path... --work-tree path... --no-pager params appended</small></p>
          </div>
        </fieldset>
      </form>
    `,
    setup(props) {
      const { ref, reactive } = Vue

      const isBusy = ref(false)

      const formFields = reactive({
        command: '',
        validationError: '',
      })
       const handleSubmit = async () => {

         try {
           isBusy.value = true
           const command = parseCommand(formFields.command)
           const result = await props.executeGitCommand(command)
           formFields.command = ''
           formFields.validationError = ''

         } catch (error) {
           console.error("Form submission failed:", error)
           formFields.validationError = error

         } finally {
           isBusy.value = false
          //  formFields.command = ''
         }
       }

      return { formFields, handleSubmit, isBusy }
    }
  }

  const TerminalRecord = {
    props: [
      'timestamp',
      'payload',
      'message_stdout',
      'message_stderr',
      'returncode',
      'source',
      'type',
    ],
    template: `
      <div :class="\`terminal-record terminal-record-status-\${type}\`">
        <span class="timestamp">{{ formatDate(timestamp) }}</span>
        <span class="status">{{ type }}</span>
        <span :class="\`returncode returncode-status-\${String(returncode)==String('0')?'success':'nonzero'}\`" title="returncode - %errorlevel%">{{ returncode }}</span>
        <span class="message">{{ message_stdout }}<div class="err error">{{ message_stderr }}</div></span>
      </div>
    `,
    setup() {
      return { formatDate }
    }
  }

  const TerminalSessionView = {
    props: [
      'commands',
      'executeGitCommand',
    ],
    template: `
      <component-section-rollup header="Commands View" :condensed="false">
      <div class="mdm-git-gui-terminal">
      <terminal-submit-form :executeGitCommand="executeGitCommand"></terminal-submit-form>
      <terminal-record
        v-for="cmd in commands"
        :timestamp="cmd.timestamp"
        :payload="cmd.payload"
        :message_stdout="cmd.message_stdout"
        :message_stderr="cmd.message_stderr"
        :returncode="cmd.returncode"
        :source="cmd.source"
        :type="cmd.type">
      </terminal-record>
      </div>
      </component-section-rollup>
    `,
    components: {
      'terminal-record': TerminalRecord,
      'terminal-submit-form': TerminalSubmitForm,
    },
    setup() {
      return { }
    }
  }

  const app = createApp({
    template: `
<repoinit-view :repoInitRequiresAttention="repoInitRequiresAttention" :repoStatus="repoStatus" :repoCallbacks="repoCallbacks"></repoinit-view>
<maingui-view></maingui-view>
<terminalsession-view :commands="commands" :executeGitCommand="executeGitCommand"></terminalsession-view>
`,
    components: {
      'component-section-rollup': ComponentSectionRollUp,
      'repoinit-view': RepoInitView,
      'maingui-view': MainView,
      'terminalsession-view': TerminalSessionView,
    },
    setup() {

      const repoStatus = ref({
      })
      const repoCallbacks = ref({
      })
      const repoInitRequiresAttention = ref(false)
      // const commands = ref([{timestamp:new Date(),payload:'test-first-record',message_stdout:'test-first-record','message_stderr':'','source':null,'type':'test'}])
      const commands = ref([])

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
      repoCallbacks.value.executeGitCommand = executeGitCommand

      async function updateGitignore() {
        function handleResponse(response) {
          // repoStatus.value = {...repoStatus.value,'gitignore':response}
          repoStatus.value.gitignore = response
          console.log('[DEBUG-vue-vars]',toRaw(repoStatus.value))
        }
        const response = await fetchWrapper('GET', '/functionality/gitignore',{})
        handleResponse(response)
        return response
      }
      repoCallbacks.value.gitignoreRead = updateGitignore

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
        } catch (FetchError) {
          handleResponse(false)
          return false
        }
      }
      repoCallbacks.value.updateGitRepoExistence = updateGitRepoExistence

      onMounted(async () => {
        await Promise.all([
          executeGitCommand(['git', 'status','--porcelain=v2','--branch']),
          executeGitCommand(['git', 'status']),
          executeGitCommand(['git','rev-parse','--show-toplevel']),
          updateGitRepoExistence(),
          updateGitignore(),
        ])
      })

      return {
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
