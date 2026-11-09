

import './style.css';

// Disk-usage tab layout: renders the nested <router-view> (the pack-object list).
const View = {
  template: `
<div class="mdm-git-gui-gitpackarchives">
  <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" />
    </keep-alive>
  </router-view>
</div>
`,
};

export default View;
