
const Monitor = {
  props: [
    'isonline',
    'config',
    'repoCallbacks',
  ],
  template: `
<div
:class="{
  'mdm-ui-isonline-monitor': true,
  'online': !!isonline
}"
><div class="description">Backend is offline, please check if python script is still running...</div></div>
`,
  setup() {
    return {};
  }
}

export default Monitor;
