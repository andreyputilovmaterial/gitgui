

import './style.css';

// Files tab layout: a short description plus the nested <router-view> that
// renders the current files child route (worktree/gitdir/pack). The old
// per-tab <pages-site> + createPage dance is gone; the file list lives in the
// URL now.
const View = {
  template: `
<div class="mdm-git-gui-filesview">
  <p>Files in working tree.<br />
Changed files are in orange. Merge conflicts are in pink. Untracked/ignored files are greyed out.</p>
  <router-view></router-view>
</div>
`,
};

export default View;
