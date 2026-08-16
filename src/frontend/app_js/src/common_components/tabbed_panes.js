import { computed, useSlots, ref } from 'vue';

import './tabbed_panes.css';

const TabbedPanes = {
  props: [
    'active',
  ],
  template: `
    <div class="mdm-ui-tabbed-panes">
      <div class="mdm-ui-tabbed-panes-head">
        <div
          v-for="pane in panes"
          :key="pane.props?.id"
          :data-pane-id="pane.props?.id"
          :class="{
            'mdm-ui-tabbed-panes-button': true,
            active: pane.props?.id === active
          }"
          @click.prevent="active=pane.props?.id"
        >
          {{ pane.props?.title }}
        </div>
      </div>
      <div class="mdm-ui-tabbed-panes-inner">
        <template v-for="pane in panes" :key="pane.props?.id">
          <div v-if="pane.props?.id==active" :key="pane.props?.id" :data-pane-id="pane.props?.id">
            <component :is="pane" :key="pane.props?.id" />
          </div>
        </template>
      </div>
    </div>
  `,

  setup(props) {
    const slots = useSlots();
    const panes = computed(() => slots.default?.() ?? []);
    // to access: pane.props.id

    // For duplicate IDs, I'd generally treat that as a developer error rather than trying to recover from it:
    const ids = panes.value.map(pane => pane.props?.id);
    if (new Set(ids).size !== ids.length) {
      console.warn('TabbedPanes: pane names must be unique');
    };

    const active = ref(props.active);
    // If active is intended to be internal state, and the prop is merely the initial selection. Then don't use watch. That's a perfectly reasonable API. Active specifies the initial tab; after that, TabbedPanes manages the active tab itself.
    // watch(() => props.active, () => {
    //   active.value = props.active;
    // });

    // I'd validate it at the component boundary, especially because an invalid active value can otherwise leave the component in a weird state where no tab is selected.
    if (!panes.value.some(pane => pane.props?.id === active.value)) {
      active.value = panes[0]?.props?.id;
    };

    return { panes, active, };
  },
};

export default TabbedPanes;
