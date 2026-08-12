
import { ref, reactive, watch } from 'vue';

import HelpWindow from './section_gitignore_help_window.js';

import './section_gitignore.css';

import { createModal } from '../../common_components/modals';

import logError from '../../error_logger/logError';



const RepoInitViewGitignoreSection = {
  props: [
    'repoInitRequiresAttention',
    'repoStatus',
    'repoCallbacks',
    'mode', // edit, view, init
  ],
  template: `
<div class="gitui-app-gitignore-outer">
  <form  @submit.prevent="handleSubmit" :class="\`mdmreport-controls git-repo-gitignore-edit-form \${isBusy ? 'mdmreport-form-busy' : ''}\`">
    <h3>gitignore Setup</h3>
    <fieldset class="mdmreport-controls">
      <div class="mdmreport-controls-group">
        <label>gitignore file: <span class="help"><a href="#!" @click.prevent="showHelp">Show help</a></span></label>
        <textarea name="gitignore" placeholder="" v-model="formFields.gitignore" readonly disabled></textarea>
      </div>
    </fieldset>
  </form>
</div>
`,
setup(props) {
  // const { ref, reactive, watch } = Vue

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
   };

   const showHelp = async () => {
     try {
       await createModal(HelpWindow);
     } catch(e) {
       if(e instanceof Error) {
         logError(e);
       }
     }
   };

   // To watch a deeply nested property passed via props, you should use a getter function returning the specific field you are interested in, combined with the { deep: true } option if you want to detect changes inside that nested structure.
   watch(() => props.repoStatus.gitignore, () => {
     formFields.gitignore = props.repoStatus.gitignore
   })

  return { formFields, handleSubmit, isBusy, showHelp }
  }
}


export default RepoInitViewGitignoreSection
