

import './style_ver_compare_form_controls.css';


const FormCompareVersionsControls = {
  props: [
    'formVerCompareFields',
    'hash',
  ],
  template: `
<div class="mdmreport-controls-group mdmreport-controls-group-nonegmargin"><fieldset class="mdmreport-controls">
  <label class="form-fields-compare-left" title="Select as Left for Compare"><input
    type="radio"
    v-model="formVerCompareFields.compareLeft"
    :value="hash"
    class=""
  /><span class="description">Left:</span></label>
  <label class="form-fields-compare-right" title="Select as Right for Compare"><input
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
