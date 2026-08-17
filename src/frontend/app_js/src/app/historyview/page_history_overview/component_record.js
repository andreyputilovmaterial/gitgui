
import { ref, h } from 'vue';

import { formatDate } from '../../../common_defs/functions';
import logError from '../../../error_logger/logError';

import FormCompareVersionsControls from './component_ver_compare_radioboxes';

import PageFilesList from '../page_files_list/index';

import './style.css';



const Hash = {
  props: [ 'hash', ],
  template: `<code><span class="hash-leading">{{ hashLeading }}</span><span class="hash-rest">{{ hashRest }}</span></code>`,
  setup(props) {
    const hash = `${props.hash}`;
    const hashLeading = ref(hash.slice(0, 7));
    const hashRest = ref(hash.slice(7));
    return { hashLeading, hashRest };
  },
};

const Author = {
  props: [ 'author', ],
  template: `{{ author }}`,
  setup() {
    return {};
  },
};

const Date = {
  props: [ 'timestamp', ],
  template: `{{ formatDate(timestamp) }}`,
  setup() {
    return { formatDate };
  },
};

const Message = {
  props: [ 'message', ],
  template: `<div class="message-box">{{ message }}</div>`,
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
<div :class="[...['history-record','mdm-ui-record'],...componentFilterRecordsGetClassesCb({'hash':hash,'message':'message','timestamp':timestamp,'author':author})]" :key="hash" :data-recordsfilter-hash="hash" :data-recordsfilter-author="author" :data-recordsfilter-timestamp="timestamp" :data-recordsfilter-message="message">
  <div class="form-controls mdm-ui-record-col-formcontrols mdm-ui-record-col-1"><form-compare-vers-controls :formVerCompareFields="formVerCompareFields" :hash="hash" /></div>
  <span class="hash mdm-ui-record-col-hash mdm-ui-record-col-2" title="Hash"><span class="label">Hash: </span><hash :hash="hash" /> <a href="#!" @click.prevent="navigateFilesListPage" class="view-files-button">(files)</a></span>
  <span class="author mdm-ui-record-col-author mdm-ui-record-col-3" title="Author - username"><span class="label">Author - Username: </span><author :author="author" /></span>
  <span class="timestamp mdm-ui-record-col-timestamp mdm-ui-record-col-4" title="Date/time when saved/commited"><span class="label">Saved/Commited on: </span><date :timestamp="timestamp" /></span>
  <span class="message mdm-ui-record-col-message mdm-ui-record-col-5" title="Version description"><span class="label">Version description: </span><message :message="message" /></span>
</div>
`,
  components: {
    'hash': Hash,
    'author': Author,
    'date': Date,
    'message': Message,
    'form-compare-vers-controls': FormCompareVersionsControls,
  },
  setup(props) {

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

    return { navigateFilesListPage };
  },
};

export default Record;
