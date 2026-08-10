
import { formatDate } from '../common_defs/functions';


const ErrorRecord = {
  props: ['error','time',],
  template: `
<div
  :class="{
    'mdm-ui-error-record': true,
    'error': true,
  }"
>
  <span class="timestamp">{{ formatDate(time) }}</span>
  <span class="label">Error:</span>
  <span class="errorbody error" style="color: #990000;">{{ error }}</span>
</div>
`,
  setup() { return { formatDate } },
}

export const ErrorView = {
  props: ['errors'],
  template: `
<div
  :class="{
    'error-banner': true,
    'error': true,
    'error-banner-nonempty': errors.length>0,
  }"
  id="error_banner">
<errorrecord
  v-for="err in errors"
  :error="err.error"
  :time="err.time"
  :key="err.ed"
>
</errorrecord>
</div>
`,
  components: {
    'errorrecord': ErrorRecord,
  },
  setup() {return {}},
}
