

import './styles.css';


import RepoInitViewGitignoreSection from './section_gitignore';
import RepoInitViewInitTheRepo from './init_repo';


const RepoInitView = {
  props: [
    'repoInitRequiresAttention',
    'repoStatus',
    'repoActions',
    'config',
  ],
  template: `
    <component-section-rollup header="Repo Init View" :condensed="!repoInitRequiresAttention">
      <div class="git-repo-intro-setup-section">
        <div class="repo-existence-section">
          {{ !!repoStatus.repoExists ? '' : 'Repo is not initialized yet' }}
          <repo-init-form v-if="!repoStatus.repoExists" :repoStatus="repoStatus" :repoActions="repoActions" :config="config"></repo-init-form>
        </div>
        <div class="gitignore-section">
          <gitignore-section :repoInitRequiresAttention="repoInitRequiresAttention" :repoStatus="repoStatus" :repoActions="repoActions"></gitignore-section>
        </div>
      </div>
    </component-section-rollup>
  `,
  components: {
    'gitignore-section': RepoInitViewGitignoreSection,
    'repo-init-form': RepoInitViewInitTheRepo,
  },
  setup(props) {
    return {}
  }
}

export default RepoInitView;
