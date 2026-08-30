

import { ref, onMounted, h } from 'vue';

import PagesSite from '../../common_components/pages/index';

import PageListPackObjects from './page_list_pack_objects/index';

import './style.css';

const View = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-gitpackarchives">
  <pages-site ref="pagesSite"/>
</div>
`,
  components: {
    // 'page-history-overview': PageListPackObjects,
    'pages-site': PagesSite,
  },
  setup(props) {

    const pagesSite = ref(null);
    const createPage = ref(()=>{ try { throw new Error('calling createPage: pages site is not inited'); } catch(e) { props.repoActions.logError(e); throw e; } });

    const navigateHomePage = async () => {
      createPage.value = pagesSite.value.createPage;
      createPage.value(h(PageListPackObjects,{repoStatus:props.repoStatus,repoActions:{...props.repoActions,createPage:createPage.value}}));
    };

    onMounted(async () => {
      await Promise.all([
        navigateHomePage(),
      ])
    });

    return { pagesSite, createPage }
  }
};

export default View;
