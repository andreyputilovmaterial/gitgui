import '../common_components/tabbed_panes/styles.css';
import './layout_app_tabs.css';

import { canGoBack, goBack } from './back_navigation';

// Tab bar + nested <router-view>: replaces the old <component-tabbed-panes>.
// Reuses the existing tab skin classes (common_components/tabbed_panes/styles.css)
// so the tabs look identical. The active tab is tracked by <router-link>'s
// active-class, which stays active for nested child routes (files/history/...
// children) once those are added.
//
// The leading "←" is the physical back button: it appears only when the current
// tab has a previous *page* to go back to (see back_navigation.js).
const TABS = [
  { name: 'home',       title: 'Overview' },
  { name: 'files',      title: 'Files' },
  { name: 'history',    title: 'History' },
  { name: 'gitignore',  title: 'Gitignore (tracked files)' },
  { name: 'packstatus', title: 'Disk usage' },
  { name: 'tools',      title: 'Tools' },
];

const AppTabsLayout = {
  template: `
<div class="mdm-ui-tabbed-panes">
  <div class="mdm-ui-tabbed-panes-head">
    <a
      v-if="canGoBack"
      href="#!"
      class="mdm-git-gui-tabbed-panes-back"
      title="Back"
      @click.prevent="goBack"
    ><i class="ri-arrow-left-circle-line"></i></a>
    <router-link
      v-for="tab in tabs"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="mdm-ui-tabbed-panes-button"
      active-class="active"
    >{{ tab.title }}</router-link>
  </div>
  <div class="mdm-ui-tabbed-panes-inner">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</div>
`,
  setup() {
    return { tabs: TABS, canGoBack, goBack };
  },
};

export default AppTabsLayout;
