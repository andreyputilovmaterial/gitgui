

import GroupingIndicatorIcon from './component_grouping_indicator_icon';

import './styles.css';


const TerminalRecord = {
  props: [
    'timestamp',
    'payload',
    'message_stdout',
    'message_stderr',
    'returncode',
    'source',
    'type',
    'level',
  ],
  template: `
    <div :class="\`terminal-record mdm-ui-record mdm-ui-terminal-record terminal-record-status-\${type}\`">
      <span class="grouping-indicator mdm-ui-record-col-1"><grouping-indicator :level="level" /></span>
      <span class="timestamp mdm-ui-record-col-2"><component-format-datetime :dt="timestamp" /></span>
      <span class="status mdm-ui-record-col-3">{{ type }}</span>
      <span :class="\`returncode mdm-ui-record-col-4 returncode-status-\${(!!returncode || (returncode===0)?(String(returncode)===String('0')?'success':'nonzero'):'')}\`" title="returncode - %errorlevel%"><span class="label" v-if="!!returncode || (returncode===0)">returncode: </span>{{ returncode }}</span>
      <code class="message mdm-ui-record-col-5">{{ message_stdout }}<div class="err error">{{ message_stderr }}</div></code>
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
