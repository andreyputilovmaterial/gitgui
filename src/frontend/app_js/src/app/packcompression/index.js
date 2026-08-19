
import { ref, reactive, watch, computed, onMounted, toRaw } from 'vue';

const View = {
  props: [
    'repoStatus', 'repoCallbacks',
  ],
  template: `
  Hello, pack compression status here...
`,
  setup(props) {

    onMounted(async () => {
      await Promise.all([
        props.repoCallbacks.triggerGoodTimeGitGC(),
        props.repoCallbacks.updateHistory(),
      ])
    });

    watch(() => props?.repoStatus?.history, () => {
      console.log('[DEBUG-history]: new history:',toRaw(props?.repoStatus?.history));
    });

    return {};
  },
};

export default View;
