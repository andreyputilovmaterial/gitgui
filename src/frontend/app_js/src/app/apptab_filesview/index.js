

import { ref, onMounted, h } from 'vue';

import PagesSite from '@/common_components/pages/index';

import PageFilesView from '@/app/page_files_local_list/index';

import './style.css';

const View = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-filesview">
  <pages-site ref="pagesSite"/>
</div>
`,
  components: {
    'pages-site': PagesSite,
  },
  setup(props) {

    const pagesSite = ref(null);
    const createPage = ref(()=>{ try { throw new Error('calling createPage: pages site is not inited'); } catch(e) { props.repoActions.logError(e); throw e; } });

    const navigateHomePage = async () => {
      createPage.value = pagesSite.value.createPage;
      createPage.value(h(PageFilesView,{path:'worktree:',repoStatus:props.repoStatus,repoActions:{...props.repoActions,createPage:createPage.value}}));
    };

    onMounted(async () => {
      await Promise.all([
        props.repoActions.checkIfSomethingIsInStagingArea(),
        navigateHomePage(),
      ])
    });

    return { pagesSite }
  }
};

export default View;
