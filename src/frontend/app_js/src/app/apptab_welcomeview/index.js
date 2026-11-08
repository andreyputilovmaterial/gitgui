


import PaneStatus from './pane_main_status';
import PaneFiles from './pane_files';
import PaneHistory from './pane_history';

import './style.css';


const View = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-welcomeview">
  <div class="mdm-git-gui-welcomeview-pane-status">
    <h2>Current status</h2>
    <pane-status :repoStatus="repoStatus" :repoActions="repoActions" />
  </div>
  <div class="mdm-git-gui-welcomeview-pane-files">
    <h2>Files</h2>
    <pane-files :repoStatus="repoStatus" :repoActions="repoActions" />
  </div>
  <div class="mdm-git-gui-welcomeview-pane-history">
    <h2>History</h2>
    <p class="desc">Previosly saved revisions</p>
    <pane-history :repoStatus="repoStatus" :repoActions="repoActions" />
  </div>
</div>
`,
  components: {
    'pane-status': PaneStatus,
    'pane-files': PaneFiles,
    'pane-history': PaneHistory,
  },
};

export default View;
