
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

import FormCompareVersionsControls from './component_ver_compare_radioboxes.js';

import { recordsFilterClasses } from '@/common_components/filter_records_form/index.js';

import './style.css';



const Hash = {
  props: [ 'hash', ],
  template: `
<component-format-hash :hash="hash" :highlight="'auto'" />
`,
  setup() {
    return {};
  },
};
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
<component-format-datetime :dt="timestamp" />
`,
  setup() {
    return {};
  },
};

const Message = {
  props: [ 'message', ],
  template: `<div v-if="!!message && (\`\${message}\`.trim().length>0)" class="commit-message"><i class="ri-chat-quote-line commit-message-icon" aria-hidden="true"></i>{{ message }}</div>`,
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
  :class="['mdm-git-gui-history-record','history-record','mdm-ui-record',...(isHEAD?['history-record-HEAD']:[]),...recordsFilterClasses(componentRecordsFiltData)]"
  :key="hash"
  :data-recordsfilter-hash="hash"
  :data-recordsfilter-author="author"
  :data-recordsfilter-timestamp="timestamp"
  :data-recordsfilter-message="message"
>
  <div v-if="!isWorktree" class="form-controls mdm-ui-record-col-formcontrols mdm-ui-record-col-1"><form-compare-vers-controls :formVerCompareFields="formVerCompareFields" :hash="hash" /></div><div v-else class="form-controls" />
  <div class="history-record-card">
    <div class="history-record-card-main">
      <span
        class="hash"
        :class="{ 'hash-link': !isWorktree && !isIndex }"
        title="Hash"
        @click.prevent="handleHashClick"
      >
        <span class="label">Hash: </span>
        <i class="ri-git-commit-line hash-icon" aria-hidden="true"></i>
        <hash-worktree v-if="isWorktree" />
        <hash-index v-else-if="isIndex" />
        <hash v-else :hash="hash" />
      </span>
      <div v-if="isHEAD" class="note">Current HEAD<span class="footnote"> (new history will continue from here)</span></div>
      <div v-if="isWorktree" class="note">Your local files in the working tree<span class="footnote"><br />Please stage your changes first if you want to select them for comparison because Git does not include untracked files in diffs.</span></div>
      <div v-if="isIndex" class="note">Temporary staging area for changes you added with \`<code>git add</code>\`; these changes will be captured in your next commit.<span class="footnote"></span></div>
      <span v-if="hasMessage" class="message" title="Version description">
        <message :message="message" />
      </span>
    </div>
    <div v-if="!isWorktree && !isIndex" class="history-record-card-meta">
      <i class="ri-time-line" aria-hidden="true"></i>
      <date :timestamp="timestamp" />
      <i v-if="author" class="ri-quill-pen-line meta-author-icon" aria-hidden="true"></i>
      <author v-if="author" :author="author" />
    </div>
  </div>
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

    const router = useRouter();
    const isHEAD = computed(()=>props.repoStatus?.historyData?.head && (props.repoStatus?.historyData?.head==props.hash));
    const isWorktree = ref(props.hash==='worktree');
    const isIndex = ref(props.hash==='index');
    const hasMessage = computed(()=> !!props.message && `${props.message}`.trim().length>0);

    const navigateFilesListPage = () => {
      router.push({ name: 'history-revision-files', params: { hash: props.hash } });
    };

    const handleHashClick = () => {
      if (isWorktree.value || isIndex.value) return;
      navigateFilesListPage();
    };

    return {
      handleHashClick,
      hasMessage,
      isHEAD,
      isWorktree,
      isIndex,
      recordsFilterClasses,
    };
  },
};

export default Record;
