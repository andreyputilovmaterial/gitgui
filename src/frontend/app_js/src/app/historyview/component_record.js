
import { formatDate } from '../../common_defs/functions';

import './style.css';



const Record = {
  props: [
    'hash',
    'author',
    'message',
    'date',
  ],
  template: `
<div class="history-record" :key="hash">
  <code class="hash">{{ hash }}</code>
  <span class="author">{{ author }}</span>
  <span class="date">{{ formatDate(date) }}</span>
  <span class="message">{{ message }}</span>
</div>
`,

  setup() {
    return { formatDate };
  },
};

export default Record;
