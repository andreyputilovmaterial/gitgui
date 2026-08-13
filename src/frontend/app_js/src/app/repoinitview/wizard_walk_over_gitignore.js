


import { ref, reactive, onMounted } from 'vue';


import RepoInitViewGitignoreSection from './section_gitignore';
// import { createModal } from '../../common_components/modals';

import './wizard_styles.css';

import logError from '../../error_logger/logError';


// import ComponentSectionRollUp from '../../common_components/rollable_sections';





const WizardWalkOverGitignore = {
  props: [
    'resolve',
    'reject',
    'repoStatus',
    'repoCallbacks',
    'config',
  ],
  template: `
<div class="git-repo-modal-form-confirm-inner">
  <form  @submit.prevent="handleSubmit" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
    <section "class="gitignore">
      <component-section-rollup header="gitignore" :condensed="false">
        <p>Here you confirm the work-tree path.</p>
      </component-section-rollup>
    </section>
    <section class="step-final">
      <div class="error">{{ validationMessage }}</div>
      <fieldset class="mdmreport-controls">
        <div :class="{
        'mdmreport-controls-group':true,
        'click-finish':true,
        'all-steps-confirmed': true
        }">
          <button type="submit" class="submit">All is set!</button>
        </div>
      </fieldset>
    </section>
  </form>
</div>
`,
  components: {
    'gitignore-textarea': RepoInitViewGitignoreSection,
  },
  setup(props) {
    // const { ref, reactive } = Vue

    const isBusy = ref(false)
    const formFields = reactive({
    });
    const formContext = ref({
    });
    const validationMessage = ref('');

    const handleSubmit = async () => {

       try {
         isBusy.value = true;
         validationMessage.value = '';
         props.resolve('git init'); // message does not matter
       } catch (err) {
         logError(err);
         logError('Failed submitting git init form');
         console.error('Failed submitting git init form',err)
         // Promise.resolve().then(()=>{throw err;});
         return props.reject(err)
       } finally {
         isBusy.value = false
       }
    }

    onMounted(async () => {
      await Promise.all([
        // checkPaths(),
      ])
    });

    return {
      formFields,
      formContext,
      handleSubmit,
      isBusy,
      validationMessage,
    }
  }
}


export default WizardWalkOverGitignore
