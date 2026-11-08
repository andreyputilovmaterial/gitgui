

import PageRevisionsList from '@/app/page_revisions_list/index';

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
    'pane': PageRevisionsList,
  },
  setup() {
    return {};
  },
};

export default View;
