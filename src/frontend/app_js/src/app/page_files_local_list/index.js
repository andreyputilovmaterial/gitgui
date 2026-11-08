

import { ref, onMounted, computed, watch, } from 'vue';
import { useRouter } from 'vue-router';



import FilesRecords from './component_records.js';
import FilesRecordsCompact from './component_records_compact.js';
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
    <a href="#!" @click.prevent="piece.clickHandler" class="item" :title="index===0 ? 'Home' : undefined">{{ piece.pathNode }}</a>
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
    'pathCurrentParts',
    'navigate',
    'navigateBack',
  ],
  template: `
<div class="mdm-git-gui-fileslist-navbuttons">
  <a href="#!" @click.prevent="handlerNavigateBack" class="navbtn navbtn-back active" title="Back">←</a>
  <a href="#!" @click.prevent="handlerNavigateUp" :class="{'navbtn':true,'navbtn-levelup':true,'active':canLevelUp,}" title="Up one level">⇧</a> 
</div>
`,
  setup(props) {
    const isRoot = computed(()=> props.pathCurrentParts.length>0 ? false : true );
    const canLevelUp = computed(()=>isRoot.value ? false : true );
    const navigateUp = event => props.navigate( props.pathCurrentParts.slice(0,props.pathCurrentParts.length-1).join('/') ) && false;
    const handlerNavigateBack = event => props.navigateBack() && false;
    const handlerNavigateUp = event => {
      if( canLevelUp.value )
        return navigateUp() && false;
      else
        return false;
    };
    return { isRoot, canLevelUp, handlerNavigateBack, handlerNavigateUp, };
  },
};


const View = {
  props: [
    'namespace',
    'path',
    'navigateTo',
    'repoStatus',
    'repoActions',
    'viewMode',
  ],
  template: `
<div :class="['mdm-git-gui-fileslistview',...(isCompactView?['mdm-git-gui-fileslistview-compact']:[])]">
  <p class="root-page-description">View files in <component-format-local-file-path :path="pathCurrent" /></p>
  <template v-if="!repoStatus?.statusData?.status">
    Querying data, please wait...
  </template>
  <template v-else>
    <breadcrumbs :pathCurrentParts="pathCurrentParts" :navigate="navigate" />
    <navbar-buttons :pathCurrentParts="pathCurrentParts" :navigate="navigate" :navigateBack="navigateBack" />
    <div class="error">{{ error }}</div>
    <template v-if="!filesList && !error">Querying data, please wait...</template>
    <template v-else-if="!!filesList">
      <files-records-compact v-if="isCompactView" :files="filesList" :namespace="namespaceCurrent" :navigate="navigate" :repoStatus="repoStatus" :repoActions="repoActions" :path="pathCurrent" />
      <files-records v-else :files="filesList" :namespace="namespaceCurrent" :navigate="navigate" :repoStatus="repoStatus" :repoActions="repoActions" :path="pathCurrent" />
    </template>
  </template>
</div>
`,
  components: {
    'breadcrumbs': Breadcrumbs,
    'navbar-buttons': NavbarButtons,
    'files-records': FilesRecords,
    'files-records-compact': FilesRecordsCompact,
  },
  setup(props) {

    const router = useRouter();
    const filesList = ref(null);
    const error = ref('');
    const pathCurrent = computed(()=> props.path ?? '');
    const namespaceCurrent = computed(()=> props.namespace);
    const isCompactView = computed(()=>props.viewMode==='compact');
    const pathCurrentParts = computed(()=>pathCurrent.value===''?[]:[...pathCurrent.value.split('/')]);
    const navigate = newPath => {
      try {
        if( newPath===pathCurrent.value )
          return;
        const pathArray = (newPath||'').split('/').filter(Boolean);
        router.push({ name: props.navigateTo, params: { path: pathArray } });
      } catch(e) {
        props.repoActions.logError(`failed navigating to path: ${newPath}: ${e}`);
        error.value = e;
        throw e; 
      }
    };
    const navigateBack = () => {
      router.back();
    };

    const getFilesList = async () => {
      function norm(path) {
        const parts = path.split(/[\/\\]/ig);
        if( parts.includes('.') || parts.includes('..') )
          throw new Error(`path with "." or ".." cannot be accepted; please normalize/resolve the path on the backend first: ${path}`);
        return parts.join('/');
      }
      const resourcePath = `${namespaceCurrent.value}:${pathCurrent.value}`;
      try {
        error.value = '';
        const encodedPath = resourcePath
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
        props.repoActions.logError(`Failed fetching file list for path "${resourcePath}": ${e}`);
        error.value = e;
        throw e;
      }
    };

    onMounted(async () => {
      await Promise.all([
        getFilesList(),
        props.repoActions.getStatus(),
      ])
    });

    watch(
      () => [namespaceCurrent.value, pathCurrent.value],
      () => getFilesList(),
    )

    return {
      filesList,
      error,
      pathCurrent,
      namespaceCurrent,
      navigate,
      navigateBack,
      pathCurrentParts,
      isCompactView,
    };
  },
};

export default View;
