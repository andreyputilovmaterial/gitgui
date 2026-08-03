// import { Vue } from "./vue.js";
document.addEventListener("DOMContentLoaded", () => {

  const { createApp, ref, onMounted, onUnmounted } = Vue

  const globalRepoSetup = {}




  function formatDate(val) {
    console.log('[FORMAT-DATE]: received:',val)
    const fmt = dt => {
      const formatter = new Intl.DateTimeFormat(undefined, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",      // omit if not wanted
          timeZoneName: "short",
      });
      const result = formatter.format(dt)
      return result
    }
    // const content = el.innerText||el.textContent;
    const content = `${val}`
    const dt = /[1-9]/.test(content) ? new Date(content) : undefined;
    // const result = dt ? `original: ${content}, converted: ${dt}` : content; // for debugging
    const result = dt ? `${fmt(dt)}` : content;
    console.log('[FORMAT-DATE]: converted:',result)
    return result
  }



  const delay = function(ms) {
    return new Promise((resolve,reject)=> {setTimeout(resolve,ms)})
  }



  function parseCommand(txt) {
    function tokenize(text) {
      const tokens = [];
      let current = "";
      let inQuote = false;
      let i = 0;

      while (i < text.length) {
        const char = text[i];

        // 1. Handle Escape Character
        if (char === '\\') {
          current += text[i + 1] || ""; // Grab next char if it exists
          i += 2;                       // Skip both the backslash and the next char
          continue;
        }

        // 2. Handle Quotes
        if (char === '"' || char === "'") {
          if (inQuote && char === inQuote) {
            inQuote = false; // Closed matching quote
          } else if (!inQuote) {
            inQuote = char;  // Opened quote, remember which one (' or ")
          }
          current += char;
          i++;
          continue;
        }

        // 3. Handle Spaces Outside Quotes
        if (!inQuote && char === ' ') {
          if (current) {
            tokens.push({ type: 'real', value: current });
            current = "";
          }
          tokens.push({ type: 'space', value: ' ' });
          i++;
          continue;
        }

        // 4. Handle Normal Characters
        current += char;
        i++;
      }

      // Push any remaining text left at the end
      if (current) {
        tokens.push({ type: inQuote ? 'error' : 'real', value: current });
      }

      return tokens;
    }
    return tokenize(txt).filter(a=>a.type=='real').map(a=>a.value)
  }



  function cliCommandRaw(command) {
    function preparePayload(command) {
      console.log('[DEBUG]: preparing payload')
      return command
    }
    async function sendCommand() {
      console.log('[DEBUG]: initiating a new request',command)
      const payload = preparePayload(command)
      const response = await fetch(
        `/command`,
          {method: 'POST',
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
        },
      )
      if (!response.ok) {
        let error = `HTTP ${response.status}`
        try {
          const err = await response.json();
          error = err.error
        } catch(e) {
          error = `HTTP ${response.status}`
        }
        throw new Error(error)
      }
      const data = await response.json()
      const jobId = data.jobId
      return jobId
    }
    const context = {
      promiseResolve: ()=>{throw new Error('promise not inited')},
      promiseReject: ()=>{throw new Error('promise not inited')},
      jobId: null,
      status: 'prepare',
      pollTimerId: null,
    }
    async function pendStatus() {
      console.log('[DEBUG]: pending request status, jobId now is ',context.jobId)
      try{
        const response = await fetch(
          `/command/${context.jobId}`,
          {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            },
          },
        )
        if (!response.ok) {
          let error = `HTTP ${response.status}`
          try {
            const err = await response.json();
            error = err.error
          } catch(e) {
            error = `HTTP ${response.status}`
          }
          throw new Error(error)
        }
        const data = await response.json()
        context.status = data.status
        if( data.status=='done' )
          return context.promiseResolve(data)
      } catch(e) {
        console.log('[DEBUG]: fail while pending!: ',e)
        return context.promiseReject(e)
      }
    }
    console.log('[DEBUG]',context)
    const promise = new Promise((resolve,reject)=> {
      context.promiseResolve = resolve
      context.promiseReject = reject
      const sendCommandPromise = sendCommand(command)
      sendCommandPromise.then(
        result => {
          context.status = 'in-progress'
          context.jobId = result.job_id
          console.log('[DEBUG]',context)
          console.log('[DEBUG]: setting jobId to',context.jobId)
        },
        err => {reject(err)}
      )
      sendCommandPromise.then(
        (jobId) => {
          context.pollTimerId = setInterval(pendStatus,207)
        }
      )
      context.status = 'initiated'
      console.log('[DEBUG]',context)
    })
    promise.then(
      result => {clearInterval(context.pollTimerId)},
      err => {clearInterval(context.pollTimerId)}
    )
    promise.then(
      result => {console.log('[DEBUG]: initiating a new command: success')},
      err => {console.log('[DEBUG]: initiating a new command: fail'+err)}
    )
    return promise
  }





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

  const RepoInitView = {
    props: {
      repoInitRequiresAttention: [String,Boolean],
      repoStatus: Object,
    },
    template: `
      <component-section-rollup header="Repo Init View" :condensed="!repoInitRequiresAttention">
      Hey, you project is...
      </component-section-rollup>
    `,
    setup() {
      return {  }
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
      'cliCommand',
    ],
    template: `
      <form  @submit.prevent="handleSubmit" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
        <fieldset class="mdmreport-controls">
          <div class="mdmreport-controls-group">
            <label style="display: none;">COMMAND:  </label>
            <input type="text" name="command" value="" placeholder="COMMAND: " v-model="formFields.command"></input>
            <input type="button" value="Execute"></input>
          </div>
        </fieldset>
      </form>
    `,
    setup(props) {
      const { ref, reactive } = Vue

      const isBusy = ref(false)

      const formFields = reactive({
        command: '',
      })
       const handleSubmit = async () => {

         try {
           isBusy.value = true
           const result = await props.cliCommand(parseCommand(formFields.command))

         } catch (error) {
           console.error("Form submission failed:", error)
         } finally {
           isBusy.value = false
           formFields.command = ''
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
      'source',
      'type',
    ],
    template: `
      <div :class="\`terminal-record terminal-record-status-\${type}\`">
        <span class="timestamp">{{ formatDate(timestamp) }}</span>
        <span class="status">{{ type }}</span>
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
      'cliCommand',
    ],
    template: `
      <component-section-rollup header="Commands View" :condensed="false">
      <div class="mdm-git-gui-terminal">
      <terminal-submit-form :cliCommand="cliCommand"></terminal-submit-form>
      <terminal-record
        v-for="cmd in commands"
        :timestamp="cmd.timestamp"
        :payload="cmd.payload"
        :message_stdout="cmd.message_stdout"
        :message_stderr="cmd.message_stderr"
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
<repoinit-view :repoInitRequiresAttention="repoInitRequiresAttention" :repoStatus="repoStatus"></repoinit-view>
<maingui-view></maingui-view>
<terminalsession-view :commands="commands" :cliCommand="cliCommand"></terminalsession-view>
`,
    components: {
      'component-section-rollup': ComponentSectionRollUp,
      'repoinit-view': RepoInitView,
      'maingui-view': MainView,
      'terminalsession-view': TerminalSessionView,
    },
    setup() {

      const repoStatus = ref({})
      const repoInitRequiresAttention = ref(false)
      // const commands = ref([{timestamp:new Date(),payload:'test-first-record',message_stdout:'test-first-record','message_stderr':'','source':null,'type':'test'}])
      const commands = ref([])

      function cliCommand(args) {
        args = args || []
        args = [...args]
        const promise = cliCommandRaw(args)
        const command_str = args.join(' ')
        const command = {
          timestamp: new Date(),
          message_stdout: command_str,
          message_stderr: '',
          payload: {'message':command_str},
          source: undefined,
          'type': 'request',
        }
        const source_command = command
        commands.value = [...commands.value,command]
        promise.then(
          response => {
            const command = {
              timestamp: new Date(),
              message_stdout: (((response||{}).payload||{}).stdout||''),
              message_stderr: (((response||{}).payload||{}).stderr||''),
              payload: response,
              source: source_command,
              'type': 'response',
            }
            commands.value = [...commands.value,command]
          },
          err => {
            const command = {
              timestamp: new Date(),
              payload: err,
              message_stdout: '',
              message_stderr: err,
              source: source_command,
              'type': 'error',
            }
            commands.value = [...commands.value,command]
          }
        )
      }

      onMounted(async () => {
        const results = cliCommand(['git','status'])
      })

      return {
        repoStatus,
        repoInitRequiresAttention,
        commands,
        cliCommand,
      }

    }
  })
  // FORCE VUE DEVTOOLS TO ACTIVATE
  app.config.performance = true;
  app.component('component-section-rollup', ComponentSectionRollUp)
  app.mount('#gitui_app')





});
