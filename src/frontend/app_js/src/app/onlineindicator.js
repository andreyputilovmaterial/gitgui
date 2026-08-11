

import './onlineindicator.css';


const Monitor = {
  props: [
    'isonline',
    'config',
    'repoCallbacks',
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
  <div class="description" v-if="!isonline">Backend is offline, please check if python script is still running...</div>
  <div class="config-paths-mismatch-failure error" style="color: #990000;" v-if="!!configPathsMismatch">
    <span class="desc-line">Fatal: configuration paths do not match to what was captured when this instance at <code>{{ host }}</code> was launched:</span><br /><br />
    working tree: <code>{{ config.dir_working_tree }}</code><br />
    <div v-if="!(config.dir_working_tree==configPathsFirstCaptured.dir_working_tree)">Launched with working tree: <code>{{ configPathsFirstCaptured.dir_working_tree }}</code></div>
    git dir: <code>{{ config.dir_git_repo }}</code><br />
    <div v-if="!(config.dir_git_repo==configPathsFirstCaptured.dir_git_repo)">Launched with git dir: <code>{{ configPathsFirstCaptured.dir_git_repo }}</code></div>
    <span class="suggest-line"><br /><br />Please reload the page</span>
  </div>
</div>
`,
  setup() {
    const host = window.location.host
    return { host };
  }
}

export default Monitor;
