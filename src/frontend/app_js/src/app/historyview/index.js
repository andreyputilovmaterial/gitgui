

import { ref, reactive, watch, onMounted, toRaw, h } from 'vue';

import logError from '../../error_logger/logError';

import PagesSite from '../../common_components/pages/index';

import PageHistoryOverview from './page_history_overview/index';

import './style.css';

const View = {
  props: [
    'repoStatus',
    'repoCallbacks',
  ],
  template: `
<div class="mdm-git-gui-historyview">
  <template v-if="!repoStatus?.history">
    Fetching history...
  </template>
  <template v-else-if="!!repoStatus?.history">
    <pages-site ref="pagesSite"/>
  </template>
</div>
`,
  components: {
    // 'page-history-overview': PageHistoryOverview,
    'pages-site': PagesSite,
  },
  setup(props) {

    const pagesSite = ref(null);
    const createPage = ref(()=>{ try { throw new Error('calling createPage: pages site is not inited'); } catch(e) { logError(e); throw e; } });

    const promiseContextHistoryReady = {
      resolve: () => {throw new Error('promise not inited')},
      reject: () => {throw new Error('promise not inited')},
      promise: undefined,
    };
    promiseContextHistoryReady.promise = new Promise((resolve,reject) => {
      promiseContextHistoryReady.resolve = resolve;
      promiseContextHistoryReady.reject = reject;
    });

    const navigateHistoryHomePage = async () => {
      await Promise.all([promiseContextHistoryReady.promise,]);
      createPage.value = pagesSite.value.createPage;
      createPage.value(h(PageHistoryOverview,{repoStatus:props.repoStatus,repoCallbacks:{...props.repoCallbacks,createPage:createPage.value}}));
    };

    onMounted(async () => {
      await Promise.all([
        props.repoCallbacks.updateHistory(),
        props.repoCallbacks.getHEAD(),
        props.repoCallbacks.checkIfSomethingIsInStagingArea(),
        navigateHistoryHomePage(),
      ])
    });

    watch(() => props?.repoStatus?.history, () => {
      promiseContextHistoryReady.resolve(props?.repoStatus?.history);
      console.log('[DEBUG-history]: new history:',toRaw(props?.repoStatus?.history));
    });

    return { pagesSite, createPage }
  }
};

export default View;
