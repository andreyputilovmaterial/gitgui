

import './style.css';

// Tools tab layout: renders the nested <router-view> (tools home, or an opened tool).
const View = {
  template: `
<div class="mdm-git-gui-tools">
  <router-view></router-view>
</div>
`,
};

export default View;
