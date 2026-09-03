

import './path_indicator.css';





export const FSPathStatus = Object.freeze({
  UNDEFINED: 'undefined', // ...still checking...
  OK: 'ok', // normally exists
  NOTFOUND: 'notfound', // does not exist
  ACCESSISSUES: 'accessissues', // looks existing but possibly with access issues
  REQUESTERROR: 'crashed_when_checking', // error happened while requesting
});


const PathStatus = {
  props: [ 'status' ],
  template: `<span :class="[
  'gitui-app-pathstatus',
  status,
]">
  <span :class="[
  'mark', status
  ]">
    <span v-if="status===FSPathStatus.UNDEFINED">⏳</span>
    <span v-else-if="status===FSPathStatus.OK">✔</span>
    <span v-else-if="status===FSPathStatus.NOTFOUND">⛔</span>
    <span v-else-if="status===FSPathStatus.REQUESTERROR">❓</span>
    <span v-else-if="status===FSPathStatus.ACCESSISSUES">❓</span>
    <span v-else>⚠️</span>
  </span>
  <span class="txt">
    <span v-if="status===FSPathStatus.UNDEFINED">checking if path exists...</span>
    <span v-else-if="status===FSPathStatus.OK">exists</span>
    <span v-else-if="status===FSPathStatus.NOTFOUND">not found</span>
    <span v-else-if="status===FSPathStatus.ACCESSISSUES">can't access</span>
    <span v-else>failed to check the path</span>
  </span>
</span>`,
  setup() {
    return { FSPathStatus };
  },
}

export default PathStatus;
