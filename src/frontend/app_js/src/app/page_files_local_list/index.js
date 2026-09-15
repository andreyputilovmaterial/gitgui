

import { ref, onMounted, computed, reactive } from 'vue';



import FilesRecords from './component_records.js';
import { makeFetchResponseErrorMessage, } from '@/common_defs/helper_functions';


import './style.css';
import './style_breadcrumbs.css';





const Breadcrumbs = {
  props: [
    'pathCurrentParts',
    'navigate',
  ],
  template: `
<div class="mdm-git-gui-fileslist-breadcrumbs">
  <template v-for="(piece,index) in pathCurrentParts">
    <span v-if="index>0" class="delimiter">/</span>
    <a href="#!" @click.prevent="clickHandlers[index]" class="item">{{ piece }}</a>
  </template>
</div>
`,
  setup(props) {
    const clickHandlers = computed(()=>props.pathCurrentParts.map((_,i)=>{
      const pathThis = props.pathCurrentParts.slice(0,i).join('/');
      const pathFull = props.pathCurrentParts.join('/');
      if( pathThis===pathFull )
        return event => false;
      else
        return event => navigate(pathThis) && false;
    }));
    return { clickHandlers };
  },
};


const NavbarButtons = {
  props: [
    'path',
    'pathCurrentParts',
    'navigate',
    'navigateBack',
    'history',
  ],
  template: `
<div class="mdm-git-gui-fileslist-navbuttons">
  <a href="#!" @click.prevent="canGoBack ? navigateBack : nothing">Back<template v-if="canGoBack"> (active)</template><template v-else> (inactive)</template></a>, 
  <a href="#!" @click.prevent="canLevelUp ? navigateUp : nothing">Up<template v-if="canLevelUp"> (active)</template><template v-else> (inactive)</template></a> 
</div>
`,
  setup(props) {
    const nothing = ref(()=>false);
    const isRoot = computed(()=> props.pathCurrentParts.length>0 ? false : true );
    const canLevelUp = computed(()=>isRoot.value ? false : true );
    const canGoBack = computed(()=> history.length>0 ? true : false );
    const navigateUp = event => props.navigate( props.pathCurrentParts.slice(0,props.pathCurrentParts.length-1).join('/') ) && false;
    return { isRoot, canLevelUp, canGoBack, nothing, navigateUp, };
  },
};


const View = {
  props: [
    'path',
    'repoStatus',
    'repoActions',
    'resolve','reject', /* could both be called to close this window - parent will destroy the component once called */
  ],
  template: `
<div class="mdm-git-gui-fileslistview">
  <p class="root-page-description">View files in <component-format-local-file-path :path="pathCurrent" /></p>
  <breadcrumbs :path="pathCurrentParts" />
  <navbar-buttons :pathCurrentParts="pathCurrentParts" :path="pathCurrent" :navigate="navigate" :navigateBack="navigateBack" />
  <div class="error">{{ error }}</div>
  <template v-if="!filesList && !error">Querying data, please wait...</template>
  <template v-else-if="!!filesList">
    <files-records :files="filesList" :repoStatus="repoStatus" :repoActions="repoActions" :path="path" />
  </template>
</div>
`,
  components: {
    'breadcrumbs': Breadcrumbs,
    'navbar-buttons': NavbarButtons,
    'files-records': FilesRecords,
  },
  setup(props) {

    const filesList = ref(null);
    const error = ref('');
    const pathCurrent = ref(props.path);
    const history = reactive([]);
    const pathCurrentParts = computed(()=>[...pathCurrent.value.split(/\/\\/ig)]);
    const navigate = newPath => {
      try {
        if( newPath.join('/')===pathCurrentParts.value.join('/') )
          return;
        history.push(newPath);
        pathCurrent.value = newPath;
      } catch(e) {
        props.repoCallbacks.logError(e);
        props.repoCallbacks.logError(`failed navigating to path: ${newPath}`);
        error.value = e;
        throw e; 
      }
    };
    const navigateBack = () => {
      try {
        if( history.length===0 )
          throw new Error('failed to navigate back in history: no more steps, there isn\'t anywhere to go back further');
        const newPath = history.pop();
        pathCurrent.value = newPath;
      } catch(e) {
        props.repoCallbacks.logError(e);
        props.repoCallbacks.logError(`failed navigating to path: ${newPath}`);
        error.value = e;
        throw e; 
      }
    };

    const getFilesList = async (path) => {
      try {
        error.value = '';
        const response = await fetch(
          `/browse/${path}`,
          {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
          },
        );
        if( !response.ok ) {
            throw new Error(await makeFetchResponseErrorMessage(response) );
        }
        filesList.value = (await response.json()).map(record => ({filepath:record}));
      } catch(e) {
        props.repoActions.logError(e);
        props.repoActions.logError(`Failed fetching file list for path "${props.path}"`);
        throw e;
      }
    };

    onMounted(async () => {
      await Promise.all([
        getFilesList(pathCurrent.value),
      ])
    });

    return {
      filesList, error, pathCurrent, history, navigate, navigateBack, pathCurrentParts,
    };
  },
};

export default View;
