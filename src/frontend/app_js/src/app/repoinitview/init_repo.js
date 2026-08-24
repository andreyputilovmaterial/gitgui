

import './styles.css';


import { ref, reactive, watch, h } from 'vue';


import { createModal } from '../../common_components/modals/modals';
import logError from '../../error_logger/logError';

import WizardConfirmPaths from './wizard_confirm_paths';
import WizardWalkOverGitignore from './wizard_walk_over_gitignore';


const RepoInitViewInitTheRepo = {
  props: [
    'repoStatus',
    'repoCallbacks',
    'config',
  ],
  template: `
  <form  @submit.prevent="handleSubmit" :class="\`mdmreport-controls mdm-git-gui-app-git-repo-init-form \${isBusy ? 'mdmreport-form-busy' : ''}\`">
    <h3>Init as git repo</h3>
    <div class="error form-validation-error">{{ validationaFailureMsg }}</div>
    <fieldset class="mdmreport-controls">
      <button type="submit" class="init-repo-action-call-button submit" value="Init git"><span class="desc-line-1">Init git<br></span><span class="desc-line-2">at specified folders<br></span><span class="desc-line-3">and start to manage backups and track history.<br /><br /></span><span class="desc-line-4">Press here, and we'll guide you through.</span></button>
    </fieldset>
  </form>
`,
setup(props) {

  const isBusy = ref(false)
  const validationaFailureMsg = ref('')
  const formFields = reactive({

  })
  const handleSubmit = async () => {

     try {
       isBusy.value = true;
       validationaFailureMsg.value = '';
       console.log('[DEBUG-initrepo-form-submit]: confirm first...')

       // step 1: let user confirm the paths
       const confirmationResponse = await createModal(h(WizardConfirmPaths,{...props}));
       console.log('[DEBUG-initrepo-form-submit]: Received a response on  confirmation: ',confirmationResponse)

       // step 2: call "git init"
       console.log('[DEBUG-initrepo-form-submit]: initiating "git init" command...');
       const gitInitCommandResult = await props.repoCallbacks.executeGitCommand(['git','init']);

       // step 3: verify it worked
       await props.repoCallbacks.updateGitRepoExistence()
       await props.repoCallbacks.gitignoreRead()
       if(!props.repoStatus.repoExists) {
         const stderr = gitInitCommandResult.payload.stderr;
         const stdout = gitInitCommandResult.payload.stdout;
         if( /^\s*?fatal\s*?:/.test(stderr)) {
           validationaFailureMsg.value = stderr;
         } else {
           throw new Error(`"git init" is executed but the repo is still not inited:\n${stdout}\n${stderr}`);
         }
       }

       // step 4: guide user through gitignore setup
       await createModal(h(WizardWalkOverGitignore,{...props}));

       // done
       console.log('[DEBUG-initrepo-form-submit]: after await')
     } catch (error) {
       if(error instanceof Error) {
         validationaFailureMsg.value = error;
         logError('Init-the-repo Form submission failed');
         logError(error);
         console.error("Init-the-repo Form submission failed:", error);
       } else {
         console.log('[DEBUG-initrepo-form-submit]: cancel')
         /* rejected - means "cancel" - ok */
       }
     } finally {
       isBusy.value = false;
     }
   }

   // To watch a deeply nested property passed via props, you should use a getter function returning the specific field you are interested in, combined with the { deep: true } option if you want to detect changes inside that nested structure.
   watch(() => props.repoStatus.gitignore, () => {
     formFields.gitignore = props.repoStatus.gitignore;
   })

  return { formFields, handleSubmit, isBusy, validationaFailureMsg }
  }
}

export default RepoInitViewInitTheRepo;
