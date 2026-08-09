

import { createModal } from '../common_components/modals';
import logError from '../error_logger/logError';



const RepoInitGitInitConfirm = {
  props: [
    'resolve',
    'reject',
  ],
  template: `
<div class="git-repo-modal-form-confirm-inner">
  <form  @submit.prevent="handleSubmit" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
    <span class="wanted-to-ask" style="font-size: 42px;">Hey, are you sure?</span>
    <fieldset class="mdmreport-controls">
      <div class="mdmreport-controls-group">
        <input type="button" @click="reject" value="No, get me back!"></input>
        <input type="submit" value="Yes, sure!"></input>
      </div>
    </fieldset>
  </form>
</div>
`,
  setup(props) {
    const { ref, reactive } = Vue
    const isBusy = ref(false)
    const formFields = reactive({
    })
    const handleSubmit = async () => {

       try {
         isBusy.value = true
         return props.resolve('Yes!')
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
    return { formFields, handleSubmit, isBusy }
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
        <textarea name="gitignore" placeholder="" v-model="formFields.gitignore" readonly disabled></textarea>
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
       console.log('[DEBUG-initrepo-form-submit]: confirm first...')
       const confirmationResponse = await createModal(RepoInitGitInitConfirm)
       console.log('[DEBUG-initrepo-form-submit]: Received a response on  confirmation: ',confirmationResponse)
       console.log('[DEBUG-initrepo-form-submit]: initiating "git init" command...')
       await props.repoCallbacks.executeGitCommand(['git','init'])
       await props.repoCallbacks.updateGitRepoExistence(),
       await props.repoCallbacks.gitignoreRead(),
       console.log('[DEBUG-initrepo-form-submit]: after await')
     } catch (error) {
       if(error instanceof Error) {
         logError('Init-the-repo Form submission failed');
         logError(error);
         console.error("Init-the-repo Form submission failed:", error)
       } else {
         console.log('[DEBUG-initrepo-form-submit]: cancel')
         /* rejected - means "cancel" - ok */
       }
     } finally {
       isBusy.value = false
     }
   }

  return { formFields, handleSubmit, isBusy }
  }
}

export  const RepoInitView = {
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
