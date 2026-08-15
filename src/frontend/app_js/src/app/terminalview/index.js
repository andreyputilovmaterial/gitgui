

import { ref, reactive } from 'vue';


import { formatDate } from '../../common_defs/functions';


import './styles.css';


export function parseCommand(txt) {
  try{
    function tokenize(text) {
      const tokens = [];
      let current = "";
      let inQuote = false;
      let i = 0;
      while (i < text.length) {
        const char = text[i];
        // 1. Handle Escape Character
        if (char === '\\') {
          current += text[i] + text[i + 1] || ""; // Grab next char if it exists
          i += 2;                       // Skip both the backslash and the next char
          continue;
        }
        // 2. Handle Quotes
        if (char === '"' || char === "'") {
          if (inQuote && char === inQuote) {
            inQuote = false; // Closed matching quote
            current += char;
              tokens.push({ type: 'string', value: current });
            current = ''
            i++;
            continue;
          } else if (!inQuote) {
            inQuote = char;  // Opened quote, remember which one (' or ")
          }
          current += char;
          i++;
          continue;
        }
        // 3. Handle Spaces Outside Quotes
        if (!inQuote && char === ' ') {
          if (current) {
            tokens.push({ type: 'real', value: current });
            current = '';
          }
          tokens.push({ type: 'space', value: ' ' });
          i++;
          continue;
        }
        // 4. Handle Normal Characters
        current += char;
        i++;
      }
      // Push any remaining text left at the end
      if (current) {
        if(inQuote)
          throw new Error('unmatched quotes');
        tokens.push({ type: inQuote ? 'error' : 'real', value: current });
      }
      return tokens;
    }
    const extractStrContents = str => {
      try {
        if(str.length<2) throw new Error('String length is insufficient to have at least two quote chars');
        const quoteChar = str[0]
        if(!(['\'','"'].includes(quoteChar))) throw new Error('Last character in string is not a quote symbol');
        if(str[str.length-1]!=quoteChar) throw new Error('Closing quote does not match opening quote');
        let newStr = ''
        let curr = 1
        while(curr<str.length-1) {
          if((str[curr]=='\\')&&(str[curr+1]==quoteChar)) {
            if(curr>=str.length-2) throw new Error('Unmatched "\\"')
            newStr += quoteChar
            curr+=1
            continue
          }
          if(str[curr]=='\\') {
            if(curr>=str.length-2) throw new Error('Unmatched "\\"')
            newStr += str[curr] + str[curr+1]
            curr+=2
            continue
          }
          newStr += str[curr]
          curr++
        }
        return newStr
      } catch(e) {
        throw new Error(`Error parsing quoted string: ${e}`)
      }
    };
        const filter = token => {
      if(token.type=='real')
        return true;
      else if(token.type=='string')
        return true;
      else if(token.type=='space')
        return false;
      else if(token.type=='error')
        throw new Error('error token');
      else
        throw new Error('unrecgnized token type')
    }
    return tokenize(txt).filter(filter).map(a=>a.type=='string'?extractStrContents(a.value):a.value)
  } catch(e) {
    throw new Error(`Can't parse command string: ${e}`)
  }
}






const TerminalSubmitForm = {
  props: [
    'executeGitCommand',
  ],
  template: `
    <form  @submit.prevent="handleSubmit" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
      <fieldset class="mdmreport-controls">
        <div class="error">{{ formFields.validationError }}</div>
        <div class="mdmreport-controls-group">
          <label style="display: none;">COMMAND:  </label>
          <input type="text" name="command" value="" placeholder="git command: " v-model="formFields.command"></input>
          <input type="submit" value="Execute" class="submit"></input>
          <p class="hint"><small>Note: every command gets --git-dir path... --work-tree path... --no-pager params appended</small></p>
        </div>
      </fieldset>
    </form>
  `,
  setup(props) {
    // const { ref, reactive } = Vue


    const isBusy = ref(false)

    const formFields = reactive({
      command: '',
      validationError: '',
    })
     const handleSubmit = async () => {

       try {
         isBusy.value = true
         const command = parseCommand(formFields.command)
         const result = await props.executeGitCommand(command)
         formFields.command = ''
         formFields.validationError = ''

       } catch (error) {
         console.error("Form submission failed:", error)
         formFields.validationError = error

       } finally {
         isBusy.value = false
        //  formFields.command = ''
       }
     }

    return { formFields, handleSubmit, isBusy }
  }
}

const TerminalRecord = {
  props: [
    'timestamp',
    'payload',
    'message_stdout',
    'message_stderr',
    'returncode',
    'source',
    'type',
  ],
  template: `
    <div :class="\`terminal-record terminal-record-status-\${type}\`">
      <span class="timestamp">{{ formatDate(timestamp) }}</span>
      <span class="status">{{ type }}</span>
      <span :class="\`returncode returncode-status-\${String(returncode)==String('0')?'success':'nonzero'}\`" title="returncode - %errorlevel%">{{ returncode }}</span>
      <code class="message">{{ message_stdout }}<div class="err error">{{ message_stderr }}</div></code>
    </div>
  `,
  setup() {
    return { formatDate }
  }
}

const TerminalSessionView = {
  props: [
    'commands',
    'executeGitCommand',
  ],
  template: `
<component-section-rollup header="Commands View" :condensed="false">
  <div class="mdm-git-gui-terminal">
    <terminal-submit-form :executeGitCommand="executeGitCommand"></terminal-submit-form>
    <terminal-record
      v-for="cmd in commands"
      :timestamp="cmd.timestamp"
      :payload="cmd.payload"
      :message_stdout="cmd.message_stdout"
      :message_stderr="cmd.message_stderr"
      :returncode="cmd.returncode"
      :source="cmd.source"
      :type="cmd.type">
    </terminal-record>
  </div>
</component-section-rollup>
  `,
  components: {
    'terminal-record': TerminalRecord,
    'terminal-submit-form': TerminalSubmitForm,
  },
  setup() {
    return { }
  }
}

export default TerminalSessionView;
