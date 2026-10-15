

import { ref, onMounted, h } from 'vue';

import PagesSite from '@/common_components/pages/index';

import PageToolsHome from './page_tools_home';

import './style.css';

const View = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-tools">
  <pages-site ref="pagesSite"/>
</div>
`,
  components: {
    'pages-site': PagesSite,
  },
  setup(props) {

    const pagesSite = ref(null);
    const createPage = ref(()=>{ try { throw new Error('calling createPage: pages site is not inited'); } catch(e) { props.repoActions.logError(e); throw e; } });

    const navigateStartingPage = async () => {
      createPage.value = pagesSite.value.createPage;
      createPage.value(h(PageToolsHome,{repoStatus:props.repoStatus,repoActions:{...props.repoActions,createPage:createPage.value}}));
    };

    onMounted(async () => {
      await Promise.all([
        navigateStartingPage(),
        props.repoActions.getStatus(),
      ])
    });

    return { pagesSite, createPage }
  }
};

export default View;
