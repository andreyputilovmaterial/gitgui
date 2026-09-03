
import { computed } from 'vue';

import './style_grouping_indicator.css';

const GroupingIndicatorIcon = {
  props: [
    'level',
  ],
  template: `
<div
  class="mdm-ui-grouping-indicator-outer"
  :style="{ '--grouping-indent': indent }"
>
  <div
    :class="[ 'grouping-indicator-inner', 'grouping-indicator-level-'+level, ]"
  />
</div>
`,
  setup(props) {
    const indent = computed(() => `${Math.max(props.level-1,0) * 6}px`);
    return {
      indent,
    };
  },
};

export default GroupingIndicatorIcon;
