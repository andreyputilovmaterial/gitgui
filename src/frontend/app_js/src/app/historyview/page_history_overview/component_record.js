
import { ref, h } from 'vue';

import logError from '../../../error_logger/logError';

import FormCompareVersionsControls from './component_ver_compare_radioboxes';

import PageFilesList from '../page_files_list/index';

import './style.css';



const Hash = {
  props: [ 'hash', ],
  template: `
<code><span class="hash-leading">{{ hashLeading }}</span><span class="hash-rest">{{ hashRest }}</span></code>
`,
  setup(props) {
    const hash = `${props.hash}`;
    const hashLeading = ref(hash.slice(0, 7));
    const hashRest = ref(hash.slice(7));
    return { hashLeading, hashRest };
  },
};
const HashLocal = {
  props: [],
  template: `
<code><span class="hash-leading">Worktree</span></code>
`,
  setup() {
    return {};
  },
};
const HashStaged = {
  props: [],
  template: `
<code><span class="hash-leading">Index</span></code>
`,
  setup() {
    return {};
  },
};

const Author = {
  props: [ 'author', ],
  template: `
{{ author }}
`,
  setup() {
    return {};
  },
};

const Date = {
  props: [ 'timestamp', ],
  template: `
<component-format-date :dt="timestamp" />
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
    'componentFilterRecordsGetClassesCb',
    'repoStatus',
    'repoCallbacks',
  ],
  template: `
<div :class="[...['history-record','mdm-ui-record'],...(isHEAD?['history-record-HEAD']:[]),...componentFilterRecordsGetClassesCb({'hash':hash,'message':'message','timestamp':timestamp,'author':author})]" :key="hash" :data-recordsfilter-hash="hash" :data-recordsfilter-author="author" :data-recordsfilter-timestamp="timestamp" :data-recordsfilter-message="message">
  <div v-if="!isWorktree" class="form-controls mdm-ui-record-col-formcontrols mdm-ui-record-col-1"><form-compare-vers-controls :formVerCompareFields="formVerCompareFields" :hash="hash" /></div><div v-else class="form-controls" />
  <span class="hash mdm-ui-record-col-hash mdm-ui-record-col-2" title="Hash">
    <span class="label">Hash: </span>
    <hash-worktree v-if="isWorktree" />
    <hash-index v-else-if="isIndex" />
    <hash v-else :hash="hash" />
    <a v-if="!isWorktree&&!isIndex" href="#!" @click.prevent="navigateFilesListPage" class="view-files-button"> (files)</a>
  </span>
  <span class="author mdm-ui-record-col-author mdm-ui-record-col-3" title="Author - username">
    <span class="label">Author - Username: </span>
    <author :author="author" />
  </span>
  <span class="timestamp mdm-ui-record-col-timestamp mdm-ui-record-col-4" title="Date/time when saved/commited">
    <span class="label">Saved/Commited on: </span>
    <date :timestamp="timestamp" />
  </span>
  <span class="message mdm-ui-record-col-message mdm-ui-record-col-5" title="Version description">
    <div v-if="isHEAD" class="note">Current HEAD<span class="footnote"> (new history will continue from here)</span></div>
    <div v-if="isWorktree" class="note">Your local files in the work-tree folder<span class="footnote"><br />Please stage your changes first if you want to select them for comparison because Git does not include untracked files in diffs.</span></div>
    <div v-if="isIndex" class="note">Temporary staging area for changes you added with \`<code>git add</code>\`; these changes will be captured in your next commit.<span class="footnote"></span></div>
    <span class="label">Version description: </span>
    <message :message="message" />
  </span>
</div>
`,
  components: {
    'hash': Hash,
    'hash-worktree': HashLocal,
    'hash-index': HashStaged,
    'author': Author,
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
        await props.repoCallbacks.createPage(h(PageFilesList,{...props,hash:props.hash}));
      } catch(e) {
        if( e instanceof Error ) {
          logError(e);
          logError(`Failed to navigate to page: history-files-list/${props?.hash}`);
          throw e;
        }
      }
    };

    return { navigateFilesListPage, isHEAD, isWorktree, isIndex };
  },
};

export default Record;
