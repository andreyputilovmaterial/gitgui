

import './styles.css';


import RepoInitViewGitignoreSection from './section_gitignore';
import RepoInitViewInitTheRepo from './init_repo';


const RepoInitView = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
    <component-section-rollup header="Repo Init View" :condensed="!repoInitRequiresAttention">
      <div class="git-repo-intro-setup-section">
        <div class="repo-existence-section">
          {{ !!repoStatus?.repoExistsData?.repoExists ? '' : 'Repo is not initialized yet' }}
          <repo-init-form v-if="!repoStatus?.repoExistsData?.repoExists" :repoStatus="repoStatus" :repoActions="repoActions"></repo-init-form>
        </div>
        <div class="gitignore-section">
          <gitignore-section
            :repoStatus="repoStatus"
            :repoActions="repoActions"
          />
        </div>
      </div>
    </component-section-rollup>
  `,
  components: {
    'gitignore-section': RepoInitViewGitignoreSection,
    'repo-init-form': RepoInitViewInitTheRepo,
  },
  setup(props) {
    const repoInitRequiresAttention = computed( () => !props.repoStatus?.repoExistsData?.repoExists );
    return { repoInitRequiresAttention }
  }
}

export default RepoInitView;
