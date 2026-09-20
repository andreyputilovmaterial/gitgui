

import { ref, computed, reactive } from 'vue';



const Record = {
  props: [
    'type',
    'index',
    'worktree',
    'xy',
    'submodule',
    'headMode',
    'indexMode',
    'worktreeMode',
    'headObject',
    'indexObject',
    'path',
    'diffLeft',
    'diffRight',
    'componentRecordsFiltData',
    'repoStatus',
    'repoActions',
  ],
  template: `
<div
  :class="[
    ...['mdm-git-gui-git-status-record','git-status-record','mdm-ui-record'],
    ...(componentRecordsFiltData?.cssClasses||[]),
  ]"
  :key="path"
>
  <span class="status status-index mdm-ui-record-col-status-index mdm-ui-record-col-1 code" title="status in index">
    {{ index }}
  </span>
  <span class="status status-worktree mdm-ui-record-col-status-worktree mdm-ui-record-col-2 code" title="status in working tree">
    {{ worktree }}
  </span>
  <span class="filepath mdm-ui-record-col-filepath mdm-ui-record-col-3">
    <span class="label">File path: </span>
    {{ path }}
  </span>
  <span class="link-show-diff mdm-ui-record-col-linkshowdiff mdm-ui-record-col-4">
    <template v-if="!!diffLeft&&!!diffRight">
      <a href="#!" #click.prevent="undefined" class="link-show-diff mdm-link">(show changes)</a>
    </template>
  </span>
</div>
`,
  setup() {
    return {};
  },
}



const View = {
  props: [
    'records',
    'diffLeft',
    'diffRight',
    'label',
    'repoStatus',
    'repoActions',
    'resolve',
    'reject',
  ],
  template: `
<div class="mdm-git-gui-popupview-list-changed-files">
  <h2>{{ label }}</h2>
  <component-filter-records-form
    :columns="{
      'path': 'File path',
      'type': 'Type',
      'index': 'Index status',
      'worktree': 'Working tree status',
      'xy': 'XY',
      'submodule': 'Submodule',
      'headMode': 'HeadMode',
      'indexMode': 'IndexMode',
      'worktreeMode': 'WorktreeMode',
      'headObject': 'HeadObject',
      'indexObject': 'IndexObject',
    }"
    :keyField="'path'"
    :records="records"
    :needSort="true"
    :recordsPerPage="15"
    ref="filteringComponent"
  >
    <div class="mdm-git-gui-git-status-records git-status-records mdm-ui-records">
      <git-status-record
        v-for="h in recordsSorted"
        :key="h.path"
        :type="h.type"
        :index="h.index"
        :worktree="h.worktree"
        :xy="h.xy"
        :submodule="h.submodule"
        :headMode="h.headMode"
        :indexMode="h.indexMode"
        :worktreeMode="h.worktreeMode"
        :headObject="h.headObject"
        :indexObject="h.indexObject"
        :path="h.path"
        :diffLeft="diffLeft"
        :diffRight="diffRight"
        :componentRecordsFiltData="h.componentRecordsFiltData"
        :repoStatus="repoStatus"
        :repoActions="repoActions"
      />
    </div>
  </component-filter-records-form>
  <div class="mdmreport-controls"><input type="button" value="Close" @click.prevent="reject" class="mdmreport-buttom mdm-git-gui-button-close gitgui-button-close"></input></div>
</div>
`,
  components: {
    'git-status-record': Record,
  },
  setup(props) {

    const filteringComponent = ref(null);

    const recordsSorted = computed(() => {
      if( filteringComponent.value?.paginateAndSort ) {
        return filteringComponent.value?.paginateAndSort(props.records);
      } else {
        // return props.files; // returning all unfiltered results in full list rendered and crash on memory
        return [];
      }
    });

    return {
      filteringComponent,
      recordsSorted,
    };
  },
};

export default View;
