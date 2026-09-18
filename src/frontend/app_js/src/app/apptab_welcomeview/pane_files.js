

import PageFiles from '@/app/apptab_filesview/index';

// import './style.css';


const View = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<pane :repoStatus="repoStatus" :repoActions="repoActions" viewMode="compact" />
`,
  components: {
    'pane': PageFiles,
  },
  setup() {
    return {};
  },
};

export default View;
