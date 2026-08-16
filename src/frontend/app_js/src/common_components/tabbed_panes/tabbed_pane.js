
import './styles.css';

// <tabbed-panes>
//   <tab-pane title="General">
//     <GeneralSettings />
//   </tab-pane>
//
//   <tab-pane title="Advanced">
//     <AdvancedSettings />
//   </tab-pane>
// </tabbed-panes>

const TabbedPane = {
  props: [
    'id',
    'title',
  ],
  template: `
<div class="mdm-ui-tabbed-pane">
  <slot></slot>
</div>
`,
  setup(props) {
    if(!props.id)
      throw new Error(`Tab pane component: no id`);
    return {}
  }
}

export default TabbedPane;
