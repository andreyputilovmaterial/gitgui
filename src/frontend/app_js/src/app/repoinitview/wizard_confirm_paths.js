


import { ref, reactive, onMounted } from 'vue';


import PathStatus, { FSPathStatus } from './components/path_indicator';
import { createModal } from '../../common_components/modals';

import './wizard_styles.css';

import logError from '../../error_logger/logError';


// import ComponentSectionRollUp from '../../common_components/rollable_sections';





const ModalConfirmContinueIfPathsNotVerified = {
  props: ['resolve','reject'],
  template: `
<form  @submit.prevent="handleSubmit" class="gitgui-modal-form git-repo-modal-form-confirm-continue-when-paths-not-good">
  <p>Are you sure?</p>
  <p>It looks the paths do not exist or not accesible, but we can still try to continue with git init. Should we?</p>
  <div>
    <button type="submit" class="gitgui-button-modal-close">Yes, continue</Button>
    <button type="botton" class="gitgui-button-modal-close" @click.prevent="reject">No, get me back</Button>
  </div>
</form>
`,
  setup(props) {

    const handleSubmit = async () => {
      try {
        return props.resolve('close')
      } catch (err) {
        logError(err);
      }
    }

    return { handleSubmit };
  },
}


const WizardConfirmPaths = {
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
    <section :class="{'step-1-confirm-dir-work-tree':true,'step-confirmed':formFields.step1Acknowledged}">
      <component-section-rollup header="Step 1: confirm work-tree path" :condensed="!!formFields.step1Acknowledged">
        <p>Here you confirm the work-tree path.</p>
        <p>This is <span style="text-decoration: underline;">the tracked folder</span>: with files, scripts, data, etc...</p>
        <div class="config-work-tree-path"><code>{{ config.dir_work_tree }}</code></div>
        <path-status :status="formContext.dir_work_treeExists" />
        <div class="hidden">
          <input type="checkbox" v-model="formFields.step1Acknowledged" />
        </div>
        <p style="color: #888;">If this is not the path you wanted, re-launch the python script with updated params in BAT file.</p>
        <div class="click-next">
          <button type="button" @click="formFields.step1Acknowledged = true">Next</button>
        </div>
      </component-section-rollup>
    </section>
    <section :class="{'step-2-confirm-dir-git-dir':true,'step-confirmed':formFields.step2Acknowledged}">
      <component-section-rollup header="Step 2: confirm git directory" :condensed="!formFields.step1Acknowledged || !!formFields.step2Acknowledged">
        <p>Here you confirm the directory where git stores history.</p>
        <div class="config-git-dir-path"><code>{{ config.dir_git_repo }}</code></div>
        <path-status :status="formContext.dir_git_repoExists" />
        <div class="hidden">
          <input type="checkbox" v-model="formFields.step2Acknowledged" />
        </div>
        <p style="color: #888;">If this is not the path you wanted, re-launch the python script with updated params in BAT file.</p>
        <div class="click-next">
          <button type="button" @click="formFields.step2Acknowledged = true">Next</button>
        </div>
      </component-section-rollup>
    </section>
    <section class="step-final">
      <div class="error">{{ validationMessage }}</div>
      <fieldset class="mdmreport-controls">
        <div :class="{
        'mdmreport-controls-group':true,
        'click-finish':true,
        'all-steps-confirmed': formFields.step1Acknowledged && formFields.step2Acknowledged
        }">
          <button type="submit" class="submit">Init git with these params now</button>
          <button type="button" class="cancel" @click="reject">Cancel</button>
        </div>
      </fieldset>
    </section>
  </form>
</div>
`,
  components: {
    'path-status': PathStatus,
  },
  setup(props) {
    // const { ref, reactive } = Vue

    const isBusy = ref(false);
    const formFields = reactive({
      step1Acknowledged: false,
      step2Acknowledged: false,
    });
    const formContext = ref({
      dir_work_treeExists: FSPathStatus.UNDEFINED,
      dir_git_repoExists: FSPathStatus.UNDEFINED,
    });
    const validationMessage = ref('');

    const checkPaths = () => {
      const parseResponseStatus = response => {
        if(response.ok)
          return FSPathStatus.OK;
        else if(response.status==404)
          return FSPathStatus.NOTFOUND;
        else if(response.status==403)
          return FSPathStatus.ACCESSISSUES;
        else
          return FSPathStatus.REQUESTERROR;
      }
      const fetchResultWorkTree = fetch(
        '/functionality/dir-work-tree',
        {
          method: 'HEAD',
          headers: { "Content-Type": "application/json" },
        },
      )
      const fetchResultGitRepoDir = fetch(
        '/functionality/dir-git-repo-dir',
        {
          method: 'HEAD',
          headers: { "Content-Type": "application/json" },
        },
      )
      fetchResultWorkTree.then(
        result => {
          formContext.value.dir_work_treeExists = parseResponseStatus(result);
        },
        logError,
      );
      fetchResultGitRepoDir.then(
        result => {
          formContext.value.dir_git_repoExists = parseResponseStatus(result);
        },
        logError,
      );
      return Promise.all([fetchResultWorkTree,fetchResultGitRepoDir]);
    };

    const handleSubmit = async () => {

       try {
         isBusy.value = true;
         validationMessage.value = '';
         if( !( formFields.step1Acknowledged && formFields.step2Acknowledged ) ) {
           validationMessage.value = 'Please click all "Next" buttons above to confirm paths are acknowledged.';
           isBusy.value = false;
           return;
         }
         if( (formContext.value.dir_work_treeExists!=FSPathStatus.OK) || (formContext.value.dir_git_repoExists!=FSPathStatus.OK) ) {
           if( (formContext.value.dir_work_treeExists!=FSPathStatus.OK) && (formContext.value.dir_git_repoExists!=FSPathStatus.OK) )
             validationMessage.value = 'Neither Work tree folder not git repo folder do not exist or are not accessible: please check and/or create the folders';
           else if( formContext.value.dir_work_treeExists!=FSPathStatus.OK )
             validationMessage.value = 'Work tree folder does not exist or is not accessible: please check and/or create the folder';
           else if( formContext.value.dir_git_repoExists!=FSPathStatus.OK )
             validationMessage.value = 'Git repo folder does not exist or is not accessible: please check and/or create the folder';
           try {
             await createModal(ModalConfirmContinueIfPathsNotVerified);
           } catch(e) {
             if(e instanceof Error)
               logError(e);
             isBusy.value = false;
             return;
           }
         }
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
        checkPaths(),
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


export default WizardConfirmPaths
