
import { ref, onMounted } from 'vue';

import './style.css';








const View = {
  props: [
    'resourcepath',
    'contentAsText',
    'repoStatus',
    'repoActions',
    'resolve','reject', /* could both be called to close this window - parent will destroy the component once called */
  ],
  template: `
<div class="mdm-git-gui-fileview">
  <form  @submit.prevent="resolve">
    <fieldset class="mdmreport-controls">
      <h2><template v-if="resourcepathRevisionPart">View file <span class="resource resource-filepath">{{ resourcepathFilepathPart }}</span> from revision <span class="resource resource-revision">{{ resourcepathRevisionPart }}</span></template><template v-else>View file <span class="resource resource-resourcepath">{{ resourcepath }}</span></template></h2>
      <div class="error">{{ error }}</div>
      <textarea readonly disabled class="mdm-git-gui-filecontents">{{ contentAsText }}</textarea>
      <div><input type="submit" value="Close" class="gitgui-button-close"></input></div>
    </fieldset>
  </form>
</div>
`,
  components: {
  },
  setup(props) {

    const error = ref('');
    const isPathWithRevision = v => /^(\w+):(.*)/.test(`${v}`);
    const resourcepathRevisionPart = ref( isPathWithRevision(props.resourcepath) ? `${props.resourcepath}`.replace(/^(\w+):(.*)$/,'$1') : null );
    const resourcepathFilepathPart = ref( isPathWithRevision(props.resourcepath) ? `${props.resourcepath}`.replace(/^(\w+):(.*)$/,'$2') : props.resourcepath );

    onMounted(async () => {
      await Promise.all([
        // getFilesList(),
      ])
    });

    return {
      error,
      resourcepathRevisionPart,
      resourcepathFilepathPart,
      isPathWithRevision,
    };
  },
};

export default View;
