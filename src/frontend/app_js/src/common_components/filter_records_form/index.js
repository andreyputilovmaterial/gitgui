
import { ref, computed, onMounted } from 'vue';

import logError from '../../error_logger/logError';

// import { genId } from './helpers';

import './styles.css';






const FormWrapper = {
  props: [
    'columns',
    'needSort',
  ],
  template: `
<form :class="{'mdm-ui-recordsfilter': true}" @submit.prevent="handleSubmit">
  <div class="mdm-ui-recordsfilter-form mdmreport-banner mdmreport-controls">
    <div class="mdmreport-controls-group">
      <div v-for="col in Object.keys(columnsSanitized)" :key="col">
        <label>{{ columnsSanitized[col].label }}:
          <input
            :type="columnsSanitized[col].type"
            :value="formFields.columns[col]"
            class="mdmreport-control"
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

    const columnsSanitized = computed(() => {
      const columns = {};
      for (const [key, value] of Object.entries(props.columns)) {
        columns[key] = (column => {
          if( typeof column==='object' )
            return { type: 'text', ...column, };
          else if( typeof column==='string' )
            return { type: 'text', label: column };
          else {
            const e = new Error(`filter-records component: columns property does not follow format (${column})`);
            logError('Failed to initialize filter-records component');
            logError(e);
            throw e;
          }
        })(value);
      }
      return columns;
    });

    const formFields = ref({
      columns: Object.fromEntries(
        Object.entries(columnsSanitized).map(([prop, _]) => [prop, ''])
      ),
      sortingColumn: null,
      sortingAscending: true,
    });

    const generateFileringCssClasses = ref(() => []);

    const sortComparator = (a,b) => {
      const type = a.type;
      if( !formFields.value.sortingColumn || !Object.keys(columnsSanitized).includes(formFields.value.sortingColumn) ) {
        const e = new Error(`mdm-ui-recordsfilter component: sort: impossible column ("${formFields.value.sortingColumn}")`);
        logError(e);
        throw e;
      }
      if( type==='text' ) {
        if( sortingAscending )
          return a[formFields.value.sortingColumn].localeCompare(b[formFields.value.sortingColumn]);
        else
          return b[formFields.value.sortingColumn].localeCompare(a[formFields.value.sortingColumn]);
      } else if( type==='number' ) {
        if( sortingAscending )
          return a[formFields.value.sortingColumn] - b[formFields.value.sortingColumn];
        else
          return b[formFields.value.sortingColumn] - a[formFields.value.sortingColumn];
      } else if( type==='datetime' ) {
        if( sortingAscending )
          return a[formFields.value.sortingColumn] - b[formFields.value.sortingColumn];
        else
          return b[formFields.value.sortingColumn] - a[formFields.value.sortingColumn];
      } else {
        if( sortingAscending )
          return `${a[formFields.value.sortingColumn]}`.localeCompare(`${b[formFields.value.sortingColumn]}`);
        else
          return `${b[formFields.value.sortingColumn]}`.localeCompare(`${a[formFields.value.sortingColumn]}`);
      }
    };
    // or ref(), not computed()? Anyway, passed columns are unlikely to change, so probably not a big difference
    const sort = computed(() => !props.needSort || !formFields.value.sortingColumn ? records => records : records => records.sort(sortComparator));

    const handleChange = async (col,$event) => {
      try{
        const value = event.target.value;
        formFields.value.columns[col] = value;

        const filteringClassesCb = colValues => {
          // console.log(`[DEBUG]: mdm-ui-recordsfilter component: generateFileringCssClasses called`); // TODO: debug
          const norm = v => `${v}`.toLowerCase();
          const shouldBeShown = (colValues) => {
            var result = true;
            Object.keys(columnsSanitized.value).forEach(col=>{
              const value = formFields.value.columns[col];
              if(!!value&&!(/^\s*$/.test(value))) {
                result = result && norm(colValues[col]).includes(norm(value));
              }
            });
            return result;
          };
          const assessment = shouldBeShown({...colValues});
          // console.log(`[DEBUG]: mdm-ui-recordsfilter component: generateFileringCssClasses: result is ready, that would be "${assessment}", with col == "${col}", value == "${value}", colValues == "${JSON.stringify(colValues)}"`); // TODO: debug
          if( assessment )
            return ['mdm-ui-recordsfilter-status-shown'];
          else
            return ['mdm-ui-recordsfilter-status-hidden'];
        };

        generateFileringCssClasses.value = filteringClassesCb;
        // console.log(`[DEBUG]: mdm-ui-recordsfilter component: generateFileringCssClasses updated`); // TODO: debug

      } catch(e) {
        logError(e);
        logError('mdm-ui-recordsfilter component: failed when handling onChange');
        throw e;
      }
    };

    const handleSubmit = () => undefined;

    return {
      // thisId,
      handleSubmit,
      handleChange,
      formFields,
      columnsSanitized,
      generateFileringCssClasses,
      sort,
    };
  },
};

export default FormWrapper;
