

import { ref, onMounted, computed, reactive, watch } from 'vue';



import FilesRecords from './component_records.js';
import { makeFetchResponseErrorMessage, } from '@/common_defs/helper_functions';


import './style.css';
import './style_breadcrumbs.css';
import './style_navbuttons.css';





const Breadcrumbs = {
  props: [
    'pathCurrentParts',
    'navigate',
  ],
  template: `
<div class="mdm-git-gui-fileslist-breadcrumbs">
  <template v-for="(piece,index) in pathParts">
    <span v-if="index>0" class="delimiter">/</span>
    <a href="#!" @click.prevent="piece.clickHandler" class="item">{{ piece.pathNode }}</a>
  </template>
</div>
`,
  setup(props) {
    const pathParts = computed(() => [
      {
        pathNode: '⌂',
        clickHandler: event => props.navigate('') && false,
      },
      ...props.pathCurrentParts.map((pathNode,i)=>{
      const pathThis = props.pathCurrentParts.slice(0,i+1).join('/');
      const pathFull = props.pathCurrentParts.join('/');
      const clickHandler = event => {
        if( pathThis===pathFull )
          return false;
        return props.navigate(pathThis) && false
      };
      return {
        pathNode,
        clickHandler,
      };
    })
    ]);
    return { pathParts, };
  },
};


const NavbarButtons = {
  props: [
    'path',
    'pathCurrentParts',
    'navigate',
    'history',
    'navigateBack',
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-fileslist-navbuttons">
  <a href="#!" @click.prevent="handlerNavigateBack" :class="{'navbtn':true,'navbtn-back':true,'active':canGoBack,}">←</a>
  <a href="#!" @click.prevent="handlerNavigateUp" :class="{'navbtn':true,'navbtn-levelup':true,'active':canLevelUp,}">⇧</a> 
</div>
`,
  setup(props) {
    const nothing = ref(()=>false);
    const isRoot = computed(()=> props.pathCurrentParts.length>0 ? false : true );
    const canLevelUp = computed(()=>isRoot.value ? false : true );
    const canGoBack = computed(()=> props.history.length>1 ? true : false );
    const navigateUp = event => props.navigate( props.pathCurrentParts.slice(0,props.pathCurrentParts.length-1).join('/') ) && false;
    const handlerNavigateBack = event => {
      if( canGoBack.value )
        return props.navigateBack() && false;
      else
        return false;
    };
    const handlerNavigateUp = event => {
      if( canLevelUp.value )
        return navigateUp() && false;
      else
        return false;
    };
    return { isRoot, canLevelUp, canGoBack, nothing, handlerNavigateBack, handlerNavigateUp, };
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
  <breadcrumbs :pathCurrentParts="pathCurrentParts" :navigate="navigate" />
  <navbar-buttons :pathCurrentParts="pathCurrentParts" :path="pathCurrent" :navigate="navigate" :navigateBack="navigateBack" :history="history" :repoStatus="repoStatus" :repoActions="repoActions" />
  <div class="error">{{ error }}</div>
  <template v-if="!filesList && !error">Querying data, please wait...</template>
  <template v-else-if="!!filesList">
    <files-records :files="filesList" :namespace="namespaceCurrent" :navigate="navigate" :repoStatus="repoStatus" :repoActions="repoActions" :path="path" />
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
    const pathCurrent = ref(null);
    const namespaceCurrent = ref(null);
    (()=>{
      const matches = props.path.match(/^(\w+):(.*)$/);
      if( !matches ) {
        const error = new Error('files view: path does not follow format of namespace:path/within/namespace');
        props.repoActions.logError(error);
        error.value = error;
        Promise.resolve().then(()=>{ throw error; });
        return { error };
      }
      namespaceCurrent.value = matches[1];
      pathCurrent.value = matches[2].replace(/\/\\/ig,'/');
    })();
    const history = reactive([pathCurrent.value]);
    const pathCurrentParts = computed(()=>pathCurrent.value===''?[]:[...pathCurrent.value.split(/\//ig)]);
    const navigate = newPath => {
      try {
        if( newPath===pathCurrent.value )
          return;
        history.push(newPath);
        pathCurrent.value = newPath;
      } catch(e) {
        props.repoActions.logError(e);
        props.repoActions.logError(`failed navigating to path: ${newPath}`);
        error.value = e;
        throw e; 
      }
    };
    const navigateBack = () => {
      try {
        if( history.length<=1 )
          throw new Error('failed to navigate back in history: no more steps, there isn\'t anywhere to go back further');
        const _ = history.pop();
        const prevVal = history[history.length-1];
        pathCurrent.value = prevVal;
      } catch(e) {
        props.repoActions.logError(e);
        props.repoActions.logError(`failed navigating to path: ${newPath}`);
        error.value = e;
        throw e; 
      }
    };

    const getFilesList = async (path) => {
      function norm(path) {
        const parts = path.split(/[\/\\]/ig);
        if( parts.includes('.') || parts.includes('..') )
          throw new Error(`path with "." or ".." cannot be accepted; please normalize/resolve the path on the backend first: ${path}`);
        return parts.join('/');
      }
      try {
        error.value = '';
        const encodedPath = path
          .split("/")
          .map(encodeURIComponent)
          .join("/");
        const response = await fetch(
          `/browse/${encodedPath}`,
          {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
          },
        );
        if( !response.ok ) {
            throw new Error(await makeFetchResponseErrorMessage(response) );
        }
        let result;
        try {
          result = await response.json();
        } catch(e) {
            throw new Error(await makeFetchResponseErrorMessage(response) );
        }
        filesList.value = result.map(record => ({
          filepath: norm(record.name),
          fullFilepath: norm(record.full_path),
          type: record.type,
          size: record.size,
          modifiedAt: record.modified_at ? new Date(record.modified_at) : null,
          metadataChangedAt: record.metadata_changed_at ? new Date(record.metadata_changed_at) : null,
          createdAt: record.created_at ? new Date(record.created_at) : null,
        }));
      } catch(e) {
        props.repoActions.logError(e);
        props.repoActions.logError(`Failed fetching file list for path "${props.path}"`);
        error.value = e;
        throw e;
      }
    };

    onMounted(async () => {
      await Promise.all([
        getFilesList(`${namespaceCurrent.value}:${pathCurrent.value}`),
        props.repoActions.getStatus(),
      ])
    });

    watch(
      pathCurrent,
      () => getFilesList(`${namespaceCurrent.value}:${pathCurrent.value}`),
    )

    return {
      filesList, error, pathCurrent, namespaceCurrent, history, navigate, navigateBack, pathCurrentParts,
    };
  },
};

export default View;
