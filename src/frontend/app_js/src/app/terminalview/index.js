

import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';

import TerminalSubmitForm from './component_form';
import TerminalRecord from './component_record';

import './styles.css';










const TerminalSessionView = {
  props: [
    'commands',
    'repoActions',
  ],
  template: `
<component-section-rollup header="Commands View" :condensed="false">
  <div class="mdm-git-gui-terminal">
    <terminal-submit-form
      :repoActions="repoActions"
    />
    <div class="terminal-records mdm-ui-records" ref="commandsEl" @scroll="onScroll">
      <terminal-record
        v-for="cmd in commandsGrouped"
        :key="cmd.id"
        :id="cmd.id"
        :timestamp="cmd.timestamp"
        :payload="cmd.payload"
        :stdout="cmd.stdout"
        :stderr="cmd.stderr"
        :exit_code="cmd.exit_code"
        :is_binary="cmd.is_binary"
        :is_interactive="cmd.is_interactive"
        :source="cmd.source"
        :type="cmd.type"
        :level="cmd.level"
      />
    </div>
  </div>
</component-section-rollup>
  `,
  components: {
    'terminal-record': TerminalRecord,
    'terminal-submit-form': TerminalSubmitForm,
  },
  setup(props) {
    const commandsEl = ref(null);
    let wasAtBottom = true;

    const commandsGrouped = computed(() => {
      const items = props.commands.map(record=>({...record,parent:record?.source?.id}));
      const byId = new Map(items.map(item => [item.id, item]));
      const result = [];
      // Keeps track of items we've already emitted.
      const emitted = new Set();
      // Used only for circular dependency detection.
      const visiting = new Set();
      function addItem(item, level) {
        if (emitted.has(item.id)) {
          return;
        }
        // Detect circular dependencies.
        if (visiting.has(item.id)) {
          throw new Error(`Circular parent dependency involving "${item.id}"`);
        }
        visiting.add(item.id);
        result.push({
          ...item,
          level
        });
        emitted.add(item.id);
        // Find children in their ORIGINAL source order.
        // Because we iterate over `items`, their relative order is preserved.
        for (const child of items) {
          if (child.parent === item.id) {
            addItem(child, level + 1);
          }
        }
        visiting.delete(item.id);
      }
      // First process root items in source order.
      for (const item of items) {
        if (item.parent == null) {
          addItem(item, 0);
        }
      }
      // Anything left over either references a missing parent
      // or is part of a cycle.
      for (const item of items) {
        if (!emitted.has(item.id)) {
          if (!byId.has(item.parent)) {
            throw new Error(
              `Item "${item.id}" references missing parent "${item.parent}"`
            );
          }
          // If we get here, the remaining items are presumably a cycle.
          throw new Error(
            `Circular or otherwise unresolved parent dependency involving "${item.id}"`
          );
        }
      }
      return result;
    });

    function isAtBottom(el, threshold = 30) {
      return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    }

    function scrollToBottom() {
      const el = commandsEl.value;
      if (el && wasAtBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }

    watch(
      () => props.commands,
      async () => {
        const el = commandsEl.value;
        if (!el) return;

        await nextTick();

        if (wasAtBottom) {
          el.scrollTop = el.scrollHeight;
        }
      },
      { deep: true }
    );

    function onScroll() {
      const el = commandsEl.value;
      if (el) {
        wasAtBottom = isAtBottom(el);
      }
    }

    function onResize() {
      scrollToBottom();
    }

    onMounted(() => {
      window.addEventListener('resize', onResize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', onResize);
    });

    return { onScroll, commandsEl, commandsGrouped };
  }
}

export default TerminalSessionView;
