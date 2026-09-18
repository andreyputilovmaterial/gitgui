
import { ref, h } from 'vue';

import FormCompareVersionsControls from './component_ver_compare_radioboxes.js';

import PageFilesList from '@/app/page_files_within_revision_list/index.js';

import './style.css';




const HashLocal = {
  props: [],
  template: `
<component-format-hash hash="Worktree" :highlight="'full'" />
`,
  setup() {
    return {};
  },
};
const HashStaged = {
  props: [],
  template: `
<component-format-hash hash="Index" :highlight="'full'" />
`,
  setup() {
    return {};
  },
};


const Date = {
  props: [ 'timestamp', ],
  template: `
<component-format-datetime :dt="timestamp" />
`,
  setup() {
    return {};
  },
};

const Message = {
  props: [ 'message', ],
  template: `<div v-if="!!message && (\`\${message}\`.trim().length>0)" class="message-box">{{ message }}</div>`,
  setup() {
    return {};
  },
};



const Record = {
  props: [
    'hash',
    'author',
    'message',
    'timestamp',
    'formVerCompareFields',
    'componentRecordsFiltData',
    'repoStatus',
    'repoActions',
  ],
  template: `
<div
  :class="['mdm-git-gui-history-record','history-record','history-record-compact','mdm-ui-record',...(isHEAD?['history-record-HEAD']:[]),...(componentRecordsFiltData?.cssClasses||[])]"
  :key="hash"
  :data-recordsfilter-hash="hash"
  :data-recordsfilter-author="author"
  :data-recordsfilter-timestamp="timestamp"
  :data-recordsfilter-message="message"
>
  <span :class="['viewfiles','mdm-ui-record-col-viewfiles','mdm-ui-record-col-1',...(isWorktree||isIndex?['no-link']:[])]" title="View files">
    <a v-if="!isWorktree&&!isIndex" href="#!" @click.prevent="navigateFilesListPage" class="view-files-button">{}</a>
  </span>
  <span class="hash mdm-ui-record-col-hash mdm-ui-record-col-2" title="Hash">
    <hash-worktree v-if="isWorktree" />
    <hash-index v-else-if="isIndex" />
  </span>
  <span class="message mdm-ui-record-col-message mdm-ui-record-col-3" title="Version description">
    <div v-if="isHEAD" class="note">Current HEAD<span class="footnote"> (new history will continue from here)</span></div>
    <div v-if="isWorktree" class="note">Your local files in the working tree<span class="footnote"><br />Please stage your changes first if you want to select them for comparison because Git does not include untracked files in diffs.</span></div>
    <div v-if="isIndex" class="note">Temporary staging area for changes you added with \`<code>git add</code>\`; these changes will be captured in your next commit.<span class="footnote"></span></div>
    <span class="label">Version description: </span>
    <message :message="message" />
  </span>
  <span class="timestamp mdm-ui-record-col-timestamp mdm-ui-record-col-4" title="Date/time when saved/commited">
    <span class="label">Saved/Commited on: </span>
    <date :timestamp="timestamp" />
  </span>
</div>
`,
  components: {
    'hash-worktree': HashLocal,
    'hash-index': HashStaged,
    'date': Date,
    'message': Message,
    'form-compare-vers-controls': FormCompareVersionsControls,
  },
  setup(props) {

    const isHEAD = ref(props.repoStatus.HEAD&&(props.repoStatus.HEAD==props.hash));
    const isWorktree = ref(props.hash==='worktree');
    const isIndex = ref(props.hash==='index');

    const navigateFilesListPage = async () => {
      try {
        await props.repoActions.createPage(h(PageFilesList,{...props,hash:props.hash}));
      } catch(e) {
        if( e instanceof Error ) {
          props.repoActions.logError(e);
          props.repoActions.logError(`Failed to navigate to page: history-files-list/${props?.hash}`);
          throw e;
        }
      }
    };

    return {
      navigateFilesListPage,
      isHEAD,
      isWorktree,
      isIndex,
    };
  },
};

export default Record;
