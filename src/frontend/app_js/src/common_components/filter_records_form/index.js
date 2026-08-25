
import { ref, computed, onMounted } from 'vue';

import logError from '../../error_logger/logError';

import matchText from './match/text';
import matchNumericRange from './match/numeric_range';

// import { genId } from './helpers';

import './styles.css';



const DEFAULT_RECORDS_PER_PAGE = 25;



const PageNav = {
  props: [
    'index',
    'active',
    'selectPage',
  ],
  template: `
<a :class="{'nav-page':true,'active':!!active}" href="#!" @click.prevent="selectPage">{{ index+1 }}</a>
`,
  setup() {
    return {};
  },
}




const FormWrapper = {
  props: [
    'columns',
    'records',
    'needSort',
    'recordsPerPage'
  ],
  template: `
<form :class="{'mdm-ui-recordsfilter': true,'mdm-ui-recordsfilter-filtering': true,}" @submit.prevent="handleSubmit">
  <div class="mdm-ui-recordsfilter-form mdmreport-banner mdmreport-controls">
    <div class="mdmreport-controls-group">
      <div v-for="col in Object.keys(columnsSanitized)" :key="col">
        <label>{{ columnsSanitized[col].label }}:
          <component
            :is="
              columnsSanitized[col].type === 'number'
              ? 'component-input-numericrange'
              : 'input'
            "
            v-bind="
              columnsSanitized[col].type === 'number'
              ? {}
              : { type: columnsSanitized[col].type }
            "
            :value="formFields.columns[col]"
            class="mdmreport-control"
            @input="handleChange(col, $event)"
            placeholder="Type to filter..."
          />
        </label>
      </div>
    </div>
  </div>
  <div class="mdm-ui-recordsfilter-pagination mdmreport-banner mdmreport-controls">
    Page: <span class="pagination-page-indices">
      <page-nav
        v-for="p in pagination"
        :key="p.index"
        :index="p.index"
        :active="p.active"
        :selectPage="()=>{ formFields.page = p.index }"
      />
    </span>
  </div>
  <div class="mdm-ui-recordsfilter-content">
    <slot />
  </div>
</form>
`,
  components: {
    'page-nav': PageNav,
  },
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

    const recordsPerPage = ref((()=>{
      if(props.recordsPerPage==0)
        return len(props.records);
      else if(props.recordsPerPage>0)
        return props.recordsPerPage|0;
      else
        return DEFAULT_RECORDS_PER_PAGE;
    })());

    const numPages = computed(()=>Math.ceil(props.records.length/recordsPerPage.value));

    const formFields = ref({
      columns: Object.entries(columnsSanitized.value).map(([prop, _]) => [prop, '']),
      sortingColumn: null,
      sortingAscending: true,
      page: 0,
    });

    const pagination = computed(()=>{
      const pages = [];
      for(let i=0;i<Number(numPages.value);++i) {
        pages.push({
          index: i,
          start: i*recordsPerPage.value,
          end: (i+1)*recordsPerPage.value,
          active: i==formFields.value.page,
        });
      }
      return pages;
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
        if( formFields.value.sortingAscending )
          return a[formFields.value.sortingColumn].localeCompare(b[formFields.value.sortingColumn]);
        else
          return b[formFields.value.sortingColumn].localeCompare(a[formFields.value.sortingColumn]);
      } else if( type==='number' ) {
        if( formFields.value.sortingAscending )
          return a[formFields.value.sortingColumn] - b[formFields.value.sortingColumn];
        else
          return b[formFields.value.sortingColumn] - a[formFields.value.sortingColumn];
      } else if( type==='datetime' ) {
        if( formFields.value.sortingAscending )
          return a[formFields.value.sortingColumn] - b[formFields.value.sortingColumn];
        else
          return b[formFields.value.sortingColumn] - a[formFields.value.sortingColumn];
      } else {
        if( formFields.value.sortingAscending )
          return `${a[formFields.value.sortingColumn]}`.localeCompare(`${b[formFields.value.sortingColumn]}`);
        else
          return `${b[formFields.value.sortingColumn]}`.localeCompare(`${a[formFields.value.sortingColumn]}`);
      }
    };
    const paginateAndSort = sourceRecords => {
      // first, sort
      let records = [...sourceRecords];
      if( !!props.needSort && !!formFields.value.sortingColumn )
        records = records.sort(sortComparator);
      const paginationStart = formFields.value.page*recordsPerPage.value;
      const paginationEnd = (formFields.value.page+1)*recordsPerPage.value;
      return records.slice(paginationStart,paginationEnd);
    };

    const handleChange = async (col,$event) => {
      try{
        console.log(`[DEBUG-filtering]: change fired, with `,col,$event); // TODO: DEBUG
        const value = $event.target.value;
        formFields.value.columns[col] = value;
        console.log(`[DEBUG-filtering]: value == `,value); // TODO: DEBUG

        const filteringClassesCb = colValues => {
          // console.log(`[DEBUG]: mdm-ui-recordsfilter component: generateFileringCssClasses called`); // TODO: debug
          const shouldBeShown = (colValues) => {
            var result = true;
            Object.keys(columnsSanitized.value).forEach(col=>{
              const value = formFields.value.columns[col];
              let match = matchText;
              if( columnsSanitized.value[col].type==='number' )
                match = matchNumericRange;
              result = result && match(colValues[col],value);
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
      paginateAndSort,
      recordsPerPage,
      numPages,
      pagination,
    };
  },
};

export default FormWrapper;
