

import './style.css';

// Disk-usage tab layout: renders the nested <router-view> (the pack-object list).
const View = {
  template: `
<div class="mdm-git-gui-gitpackarchives">
  <router-view></router-view>
</div>
`,
};

export default View;
