

import { ref, computed, onMounted } from 'vue';

import './component_statistics_pane_styles.css';
import { fetchWrapper } from '../../../common_defs/networking';
import logError from '../../../error_logger/logError';



const StatisticsPane = {
  props: [
    'packObjects',
    'repoStatus',
    'repoCallbacks',
  ],
  template: `
<div class="mdm-git-gui-verifypack-statistics mdmreport-banner">
  <div class="footnote">Statistics:</div>
  <div class="error">{{ error }}</div>
  <div class="inner mdm-ui-records">
    <div class="overall-gitrepo-folder-size mdm-ui-record"><span class="label">Overall folder size of git folder: </span><span class="value"><component-format-filesize :size="gitGitrepoFolderSize" /></span></div>
    <div class="overall-worktree-folder-size mdm-ui-record"><span class="label">Overall folder size of work tree folder: </span><span class="value"><component-format-filesize :size="gitWorktreeFolderSize" /></span></div>
    <div class="overall-git-objects-folder-size mdm-ui-record"><span class="label">Overall folder size of git pack objects: </span><span class="value"><component-format-filesize :size="gitPacksFolderSize" /></span></div>
    <div class="computed-compressed mdm-ui-record"><span class="label">Computed cumulative "source" size of objects listed here: </span><span class="value"><component-format-filesize :size="cumulativeComputedSource" /></span></div>
    <div class="computed-source mdm-ui-record"><span class="label">Computed cumulative "compressed" size of objects listed here: </span><span class="value"><component-format-filesize :size="cumulativeComputedCompressed" /></span></div>
  </div>
</div>
`,
  setup(props) {

    const gitPacksFolderSize = ref('Fetching data, please wait...');
    const gitGitrepoFolderSize = ref('Fetching data, please wait...');
    const gitWorktreeFolderSize = ref('Fetching data, please wait...');
    const error = ref('');

    const cumulativeComputedSource = computed(() => {
      // this is actually a repetition, I am now doing the same in index.js, and could have had it passed, but doing such simple math again should not be a problem
      try {
        if( !props.packObjects ) return NaN;
        return props.packObjects.reduce((acc,e)=>acc+Number(e.sizeSource),0);
      } catch(e) {
        logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        logError('Git Pack View: Failed retrieving data');
        error.value = e;
        throw e;
      }
    });

    const cumulativeComputedCompressed = computed(() => {
      // this is actually a repetition, I am now doing the same in index.js, and could have had it passed, but doing such simple math again should not be a problem
      try {
        if( !props.packObjects ) return NaN;
        return props.packObjects.reduce((acc,e)=>acc+Number(e.sizeCompressed),0);
      } catch(e) {
        logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        logError('Git Pack View: Failed retrieving data');
        error.value = e;
        throw e;
      }
    });

    const fetchGitPacksFolderSize = async () => {
      try {
        const size = await fetchWrapper( 'GET','/functionality/dir-sizeof/git_pack_objects',undefined );
        gitPacksFolderSize.value = size;
      } catch(e) {
        logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        logError('Git Pack View: Failed retrieving data');
        error.value = e;
        throw e;
      }
    };
    const fetchGitRepoFolderSize = async () => {
      try {
        const size = await fetchWrapper( 'GET','/functionality/dir-sizeof/git_repo',undefined );
        gitGitrepoFolderSize.value = size;
      } catch(e) {
        logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        logError('Git Pack View: Failed retrieving data');
        error.value = e;
        throw e;
      }
    };
    const fetchWorktreeFolderSize = async () => {
      try {
        const size = await fetchWrapper( 'GET','/functionality/dir-sizeof/worktree',undefined );
        gitWorktreeFolderSize.value = size;
      } catch(e) {
        logError(e); // that would be called as a repetition - already logged from called funtion - but anyway it's better to have RED ERRORS printed with duplicates rather than missing a failed activity and have errors silent
        logError('Git Pack View: Failed retrieving data');
        error.value = e;
        throw e;
      }
    };

    onMounted(async () => {
      await Promise.all([
        fetchGitPacksFolderSize(),
        fetchGitRepoFolderSize(),
        fetchWorktreeFolderSize(),
      ])
    });

    return { error, gitPacksFolderSize, gitGitrepoFolderSize, gitWorktreeFolderSize, cumulativeComputedSource, cumulativeComputedCompressed };

  },
};

export default StatisticsPane;
