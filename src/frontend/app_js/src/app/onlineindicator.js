

import './onlineindicator.css';


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
    <span class="desc-line">Fatal: configuration paths have changed. Launched at <code>{{ host }}</code> with different paths:</span><br /><br />
    work tree: <code>{{ config.dir_work_tree }}</code><br />
    <div v-if="!(config.dir_work_tree==configPathsFirstCaptured.dir_work_tree)">Launched with work tree: <code>{{ configPathsFirstCaptured.dir_work_tree }}</code></div>
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
