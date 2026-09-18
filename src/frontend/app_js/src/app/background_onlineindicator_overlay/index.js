

import './styles.css';


const Monitor = {
  props: [
    'isonline',
    'config',
    'repoActions',
    'configPathsFirstCaptured',
    'configPathsMismatch',
  ],
  template: `
<div
:class="{
  'mdm-ui-isonline-monitor': true,
  'online': !!isonline && !configPathsMismatch
}"
>
  <div class="description" v-if="!isonline">Backend is offline or not responding, please check if python script is still running...</div>
  <div class="config-paths-mismatch-failure error" style="color: #990000;" v-if="!!configPathsMismatch">
    <span class="desc-line">Configuration paths have changed. Launched at <code>{{ host }}</code> with different paths:</span><br /><br />
    working tree: <code>{{ config.working_tree }}</code><br />
    <div v-if="!(config.working_tree==configPathsFirstCaptured.working_tree)">Launched with working tree: <code>{{ configPathsFirstCaptured.working_tree }}</code></div>
    git dir: <code>{{ config.git_directory }}</code><br />
    <div v-if="!(config.git_directory==configPathsFirstCaptured.git_directory)">Launched with git dir: <code>{{ configPathsFirstCaptured.git_directory }}</code></div>
    <span class="suggest-line"><br /><br />Please <a href="" onclick="window.location.reload(); return false;" class="mdm-link-inline-btn">reload the page</a></span>
  </div>
</div>
`,
  setup() {
    const host = window.location.host
    return { host };
  }
}

export default Monitor;
