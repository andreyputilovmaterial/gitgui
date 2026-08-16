
import { ref, onMounted } from 'vue';

import logError from '../../error_logger/logError';

// import { genId } from './helpers';

import './styles.css';






const FormWrapper = {
  props: [
    'columns',
    'setComponentFilterRecordsClasses',
  ],
  template: `
<form :class="{'mdm-ui-recordsfilter': true}" @submit.prevent="handleSubmit">
  <div class="mdm-ui-recordsfilter-form mdmreport-banner mdmreport-controls">
    <div class="mdmreport-controls-group">
      <div v-for="col in Object.keys(columns)" :key="col">
        <label>{{ columns[col] }}:
          <input
            type="text"
            :value="formFields[col]"
            @input="handleChange(col, $event)"
            placeholder="Type to filter..."
          /></label>
      </div>
    </div>
  </div>
  <div class="mdm-ui-recordsfilter-content">
    <slot />
  </div>
</form>
`,
  setup(props) {

    // const thisId = ref(`mdm_ui_recordsfilter_${genId()}`);

    const validateColumns = cols => ((Object.keys(cols).filter(a=>!a||(/^\s*$/.test(a)))).length===0) && (new Set(Object.keys(cols)).size === Object.keys(cols).length) && ((Object.keys(cols).filter(a=>!(/^[a-z0-9_]+$/ig.test(a)))).length===0);
    if(!validateColumns(props.columns)) {
      logError('mdm-ui-recordsfilter component: failed to init: col ids are not allowed');
      throw new Error('mdm-ui-recordsfilter component: failed to init: col ids are not allowed');
    }

    const formFields = ref(Object.fromEntries(
      Object.entries(props.columns).map(([prop, _]) => [prop, ''])
    ));

    const handleChange = async (col,$event) => {
      try{
        const value = event.target.value;
        formFields.value[col] = value;
        const filteringCLassesCb = colValues => {
          const norm = v => `${v}`.toLowerCase();
          const shouldBeShown = colValues => {
            var result = true;
            Object.keys(props.columns).forEach(col=>{
              const value = formFields.value[col];
              if(!!value&&!(/^\s*$/.test(value))) {
                result = result && norm(colValues[col]).includes(norm(value));
              }
            });
            return result;
          };
          if( shouldBeShown(colValues) )
            return ['mdm-ui-recordsfilter-status-shown'];
          else
            return ['mdm-ui-recordsfilter-status-hidden'];
        };
        props.setComponentFilterRecordsClasses(filteringCLassesCb);
        // if(!!el.value) {
        //   function escapeCssString(value) {
        //     return String(value)
        //       .replace(/\\/g, '\\\\')
        //       .replace(/"/g, '\\"')
        //       .replace(/\n/g, '\\A ');
        //   }
        //   const selectorAll = Object.keys(props.columns).map(id=>`#${thisId} [data-recordsfilter-${id}]`).join(', ');
        //   const recordsEl = Array.from(el.value.querySelectorAll(selectorAll));
        // }
      } catch(e) {
        logError(e);
        logError('mdm-ui-recordsfilter component: failed when handling onChange');
        throw e;
      }
    };

    const handleSubmit = async () => {
      return undefined;
    };

    return {
      // thisId,
      handleSubmit,
      handleChange,
      formFields,
    };
  },
};

export default FormWrapper;
