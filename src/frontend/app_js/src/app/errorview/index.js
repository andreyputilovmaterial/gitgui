


const ErrorRecord = {
  props: ['error','time',],
  template: `
<div
  :class="{
    'mdm-ui-error-record': true,
    'mdm-ui-record': true,
    'error': true,
  }"
>
  <span class="timestamp mdm-ui-record-col-1"><component-format-datetime :dt="time" /></span>
  <span class="label mdm-ui-record-col-2">Error:</span>
  <span class="errorbody error mdm-ui-record-col-3" style="color: #990000;">{{ error }}</span>
</div>
`,
  setup() {},
}

const ErrorView = {
  props: ['errors'],
  template: `
<div
  :class="{
    'error-banner': true,
    'mdm-ui-records': true,
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

export default ErrorView;
