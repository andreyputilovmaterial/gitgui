import { ref } from 'vue';
import { useRouter } from 'vue-router';

import './style.css';

// The Tools tab is a grab-bag: every entry below is one random idea, shown as a
// section on this page. To add a new idea, register a route in router.js (name
// `tools-<id>`) and push one entry here with that `routeName` — nothing else.
const TOOLS = [
  {
    id: 'test-input-types',
    title: 'Test input types',
    description: 'All input types this app defines or uses (text, regex, ranges, checkboxes, radios, …) with a live echo.',
    routeName: 'tools-test-input-types',
  },
  {
    id: 'test-backend-jobs',
    title: 'Test backend jobs',
    description: 'Run every backend job type: text, binary, interactive, pipes, function jobs and textconv.',
    routeName: 'tools-test-backend-jobs',
  },
];

const View = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-tools-home mdm-git-gui-page-tools-home">
  <p class="description">A grab-bag of extra tools and experiments. Pick a section below to open it.</p>
  <div class="error">{{ error }}</div>
  <div class="mdm-git-gui-tools-home-sections">
    <section v-for="tool in tools" :key="tool.id" class="mdm-git-gui-tools-home-section">
      <h2 class="title">{{ tool.title }}</h2>
      <p class="desc">{{ tool.description }}</p>
      <button type="button" class="mdm-btn mdm-btn-primary" @click="openTool(tool)">Open</button>
    </section>
  </div>
</div>
`,
  setup() {
    const router = useRouter();
    const tools = TOOLS;
    const error = ref('');

    const openTool = (tool) => {
      router.push({ name: tool.routeName });
    };

    return { tools, error, openTool };
  },
};

export default View;
