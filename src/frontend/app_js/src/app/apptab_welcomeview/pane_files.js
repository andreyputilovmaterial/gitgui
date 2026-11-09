

import PageFilesLocalList from '@/app/page_files_local_list/index';

// import './style.css';


const View = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<pane :repoStatus="repoStatus" :repoActions="repoActions" namespace="worktree" path="" :embedded="true" viewMode="compact" />
`,
  components: {
    'pane': PageFilesLocalList,
  },
  setup() {
    return {};
  },
};

export default View;
