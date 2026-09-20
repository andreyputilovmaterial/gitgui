


import { ref, onMounted, computed, } from 'vue';

import PagesSite from '@/common_components/pages/index';

import PaneStatus from './pane_main_status';
import PaneFiles from './pane_files';
import PaneHistory from './pane_history';

import './style.css';


const View = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-welcomeview">
  <div class="mdm-git-gui-welcomeview-pane-status">
    <h2>Current status</h2>
    <pane-status :repoStatus="repoStatus" :repoActions="repoActionsWithCreatePage" />
    <pages-site ref="pagesSite"/>
  </div>
  <div class="mdm-git-gui-welcomeview-pane-files">
    <h2>Files</h2>
    <pane-files :repoStatus="repoStatus" :repoActions="repoActionsWithCreatePage" />
  </div>
  <div class="mdm-git-gui-welcomeview-pane-history">
    <h2>History</h2>
    <p class="desc">Previosly saved revisions</p>
    <pane-history :repoStatus="repoStatus" :repoActions="repoActionsWithCreatePage" />
  </div>
</div>
`,
  components: {
    'pane-status': PaneStatus,
    'pane-files': PaneFiles,
    'pane-history': PaneHistory,
    'pages-site': PagesSite,
  },
  setup(props) {
    const pagesSite = ref(null);
    const createPage = ref(()=>{ try { throw new Error('calling createPage: pages site is not inited'); } catch(e) { props.repoActionsWithCreatePage.logError(e); throw e; } });

    const initNavigatePage = async () => {
      createPage.value = pagesSite.value.createPage;
      return null;
    };

    onMounted(async () => {
      await Promise.all([
        initNavigatePage(),
      ])
    });

    const repoActionsWithCreatePage = computed(()=>({...props.repoActions,createPage:createPage.value}));

    return { pagesSite, createPage, repoActionsWithCreatePage, };
  },
};

export default View;
