import '../common_components/tabbed_panes/styles.css';

// Tab bar + nested <router-view>: replaces the old <component-tabbed-panes>.
// Reuses the existing tab skin classes (common_components/tabbed_panes/styles.css)
// so the tabs look identical. The active tab is tracked by <router-link>'s
// active-class, which stays active for nested child routes (files/history/...
// children) once those are added.
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
    <router-link
      v-for="tab in tabs"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="mdm-ui-tabbed-panes-button"
      active-class="active"
    >{{ tab.title }}</router-link>
  </div>
  <div class="mdm-ui-tabbed-panes-inner">
    <router-view></router-view>
  </div>
</div>
`,
  setup() {
    return { tabs: TABS };
  },
};

export default AppTabsLayout;
