

import './style.css';

// Tools tab layout: renders the nested <router-view> (tools home, or an opened tool).
const View = {
  template: `
<div class="mdm-git-gui-tools">
  <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" />
    </keep-alive>
  </router-view>
</div>
`,
};

export default View;
