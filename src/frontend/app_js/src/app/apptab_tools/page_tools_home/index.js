import { h, ref } from 'vue';

import PageToolSearchInHistory from '@/app/page_tool_search_in_history/index.js';

import './style.css';

// The Tools tab is a grab-bag: every entry below is one random idea, shown as a
// section on this page. To add a new idea, import its page component and push
// one more entry — nothing else needs to change.
const TOOLS = [
  {
    id: 'search-in-history',
    title: 'Search in history',
    description: 'Find saved revisions by hash, author or commit message.',
    component: PageToolSearchInHistory,
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
  setup(props) {
    const tools = TOOLS;
    const error = ref('');

    const openTool = async (tool) => {
      try {
        error.value = '';
        await props.repoActions.createPage(h(tool.component, {
          repoStatus: props.repoStatus,
          repoActions: props.repoActions,
        }));
      } catch (e) {
        if (e instanceof Error) {
          error.value = e;
          props.repoActions.logError(`Failed to open tool "${tool.title}": ${e}`);
          throw e;
        }
        // Non-Error rejection = the tool page was closed via its Back button (cancel).
      }
    };

    return { tools, error, openTool };
  },
};

export default View;
