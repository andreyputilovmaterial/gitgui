

import GroupingIndicatorIcon from './component_grouping_indicator_icon';

import './styles.css';


const TerminalRecord = {
  props: [
    'timestamp',
    'payload',
    'stdout',
    'stderr',
    'exit_code',
    'is_binary',
    'is_interactive',
    'source',
    'type',
    'level',
  ],
  template: `
    <div :class="\`terminal-record mdm-ui-record mdm-ui-terminal-record terminal-record-status-\${type} \${'terminal-record-mode-'+(is_binary?'binary':'text')} \${'terminal-record-mode-'+(is_interactive?'interactive':'sync')}\`">
      <span class="grouping-indicator mdm-ui-record-col-1"><grouping-indicator :level="level" /></span>
      <span class="timestamp mdm-ui-record-col-2"><component-format-datetime :dt="timestamp" /></span>
      <span class="status mdm-ui-record-col-3">{{ type }}</span>
      <span :class="\`exit_code mdm-ui-record-col-4 exit_code-status-\${(!!exit_code || (exit_code===0)?(String(exit_code)===String('0')?'success':'nonzero'):'')}\`" title="exit_code - %errorlevel%"><span class="label" v-if="!!exit_code || (exit_code===0)">exit_code: </span>{{ exit_code }}</span>
      <code :class="\`message mdm-ui-record-col-5 \${'message-'+(is_binary?'binary':'text')}\`"><template :key="'stdout'" v-if="!!stdout && (typeof stdout==='object') && !!stdout.isInProgress &&!!stdout.isInProgress()"><component-loader-inprogress :key="'stdout'" /></template><template v-else><template v-if="is_binary && (type!=='input')">[ binary data ] </template>{{ stdout }}</template><div class="err error">{{ stderr }}</div></code>
    </div>
  `,
  components: {
    'grouping-indicator': GroupingIndicatorIcon,
  },
  setup() {
    return {}
  }
};

export default TerminalRecord;
