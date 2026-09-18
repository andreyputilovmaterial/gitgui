


import { ref, reactive, onMounted } from 'vue';


import PathStatus, { FSPathStatus } from './components/path_indicator';

import './wizard_styles.css';





const ModalConfirmContinueIfPathsNotVerified = {
  props: [
    'resolve','reject',
    'repoActions', 'repoStatus',
  ],
  template: `
<form  @submit.prevent="handleSubmit" class="gitgui-modal-form git-repo-modal-form-confirm-continue-when-paths-not-good">
  <p>Are you sure?</p>
  <p>It looks the paths do not exist or not accesible, but we can still try to continue with git init. Should we?</p>
  <div>
    <button type="submit" class="gitgui-button-close">Yes, continue</Button>
    <button type="button" class="gitgui-button-close" @click.prevent="reject">No, get me back</Button>
  </div>
</form>
`,
  setup(props) {

    const handleSubmit = async () => {
      try {
        return props.resolve('close')
      } catch (err) {
        props.repoActions.logError(err);
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
    'repoActions',
    'config',
  ],
  template: `
<div class="mdm-git-gui-repoinit-wizard-confirm-paths-inner">
  <form  @submit.prevent="handleSubmit" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
    <section :class="{'step-1-confirm-dir-working-tree':true,'step-confirmed':formFields.step1Acknowledged}">
      <component-section-rollup header="Step 1: confirm working-tree path" :condensed="!!formFields.step1Acknowledged">
        <p>Here you confirm the working tree path.</p>
        <p>This is <span style="text-decoration: underline;">the tracked folder</span>: with files, scripts, data, etc...</p>
        <div class="config-working-tree-path"><code>{{ config.working_tree }}</code></div>
        <path-status :status="formContext.pathWorkingTreeExists" />
        <div class="hidden">
          <input type="checkbox" v-model="formFields.step1Acknowledged" />
        </div>
        <p style="color: #888;">If this is not the path you wanted, re-launch the python script with updated params in .BAT/.sh file.</p>
        <div class="click-next">
          <button type="button" :class="{'click-me-next':!formFields.step1Acknowledged}" @click="formFields.step1Acknowledged = true">Next</button>
        </div>
      </component-section-rollup>
    </section>
    <section :class="{'step-2-confirm-dir-git-dir':true,'step-confirmed':formFields.step2Acknowledged}">
      <component-section-rollup header="Step 2: confirm git directory" :condensed="!formFields.step1Acknowledged || !!formFields.step2Acknowledged">
        <p>Here you confirm the git directory, where history is stored.</p>
        <div class="config-git-dir-path"><code>{{ config.git_directory }}</code></div>
        <path-status :status="formContext.pathGitDirectoryExists" />
        <div class="hidden">
          <input type="checkbox" v-model="formFields.step2Acknowledged" />
        </div>
        <p style="color: #888;">If this is not the path you wanted, re-launch the python script with updated params in .BAT/.sh file.</p>
        <div class="click-next">
          <button type="button" :class="{'click-me-next':!(!formFields.step1Acknowledged || !!formFields.step2Acknowledged)}" @click="formFields.step2Acknowledged = true">Next</button>
        </div>
      </component-section-rollup>
    </section>
    <section class="step-final">
      <div class="error">{{ validationMessage }}</div>
      <fieldset class="mdmreport-controls">
        <div :class="{
        'click-finish':true,
        'all-steps-confirmed': formFields.step1Acknowledged && formFields.step2Acknowledged
        }">
          <button type="submit" :class="{'submit':true,'click-me-next':formFields.step1Acknowledged && formFields.step2Acknowledged}">Init git with these params now</button>
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
      pathWorkingTreeExists: FSPathStatus.UNDEFINED,
      pathGitDirectoryExists: FSPathStatus.UNDEFINED,
    });
    const validationMessage = ref('');

    const checkPaths = () => {
      const parseResponseStatus = response => {
        if(response.ok)
          return FSPathStatus.OK;
        else if(response.status===404)
          return FSPathStatus.NOTFOUND;
        else if(response.status===403)
          return FSPathStatus.ACCESSISSUES;
        else
          return FSPathStatus.REQUESTERROR;
      }
      const fetchResultWorkTree = fetch(
        '/functionality/existence-working-tree',
        {
          method: 'HEAD',
          headers: { "Content-Type": "application/json" },
        },
      );
      const fetchResultGitRepoDir = fetch(
        '/functionality/existence-git-directory',
        {
          method: 'HEAD',
          headers: { "Content-Type": "application/json" },
        },
      );
      fetchResultWorkTree.then(
        result => {
          formContext.value.pathWorkingTreeExists = parseResponseStatus(result);
        },
        props.repoActions.logError,
      );
      fetchResultGitRepoDir.then(
        result => {
          formContext.value.pathGitDirectoryExists = parseResponseStatus(result);
        },
        props.repoActions.logError,
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
         if( (formContext.value.pathWorkingTreeExists!=FSPathStatus.OK) || (formContext.value.pathGitDirectoryExists!=FSPathStatus.OK) ) {
           if( (formContext.value.pathWorkingTreeExists!=FSPathStatus.OK) && (formContext.value.pathGitDirectoryExists!=FSPathStatus.OK) )
             validationMessage.value = 'Neither Working tree location nor git directory location do not exist or are not accessible: please check and/or create the folders';
           else if( formContext.value.pathWorkingTreeExists!=FSPathStatus.OK )
             validationMessage.value = 'Working tree does not exist or is not accessible: please check and/or create the folder';
           else if( formContext.value.pathGitDirectoryExists!=FSPathStatus.OK )
             validationMessage.value = 'Git directory location does not exist or is not accessible: please check and/or create the folder';
           try {
             await props.repoActions.createModal(ModalConfirmContinueIfPathsNotVerified);
           } catch(e) {
             if(e instanceof Error)
               props.repoActions.logError(e);
             isBusy.value = false;
             return;
           }
         }
         props.resolve('git init'); // message does not matter
       } catch (err) {
         props.repoActions.logError(err);
         props.repoActions.logError('Failed submitting git init form');
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
