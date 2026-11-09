

import './style.css';

// History tab layout: just the nested <router-view> that renders the current
// history child route (the revisions list, or a version comparison). The old
// per-tab <pages-site> + createPage dance is gone; history lives in the URL now.
const View = {
  template: `
<div class="mdm-git-gui-historyview">
  <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" />
    </keep-alive>
  </router-view>
</div>
`,
};

export default View;
