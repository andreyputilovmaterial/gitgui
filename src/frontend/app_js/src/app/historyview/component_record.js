
import { ref } from 'vue';

import { formatDate } from '../../common_defs/functions';

import './style.css';



const Hash = {
  props: [ 'hash', ],
  template: `<code><span class="hash-leading">{{ hashLeading }}</span><span class="hash-rest">{{ hashRest }}</span></code>`,
  setup(props) {
    const hash = `${props.hash}`;
    const hashLeading = ref(hash.slice(0, 7));
    const hashRest = ref(hash.slice(7));
    return { hashLeading, hashRest};
  },
};


const Record = {
  props: [
    'hash',
    'author',
    'message',
    'date',
  ],
  template: `
<div class="history-record mdm-ui-record" :key="hash">
  <span class="hash mdm-ui-record-col-1" title="Hash"><span class="label">Hash: </span><hash :hash="hash" /> <a href="#!" @click.prevent="() => {}" class="view-files-button">(files)</a></span>
  <span class="author mdm-ui-record-col-2" title="Author - username"><span class="label">Author - Username: </span>{{ author }}</span>
  <span class="timestamp mdm-ui-record-col-3" title="Date/time when saved/commited"><span class="label">Saved/Commited on: </span>{{ formatDate(date) }}</span>
  <span class="message mdm-ui-record-col-4" title="Version description"><span class="label">Version description: </span>{{ message }}</span>
</div>
`,
  components: {
    'hash': Hash,
  },
  setup() {
    return { formatDate };
  },
};

export default Record;
