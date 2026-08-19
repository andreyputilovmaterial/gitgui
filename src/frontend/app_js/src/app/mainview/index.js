

import './styles.css';

import PageWelcome from '../mainview_welcome/index';
import PageFiles from '../filesview/index';
import PageHistory from '../historyview/index';
import PageGitignore from '../repoinitview/section_gitignore';
import PagePackcompression from '../packcompression/index';

const MainView = {
  props: [
    'repoStatus', 'repoCallbacks',
  ],
  // <component-section-rollup header="Main Status View" :condensed="!repoStatus?.repoExists">
  template: `
  <div class="mdm-git-gui-mainview">
    <template v-if="!repoStatus?.repoExists">
      Repo is not inited. Nothing to display.
    </template>
    <template v-else>
      <component-tabbed-panes active="home">
        <component-tabbed-pane id="home" title="Overview">
          <page-welcome :repoStatus="repoStatus" :repoCallbacks="repoCallbacks" />
        </component-tabbed-pane>
        <component-tabbed-pane id="files" title="Files">
          <page-files :repoStatus="repoStatus" :repoCallbacks="repoCallbacks" />
        </component-tabbed-pane>
        <component-tabbed-pane id="history" title="History">
          <page-history :repoStatus="repoStatus" :repoCallbacks="repoCallbacks" />
        </component-tabbed-pane>
        <component-tabbed-pane id="gitignore" title="gitignore (tracked files)">
          <page-gitignore :repoStatus="repoStatus" :repoCallbacks="repoCallbacks" />
        </component-tabbed-pane>
        <component-tabbed-pane id="packstatus" title="Disk usage">
          <page-packcompression :repoStatus="repoStatus" :repoCallbacks="repoCallbacks" />
        </component-tabbed-pane>
      </component-tabbed-panes>
    </template>
  </div>
  `,
  components: {
    'page-welcome': PageWelcome,
    'page-files': PageFiles,
    'page-history': PageHistory,
    'page-gitignore': PageGitignore,
    'page-packcompression': PagePackcompression,
  },
  setup(props) {
    return {  }
  }
}

export default MainView;
