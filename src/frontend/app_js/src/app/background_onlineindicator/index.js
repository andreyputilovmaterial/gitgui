

import './styles.css';


const Monitor = {
  props: [
    'isOnline',
    'repoStatus',
    'repoActions',
  ],
  template: `
<div
:class="{
  'mdm-ui-isonline-monitor': true,
  'online': !!isOnline && !repoStatus?.isOnlineData?.configPathsMismatch
}"
>
  <div class="description" v-if="!isOnline">
    Backend is offline or not responding, please check if python script is still running...
  </div>
  <div
    class="config-paths-mismatch-failure error"
    style="color: #990000;"
    v-if="!!repoStatus?.isOnlineData?.configPathsMismatch"
  >
    <span class="desc-line">
      Configuration paths have changed. Launched at <code>{{ host }}</code> with different paths:</span>
      <br />
      <br /> working tree: <code>{{ repoStatus?.config?.working_tree }}</code>
      <br />
      <div v-if="!(repoStatus?.config.working_tree==repoStatus?.isOnlineData?.configPathsFirstCaptured?.working_tree)">
          Launched with working tree: <code>{{ repoStatus?.isOnlineData?.configPathsFirstCaptured?.working_tree }}</code>
      </div>
      git dir: <code>{{ repoStatus?.config.git_directory }}</code>
      <br />
      <div v-if="!(repoStatus?.config.git_directory==repoStatus?.isOnlineData?.configPathsFirstCaptured?.git_directory)">Launched with git dir: <code>{{ repoStatus?.isOnlineData?.configPathsFirstCaptured?.git_directory }}</code></div>
    <span class="suggest-line">
      <br />
      <br />
      Please <a href="" onclick="window.location.reload(); return false;" class="mdm-link-inline-btn">reload the page</a>
    </span>
  </div>
</div>
`,
  setup() {
    const host = window.location.host
    return { host };
  }
}

export default Monitor;
