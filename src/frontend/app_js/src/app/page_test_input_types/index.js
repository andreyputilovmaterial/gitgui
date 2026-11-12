
import { reactive, computed } from 'vue';

import './style.css';

// Test page: every input type this app defines or uses, rendered together so
// each control can be exercised in isolation. The "Live values" echo below
// always shows the current model for every field, so a control can be verified
// just by watching the echo change.
const View = {
  props: [
    'repoStatus',
    'repoActions',
  ],
  template: `
<div class="mdm-git-gui-test-inputs mdm-git-gui-page-test-inputs">
  <p class="description">All the input types this app defines or uses, in one place. Change any value and watch the live echo below.</p>

  <form class="mdmreport-controls" @submit.prevent>
    <div class="mdmreport-controls-group">
      <label for="test-inputs-plain-text">Plain text:</label>
      <input id="test-inputs-plain-text" v-model="fields.plainText" class="mdmreport-control" type="text" placeholder="free text…" />
    </div>

    <div class="mdmreport-controls-group">
      <label for="test-inputs-search">Search:</label>
      <input id="test-inputs-search" v-model="fields.search" class="mdmreport-control" type="search" placeholder="search…" />
    </div>

    <div class="mdmreport-controls-group">
      <label for="test-inputs-number">Number:</label>
      <input id="test-inputs-number" v-model.number="fields.number" class="mdmreport-control" type="number" />
    </div>

    <div class="mdmreport-controls-group">
      <label for="test-inputs-date">Date:</label>
      <input id="test-inputs-date" v-model="fields.date" class="mdmreport-control" type="date" />
    </div>

    <div class="mdmreport-controls-group">
      <label for="test-inputs-textarea">Textarea:</label>
      <textarea id="test-inputs-textarea" v-model="fields.textarea" class="mdmreport-control" rows="4"></textarea>
    </div>

    <div class="mdmreport-controls-group">
      <label for="test-inputs-select">Select:</label>
      <select id="test-inputs-select" v-model="fields.select" class="mdmreport-control">
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
        <option value="cherry">Cherry</option>
      </select>
    </div>

    <div class="mdmreport-controls-group">
      <label for="test-inputs-regex">Regex text:</label>
      <component-input-regextext id="test-inputs-regex" v-model="fields.regexText" class="mdmreport-control" placeholder="text or /regex/" />
    </div>

    <div class="mdmreport-controls-group">
      <label for="test-inputs-numericrange">Numeric range:</label>
      <component-input-numericrange id="test-inputs-numericrange" v-model="fields.numericRange" class="mdmreport-control" />
    </div>

    <div class="mdmreport-controls-group">
      <label for="test-inputs-datetimerange">Datetime range:</label>
      <component-input-datetimerange id="test-inputs-datetimerange" v-model="fields.datetimeRange" class="mdmreport-control" />
    </div>

    <fieldset class="mdmreport-controls mdm-git-gui-test-inputs-checks">
      <legend>Checkboxes</legend>
      <label><input type="checkbox" value="one" v-model="fields.checkboxes" /> One</label>
      <label><input type="checkbox" value="two" v-model="fields.checkboxes" /> Two</label>
      <label><input type="checkbox" value="three" v-model="fields.checkboxes" /> Three</label>
    </fieldset>

    <fieldset class="mdmreport-controls mdm-git-gui-test-inputs-radios">
      <legend>Radio buttons</legend>
      <label><input type="radio" value="left" v-model="fields.radio" /> Left</label>
      <label><input type="radio" value="right" v-model="fields.radio" /> Right</label>
      <label><input type="radio" value="none" v-model="fields.radio" /> None</label>
    </fieldset>
  </form>

  <h2 class="echo-title">Live values</h2>
  <pre class="echo">{{ echo }}</pre>
</div>
`,
  setup() {
    const fields = reactive({
      plainText: '',
      search: '',
      number: 0,
      date: '',
      textarea: '',
      select: 'apple',
      regexText: { text: '', regex: false },
      numericRange: { from: null, to: null },
      datetimeRange: { from: null, to: null },
      checkboxes: [],
      radio: 'none',
    });

    const echo = computed(() => JSON.stringify(fields, null, 2));

    return { fields, echo };
  },
};

export default View;
