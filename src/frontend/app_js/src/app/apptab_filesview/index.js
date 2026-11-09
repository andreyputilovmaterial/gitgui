

import './style.css';

// Files tab layout: a short description plus the nested <router-view> that
// renders the worktree file list at the current path. The tab is entirely for
// browsing real physical files in the working tree, so the URL is `files/<path>`
// (root `files`) with no namespace prefix. The old per-tab <pages-site> +
// createPage dance is gone; the file list lives in the URL now.
const View = {
  template: `
<div class="mdm-git-gui-filesview">
  <p>Files in working tree.<br />
Changed files are in orange. Merge conflicts are in pink. Untracked/ignored files are greyed out.</p>
  <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" />
    </keep-alive>
  </router-view>
</div>
`,
};

export default View;
