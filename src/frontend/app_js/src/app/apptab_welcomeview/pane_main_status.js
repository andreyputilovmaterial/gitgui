


import { onMounted, computed, ref, h, } from 'vue';

import './style.css';

import WindowListRecordsFromGitStatus from './component_list_records_from_git_status';
import WindowShowMessage from './component_show_message';
import WindowChooseFilesToHaveStaged from './component_select_files_to_stage';
import WindowChooseCommitMessage from './component_choose_commit_message';


const WelcomeDummyStubView = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-welcomeview-dummystub">
  <p>Hey how's it going?</p>
</div>
`,
  setup() {
    return {};
  },
};


const WelcomeUptodateView = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-welcomeview-uptodate">
  <p>No files were changed since they were last saved in the history.</p>
</div>
`,
  setup() {
    return {};
  },
};


const WelcomeUncommittedChangesView = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-welcomeview-uncommittedchanges">
  <div class="error" style="color: #900; font-weight: 500;">{{ error }}</div>
  <p>You have <template v-if="repoStatus.status.length>0">uncommitted changes ({{ repoStatus.status.length }} files)</template><template v-else>no uncommitted changes</template>.</p>
  <p>Before you commit your changes, you need to choose which changes to include. Selected changes are placed in the staging area. You can then commit the staged changes to save them in the history.</p>
  <p>You currently have <a v-if="repoStatus.status.filter(f=>f.index!=='.').length>0" href="#!" @click.prevent="popupListStaged" class="mdm-git-gui-action mdm-link mdm-git-gui-action-popup-list-index">{{ repoStatus.status.filter(f=>f.index!=='.').length }} staged files</a><span v-else>{{ repoStatus.status.filter(f=>f.index!=='.').length }} staged files</span> and <a v-if="repoStatus.status.filter(f=>f.worktree!=='.').length>0" href="#!" @click.prevent="popupListChangedInWorktree" class="mdm-git-gui-action mdm-link mdm-git-gui-action-popup-list-worktree">{{ repoStatus.status.filter(f=>f.worktree!=='.').length }} changed files not added to staging area</a><span v-else>{{ repoStatus.status.filter(f=>f.worktree!=='.').length }} changed files not added to staging area</span>.</p>
  <p v-if="repoStatus.status.filter(f=>f.worktree!=='.').length>0">Stage <a href="#!" @click.prevent="doStageAll" class="mdm-git-gui-action mdm-link-inline-btn mdm-git-gui-action-stage mdm-git-gui-action-state-all">all {{ repoStatus.status.filter(f=>f.worktree!=='.').length }} changed files</a> or stage <a href="#!" @click.prevent="doStageSelected" class="mdm-git-gui-action mdm-link-inline-btn mdm-git-gui-action-stage mdm-git-gui-action-state-selected">selected files</a>.</p>
  <p v-if="repoStatus.status.filter(f=>f.index!=='.').length>0"><a href="#!" @click.prevent="doCommit" class="mdm-git-gui-action mdm-link-inline-btn mdm-git-gui-action-commit">Commit</a> all changes in {{ repoStatus.status.filter(f=>f.index!=='.').length }} files that are now in staging area and create a new snapshot in history.</p>
</div>
`,
  setup(props) {

    const error = ref(null);

    // xy="M.", parsed as "index"="M" (modified), "worktree"="." (up to date) - means that file was changed, since last commit, but changes are staged.
    // xy=".M", parsed as "index"="." and "worktree"="M" - means file is edited in worktree but the changed is not staged
    // to get files in index (staging area), do    props.repoStatus.status.filter(f=>f.index!=='.')
    // to get changed files in worktree, do        props.repoStatus.status.filter(f=>f.worktree!=='.')

    const doStageAll = async () => {
      try {
        error.value = null;
        const jobData = await props.repoActions.executeGitCommand(['git','add','-A']);
        try {
          await props.repoActions.createModal(h(WindowShowMessage,{
            ...props,
            label: 'Command executed.',
            stdout: jobData.stdout,
            stderr: jobData.stderr,
            exit_code: jobData.exit_code,
          }));
        } catch(e) {
          if( e instanceof Error )
            throw e;
          else // just closed window, indicated by rejected promise - not an error
            return false;
        }
        return false;
      } catch(e) {
        props.repoActions.logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        props.repoActions.logError('Stage all: failed retrieving data');
        error.value = e;
        throw e;
      }
    };

     const doStageSelected = async () => {
      try {
        error.value = null;
        try {
          const filesToAdd = await props.repoActions.createModal(h(WindowChooseFilesToHaveStaged,{
              ...props,
              records: props.repoStatus.status.filter(f=>f.worktree!=='.'),
            }));
          const jobData = await props.repoActions.executeGitCommand(['git','add',...filesToAdd]);
          try {
            await props.repoActions.createModal(h(WindowShowMessage,{
              ...props,
              label: 'Command executed.',
              stdout: jobData.stdout,
              stderr: jobData.stderr,
              exit_code: jobData.exit_code,
            }));
          } catch(e) {
            if( e instanceof Error )
              throw e;
            else // just closed window, indicated by rejected promise - not an error
              return false;
          }
          return false;
        } catch(e) {
          if( e instanceof Error )
            throw e;
          else // just closed window, indicated by rejected promise - not an error
            return false;
        }
      } catch(e) {
        props.repoActions.logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        props.repoActions.logError('Stage selected: failed retrieving data');
        error.value = e;
        throw e;
      }
    };

     const doCommit = async () => {
      try {
        error.value = null;
        try {
          const message = await props.repoActions.createModal(h(WindowChooseCommitMessage,{
              ...props,
            }));
          const jobData = await props.repoActions.executeGitCommand(['git','commit','-m',message]);
          try {
            await props.repoActions.createModal(h(WindowShowMessage,{
              ...props,
              label: 'Command executed.',
              stdout: jobData.stdout,
              stderr: jobData.stderr,
              exit_code: jobData.exit_code,
            }));
          } catch(e) {
            if( e instanceof Error )
              throw e;
            else // just closed window, indicated by rejected promise - not an error
              return false;
          }
          return false;
        } catch(e) {
          if( e instanceof Error )
            throw e;
          else // just closed window, indicated by rejected promise - not an error
            return false;
        }
      } catch(e) {
        props.repoActions.logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        props.repoActions.logError('Commit: failed retrieving data');
        error.value = e;
        throw e;
      }
    };

     const popupListChangedInWorktree = async () => {
      try {
        error.value = null;
        // xy="M.", parsed as "index"="M" (modified), "worktree"="." (up to date) - means that file was changed, since last commit, but changes are staged.
        // xy=".M", parsed as "index"="." and "worktree"="M" - means file is edited in worktree but the changed is not staged
        // to get files in index (staging area), do    props.repoStatus.status.filter(f=>f.index!=='.')
        // to get changed files in worktree, do        props.repoStatus.status.filter(f=>f.worktree!=='.')
        try {
          await props.repoActions.createModal(h(WindowListRecordsFromGitStatus,{
            ...props,
            label: 'Files with changes not added to staging area',
            records: props.repoStatus.status.filter(f=>f.worktree!=='.'),
            diffLeft: 'HEAD',
            diffRight: 'worktree',
          }));
        } catch(e) {
          if( e instanceof Error )
            throw e;
          else // just closed window, indicated by rejected promise - not an error
            return false;
        }
        return false;
      } catch(e) {
        props.repoActions.logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        props.repoActions.logError('List changed in worktree: failed retrieving data');
        error.value = e;
        throw e;
      }
    };

     const popupListStaged = async () => {
      try {
        error.value = null;
        // xy="M.", parsed as "index"="M" (modified), "worktree"="." (up to date) - means that file was changed, since last commit, but changes are staged.
        // xy=".M", parsed as "index"="." and "worktree"="M" - means file is edited in worktree but the changed is not staged
        // to get files in index (staging area), do    props.repoStatus.status.filter(f=>f.index!=='.')
        // to get changed files in worktree, do        props.repoStatus.status.filter(f=>f.worktree!=='.')
        try {
          await props.repoActions.createModal(h(WindowListRecordsFromGitStatus,{
            ...props,
            label: 'Files in staging area. You can then commit the staged changes and have them saved in the history.',
            records: props.repoStatus.status.filter(f=>f.index!=='.'),
            diffLeft: 'HEAD',
            diffRight: 'index',
          }));
        } catch(e) {
          if( e instanceof Error )
            throw e;
          else // just closed window, indicated by rejected promise - not an error
            return false;
        }
        return false;
      } catch(e) {
        props.repoActions.logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        props.repoActions.logError('List staged: failed retrieving data');
        error.value = e;
        throw e;
      }
    };

    return {
      error,
      doStageAll,
      doStageSelected,
      doCommit,
      popupListChangedInWorktree,
      popupListStaged,
    };
  },
};


const WelcomeView = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<view-welcome-uptodate v-if="repoState==='uptodate'" :repoStatus="repoStatus" :repoActions="repoActions" />
<view-welcome-uncommittedchanges v-else-if="repoState==='uncommittedchanges'" :repoStatus="repoStatus" :repoActions="repoActions" />
<view-welcome-dummystub v-else :repoStatus="repoStatus" :repoActions="repoActions" />
`,
  components: {
    'view-welcome-dummystub': WelcomeDummyStubView,
    'view-welcome-uptodate': WelcomeUptodateView,
    'view-welcome-uncommittedchanges': WelcomeUncommittedChangesView,
  },
  setup(props) {

    const detectCurrentRepoState = () => {
      const gitStatusRecords = props.repoStatus.status;
      if( Array.isArray(gitStatusRecords) ) {
        if( gitStatusRecords.length>0 )
          return 'uncommittedchanges';
        else
          return 'uptodate';
      }
      return undefined;
    };

    const repoState = computed( detectCurrentRepoState );

    onMounted(async () => {
      await Promise.all([
        // updateSomething(),
      ])
    });

    return {
      repoState,
    };
  },
};

export default WelcomeView;
