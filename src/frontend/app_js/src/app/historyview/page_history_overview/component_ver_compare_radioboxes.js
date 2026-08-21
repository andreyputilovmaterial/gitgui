
import { ref } from 'vue';

import './style_ver_compare_form_controls.css';


const FormCompareVersionsControls = {
  props: [
    'formVerCompareFields',
    'hash',
  ],
  template: `
<div class="mdmreport-controls-group mdmreport-controls-group-nonegmargin"><fieldset class="mdmreport-controls">
  <label class="form-fields-compare-left" title="Select as Left for Compare">
    <input
      v-if="leftIsPossible"
      type="radio"
      v-model="formVerCompareFields.compareLeft"
      :value="hash"
      class=""
    />
    <span v-if="leftIsPossible" class="description">Left:</span>
  </label>
  <label class="form-fields-compare-right" title="Select as Right for Compare">
    <input
      v-if="rightIsPossible"
      type="radio"
      v-model="formVerCompareFields.compareRight"
      :value="hash"
      class=""
    />
    <span v-if="rightIsPossible" class="description">Right:</span>
  </label>
</fieldset></div>
`,
  setup(props) {
    const leftIsPossible = ref( ['worktree','index',].includes(props.hash) ? false : true );
    const rightIsPossible = ref( ['worktree',].includes(props.hash) ? false : true );
    return { leftIsPossible, rightIsPossible, };
  },
};

export default FormCompareVersionsControls;
