

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
<div :class="['mdm-git-gui-fileslist-breadcrumbs', isAtRoot ? 'mdm-git-gui-fileslist-breadcrumbs--at-root' : '']">
  <template v-for="(piece,index) in pathParts">
    <span v-if="index>0" class="delimiter">/</span>
    <a v-if="!piece.isCurrent" href="#!" @click.prevent="piece.clickHandler" class="item" :title="index===0 ? 'Home' : undefined">
      <i v-if="piece.isHome" class="ri-home-4-line"></i>
      <template v-else>{{ piece.pathNode }}</template>
    </a>
    <span v-else class="item item-current" :title="index===0 ? 'Home' : undefined">
      <i v-if="piece.isHome" class="ri-home-4-line"></i>
      <template v-else>{{ piece.pathNode }}</template>
    </span>
  </template>
</div>
`,
  setup(props) {
    const isAtRoot = computed(() => props.pathCurrentParts.length === 0);
    const pathParts = computed(() => [
      {
        isHome: true,
        isCurrent: isAtRoot.value,
        clickHandler: event => props.navigate('') && false,
      },
      ...props.pathCurrentParts.map((pathNode,i)=>{
      const pathThis = props.pathCurrentParts.slice(0,i+1).join('/');
      const pathFull = props.pathCurrentParts.join('/');
      const isCurrent = pathThis === pathFull;
      const clickHandler = event => {
        if( isCurrent )
          return false;
        return props.navigate(pathThis) && false
      };
      return {
        pathNode,
        isCurrent,
        clickHandler,
      };
    })
    ]);
    return { pathParts, isAtRoot, };
  },
};


const NavbarButtons = {
  props: [
    'pathCurrentParts',
    'navigate',
    'navigateBack',
    'canNavigateBack',
  ],
  template: `
<div class="mdm-git-gui-fileslist-navbuttons">
  <a href="#!" @click.prevent="handlerNavigateBack" :class="{'navbtn':true,'navbtn-back':true,'active':canNavigateBack}" title="Back"><i class="ri-arrow-left-line"></i></a>
  <a href="#!" @click.prevent="handlerNavigateUp" :class="{'navbtn':true,'navbtn-levelup':true,'active':canLevelUp,}" title="Up one level"><i class="ri-arrow-up-line"></i></a> 
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
    'embedded',
  ],
  template: `
<div :class="['mdm-git-gui-fileslistview',...(isCompactView?['mdm-git-gui-fileslistview-compact']:[])]">
  <p class="root-page-description">View files in <component-format-local-file-path :path="pathCurrent" /></p>
  <template v-if="!repoStatus?.statusData?.status">
    Querying data, please wait...
  </template>
  <template v-else>
    <breadcrumbs :pathCurrentParts="pathCurrentParts" :navigate="navigate" />
    <navbar-buttons :pathCurrentParts="pathCurrentParts" :navigate="navigate" :navigateBack="navigateBack" :canNavigateBack="canNavigateBack" />
    <div class="error">{{ error }}</div>
    <div v-if="notFoundMessage" class="error mdm-git-gui-fileslistview-notfound">{{ notFoundMessage }}</div>
    <template v-if="!filesList && !error && !notFoundMessage">Querying data, please wait...</template>
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
    const notFoundMessage = ref('');
    const namespaceCurrent = computed(()=> props.namespace);
    const isCompactView = computed(()=>props.viewMode==='compact');
    const isEmbedded = computed(()=> !!props.embedded);

    // Current path. In embedded mode (the component is just a pane inside a
    // larger page) the path is fully local and never touches the router;
    // otherwise it follows the route param.
    const pathCurrent = ref(props.path ?? '');

    // In-tree back history: the paths we came from while walking the files
    // tree. The "back" button pops from here, so it can only walk back within
    // the tree and never leaves the component (no tab/page switch).
    const pathHistory = ref([]);
    const canNavigateBack = computed(()=> pathHistory.value.length>0);

    const pathCurrentParts = computed(()=>pathCurrent.value===''?[]:[...pathCurrent.value.split('/')]);

    const normalizePath = raw => (raw ?? '').split('/').filter(Boolean).join('/');

    const applyPath = newPath => {
      const normalized = normalizePath(newPath);
      if( normalized===pathCurrent.value )
        return;
      if( isEmbedded.value ) {
        pathCurrent.value = normalized;
      } else {
        router.push({ name: props.navigateTo, params: { path: normalized.split('/').filter(Boolean) } });
      }
    };

    const navigate = newPath => {
      try {
        const normalized = normalizePath(newPath);
        if( normalized===pathCurrent.value )
          return;
        pathHistory.value.push(pathCurrent.value);
        applyPath(normalized);
      } catch(e) {
        props.repoActions.logError(`failed navigating to path: ${newPath}: ${e}`);
        error.value = e;
        throw e; 
      }
    };
    const navigateBack = () => {
      if( !pathHistory.value.length )
        return;
      const previous = pathHistory.value.pop();
      if( previous===pathCurrent.value )
        return;
      applyPath(previous);
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
        notFoundMessage.value = '';
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
        if( response.status === 404 ) {
            filesList.value = null;
            notFoundMessage.value = `Path not found: ${resourcePath}`;
            return;
        }
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

    // When rendered as a route (Files tab), follow the route param; when
    // embedded, the path is fully local and the route param is irrelevant.
    watch(
      () => props.path,
      (p) => { if( !isEmbedded.value ) pathCurrent.value = (p ?? ''); },
    )

    watch(
      () => [namespaceCurrent.value, pathCurrent.value],
      () => getFilesList(),
    )

    return {
      filesList,
      error,
      notFoundMessage,
      pathCurrent,
      namespaceCurrent,
      navigate,
      navigateBack,
      canNavigateBack,
      pathCurrentParts,
      isCompactView,
    };
  },
};

export default View;
