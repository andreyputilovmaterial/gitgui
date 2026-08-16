

import './style_ver_compare_form_controls.css';


const FormCompareVersionsControls = {
  props: [
    'formVerCompareFields',
    'hash',
  ],
  template: `
<div class="mdmreport-controls-group"><fieldset class="mdmreport-controls">
  <label class="form-fields-compare-left"><input
    type="radio"
    v-model="formVerCompareFields.compareLeft"
    :value="hash"
    class=""
  /><span class="description">Left:</span></label>
  <label class="form-fields-compare-right"><input
      type="radio"
      v-model="formVerCompareFields.compareRight"
      :value="hash"
      class=""
    /><span class="description">Right:</span></label>
</fieldset></div>
`,
  setup() {
    return {};
  },
};

export default FormCompareVersionsControls;
