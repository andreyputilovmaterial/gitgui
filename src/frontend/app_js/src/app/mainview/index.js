

import './styles.css';

const MainView = {
  props: [
    'repoStatus', 'repoCallbacks',
  ],
  template: `
<component-section-rollup header="Main Status View" :condensed="!repoStatus?.repoExists">
  <div class="mdm-git-gui-mainview">
    <template v-if="!repoStatus?.repoExists">
      Repo is not inited. Nothing to display.
    </template>
    <template v-else>
      <component-tabbed-panes active="home">
        <component-tabbed-pane id="home" title="Overview">
          Home page
        </component-tabbed-pane>
        <component-tabbed-pane id="files" title="Files">
          Files here...
        </component-tabbed-pane>
        <component-tabbed-pane id="history" title="History">
          History here...
        </component-tabbed-pane>
        <component-tabbed-pane id="gitignore" title="gitignore (tracked files)">
          Configure gitignore...
        </component-tabbed-pane>
        <component-tabbed-pane id="packstatus" title="Hist Pack Compression Status">
          Pack compression status here...
        </component-tabbed-pane>
      </component-tabbed-panes>
    </template>
  </div>
</component-section-rollup>
  `,
  setup(props) {
    return {  }
  }
}

export default MainView;
