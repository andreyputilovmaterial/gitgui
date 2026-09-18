

import PageHistory from '@/app/apptab_historyview/index';

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
    'pane': PageHistory,
  },
  setup() {
    return {};
  },
};

export default View;
