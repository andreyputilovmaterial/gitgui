

import { ref, reactive } from 'vue';


import { parseCommand, grabAdditionsFromCommandString } from './common_functions';
import Lock from '../../common_defs/concurrency/lock.js';

import './styles.css';



const TerminalSubmitForm = {
  props: [
    'repoActions',
  ],
  template: `
    <form  @submit.prevent="handleSubmit" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
      <fieldset class="mdmreport-controls">
        <div class="error">{{ formFields.validationError }}</div>
        <div class="mdmreport-controls-group mdmreport-controls-group-nonegmargin">
          <label style="display: none;">COMMAND:  </label>
          <input type="text" name="command" value="" placeholder="git command: " class="mdmreport-control" v-model="formFields.command"></input>
          <input type="submit" value="Execute" class="submit"></input>
          <p class="hint"><small>Note: every command gets --git-dir path... --work-tree path... --no-pager params appended</small></p>
        </div>
      </fieldset>
    </form>
  `,
  setup(props) {
    // const { ref, reactive } = Vue


    const isBusy = ref(false);
    const lock = new Lock();

    const formFields = reactive({
      command: '',
      validationError: '',
    })
     const handleSubmit = async () => {

       const releaseLock = await lock.acquire();
       try {
         isBusy.value = true
         const commandAccepted = formFields.command;
         const command = parseCommand(commandAccepted);
         await props.repoActions.executeGitCommand(command);
         const commandNewState = formFields.command;
         formFields.command = grabAdditionsFromCommandString(commandAccepted,commandNewState,props.repoActions.diff(commandAccepted,commandNewState)); // whatever user typed while validation was processing
         formFields.validationError = '';

       } catch (error) {
         console.error("Form submission failed:", error)
         formFields.validationError = error

       } finally {
         releaseLock();
         isBusy.value = false;
        //  formFields.command = ''
       }
     }

    return { formFields, handleSubmit, isBusy }
  }
}

export default TerminalSubmitForm;
