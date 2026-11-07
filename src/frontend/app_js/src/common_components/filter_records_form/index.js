
import { ref, computed, watch, toRaw } from 'vue';


import matchNumericRange from './match/numeric_range';
import matchDatetimeRange from './match/datetime_range';
import matchRegexText from './match/regex_text';

import logErr from '../_log_error_proxy';

// import { genId } from './helpers';

import './styles.css';



const DEFAULT_RECORDS_PER_PAGE = 25;

// How long a record that was already shown stays mounted (hidden via CSS) after it
// stops matching the filter — so it can be re-shown instantly without re-rendering
// the row while the user keeps typing.
const RECORDS_VISIBILITY_GRACE_MS = 15000;

// Convenience for record (leaf) components: the filter component marks rows it wants
// to hide in place (the second, CSS-based filtering layer) with
// `componentRecordsFiltData.cssClasses = ['hidden']`. Spread this into the record's
// root `:class` so the global `.mdm-ui-recordsfilter-content .hidden` rule hides it.
export function recordsFilterClasses(componentRecordsFiltData) {
  return componentRecordsFiltData?.cssClasses || [];
}



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
    'keyField',
    'needSort',
    'recordsPerPage'
  ],
  template: `
<form :class="{'mdm-ui-recordsfilter': true,'mdm-ui-recordsfilter-filtering': true,}" @submit.prevent="handleSubmit">
  <div class="mdmreport-banner mdmreport-controls">
    <div class="mdm-ui-recordsfilter-form mdm-ui-recordsfilter-controls-row">
      <div class="mdmreport-controls-group">
        <div v-for="col in Object.keys(columnsSanitized)" :key="col">
          <label>{{ columnsSanitized[col].label }}:
            <component
              :is="
                (
                  columnsSanitized[col].type === 'number'
                  ? 'component-input-numericrange'
                  : (
                    columnsSanitized[col].type === 'datetime'
                    ? 'component-input-datetimerange'
                    : 'component-input-regextext'
                  )
                )
              "
              v-bind="
                (
                  ['number','datetime'].includes( columnsSanitized[col].type )
                  ? {}
                  : { regexDefault: true }
                )
              "
              :value="formFields.columns[col]"
              class="mdmreport-control"
              @input="handleFilterChange(col, $event)"
              placeholder="Type to filter..."
            />
          </label>
        </div>
      </div>
    </div>
    <div class="mdm-ui-recordsfilter-sortby mdm-ui-recordsfilter-controls-row">
      <div class="mdmreport-controls-group">
        <label>
          <span>Sort by: </span>
          <select class="mdmreport-control" @input="handleSortColChange(undefined, $event)">
            <option :value="''">not sorted</option>
            <option v-for="col in Object.keys(columnsSanitized)" :key="col" :value="col">{{ columnsSanitized[col].label }}</option>
          </select>
          <select class="mdmreport-control" @input="handleSortOrderChange(undefined, $event)">
            <option :value="'asc'">ascending order</option>
            <option :value="'desc'">descending order</option>
          </select>
        </label>
      </div>
    </div>
    <div v-if="pagination.length > 1" class="mdm-ui-recordsfilter-pagination mdm-ui-recordsfilter-pagination-top mdm-ui-recordsfilter-controls-row">
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
  </div>
  <div class="mdm-ui-recordsfilter-content">
    <slot :records="recordsSorted" />
  </div>
  <div v-if="pagination.length > 1" class="mdm-ui-recordsfilter-pagination mdm-ui-recordsfilter-pagination-repeat-bottom mdmreport-banner mdmreport-controls">
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
            logErr('Failed to initialize filter-records component');
            logErr(e);
            throw e;
          }
        })(value);
      }
      return columns;
    });

    const formFields = ref({
      columns: Object.entries(columnsSanitized.value).map(([prop, _]) => [prop, '']),
      sortingColumn: null,
      sortingAscending: true,
      page: 0,
    });

    const sortComparator = (a,b) => {
      const sortingColumn = formFields.value.sortingColumn;
      if( !sortingColumn || !Object.keys(columnsSanitized.value).includes(sortingColumn) ) {
        const e = new Error(`mdm-ui-recordsfilter component: sort: impossible column ("${sortingColumn}")`);
        logErr(e);
        throw e;
      }
      const type = columnsSanitized.value[sortingColumn].type;
      if( type==='text' ) {
        const aVal = `${a[sortingColumn] ?? ''}`;
        const bVal = `${b[sortingColumn] ?? ''}`;
        if( formFields.value.sortingAscending )
          return aVal.localeCompare(bVal);
        else
          return bVal.localeCompare(aVal);
      } else if( type==='number' ) {
        const aSize = a[sortingColumn];
        const aSizeOrNull = isFinite(aSize) ? aSize : 0;
        const bSize = b[sortingColumn];
        const bSizeOrNull = isFinite(bSize) ? bSize : 0;
        if( formFields.value.sortingAscending ) {
          return aSizeOrNull - bSizeOrNull;
        } else
          return bSizeOrNull - aSizeOrNull;
      } else if( type==='datetime' ) {
        const aTime = a[sortingColumn];
        const aTimeOrZero = isFinite(aTime) ? aTime : 0;
        const bTime = b[sortingColumn];
        const bTimeOrZero = isFinite(bTime) ? bTime : 0;
        if( formFields.value.sortingAscending )
          return aTimeOrZero - bTimeOrZero;
        else
          return bTimeOrZero - aTimeOrZero;
      } else {
        const aVal = `${a[sortingColumn]}`;
        const bVal = `${b[sortingColumn]}`;
        if( formFields.value.sortingAscending )
          return aVal.localeCompare(bVal);
        else
          return bVal.localeCompare(aVal);
      }
    };

    const shouldRecordBeShown = (colValues) => {
      var result = true;
      Object.keys(columnsSanitized.value).forEach(col=>{
        const value = formFields.value.columns[col];
        let match = matchRegexText;
        if( columnsSanitized.value[col].type==='number' )
          match = matchNumericRange;
        else if( columnsSanitized.value[col].type==='datetime' )
          match = matchDatetimeRange;
        result = result && match(colValues[col],value);
      });
      return result;
    };

    const recordsInternalCopy = ref({}); // sorry side effects

    const recordsPerPage = ref((()=>{
      if(props.recordsPerPage==0)
        return props.records.length;
      else if(props.recordsPerPage>0)
        return props.recordsPerPage|0;
      else
        return DEFAULT_RECORDS_PER_PAGE;
    })());

    const recordsShown = computed(()=>props.records.filter(shouldRecordBeShown));

    const numPages = computed(()=>Math.ceil(recordsShown.value.length/recordsPerPage.value));
    watch(numPages, (newNumPages) => {
      if (formFields.value.page >= newNumPages) {
        formFields.value.page = 0;
      }
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

    const paginateAndSort = sourceRecords => {

      // if( !props.keyField ) {
      //   Promise.then(()=>{throw new Error('component-filter-records: "keyField" prop is not provided; disabled sort and filtering');});
      //   return sourceRecords;
      // }
      const keyField = props.keyField || Object.keys(columnsSanitized.value)[0];

      const datetimeNow = new Date();

      // I just believe it is faster, but with 100-200 records the difference is probably zero
      // why I think is is that I don't want all reactivity getters and setters to be called - will update value once at the end of this fn
      const recordsData = {...toRaw(recordsInternalCopy.value)}; // sorry side effects

      // first, init the new collection
      let records = sourceRecords.map(record => ({
        ...record,
        componentRecordsFiltData: recordsData[record[keyField]] || (recordsData[record[keyField]] = { wasEverShown: false, }),
      }));
      records.forEach((record,index)=>{
        record.componentRecordsFiltData.orderSource = index;
        record.componentRecordsFiltData.isDead = false;
        record.componentRecordsFiltData.prevIsHidden = record.componentRecordsFiltData.isHidden;
        record.componentRecordsFiltData.cssClasses = [];
      });

      // first, sort
      if( !!props.needSort && !!formFields.value.sortingColumn )
        records = records.sort(sortComparator);
      records.forEach((record,index)=>{
        record.componentRecordsFiltData.order = index;
      });

      // then, apply filter
      records.forEach((record,index) => {
        record.componentRecordsFiltData.isHidden = !shouldRecordBeShown(record);
      });

      // then, paginate
      records.filter(record=>!record.componentRecordsFiltData.isHidden).forEach((record,index) => {
        const paginationStart = formFields.value.page*recordsPerPage.value;
        const paginationEnd = (formFields.value.page+1)*recordsPerPage.value;
        const isWithinPageRange = (index>=paginationStart) && (index<paginationEnd);
        record.componentRecordsFiltData.isHidden = !isWithinPageRange;
      });

      // filter out obsolete, but keep in momory those "temporarily" hidden, that will be not shown because of css class
      records = records.filter(record => {
        const rec = record.componentRecordsFiltData;
        if( !rec.isHidden )
          rec.wasEverShown = true;
        if( !rec.prevIsHidden && rec.isHidden )
          rec.visibilityLastChanged = datetimeNow;
        if( !rec.isHidden )
          // if not is hidden - that's fine
          return true;
        else if( rec.isHidden && !rec.wasEverShown )
          return false;
        else if( !!rec.visibilityLastChanged && ( (+rec.visibilityLastChanged) - (+datetimeNow) < RECORDS_VISIBILITY_GRACE_MS ) )
          return true;
        else
          return false;
      });
      records.forEach((record,index) => {
        if( record.componentRecordsFiltData.isHidden ) {
          record.componentRecordsFiltData.cssClasses = ['hidden'];
        }
      });

      Object.assign(recordsInternalCopy.value,recordsData);
      return records.map(record => ({
        ...record,
        componentRecordsFiltData: {...record.componentRecordsFiltData}, // need a new object for vue to detect update <-- critical
      }));
    };

    const recordsSorted = computed(() => paginateAndSort(props.records));

    const handleFilterChange = async (col,$event) => {
      try{
        formFields.value.columns[col] = $event.target.value;
      } catch(e) {
        logErr(e);
        logErr('mdm-ui-recordsfilter component: failed when handling filter onChange');
        throw e;
      }
    };

    const handleSortColChange = async (col,$event) => {
      try{
        const value = $event.target.value;
        if( !value)
          formFields.value.sortingColumn = null;
        else
          formFields.value.sortingColumn = value;
      } catch(e) {
        logErr(e);
        logErr('mdm-ui-recordsfilter component: failed when handling sort col onChange');
        throw e;
      }
    };

    const handleSortOrderChange = async (col,$event) => {
      try{
        const value = $event.target.value;
        if( value==='asc')
          formFields.value.sortingAscending = true;
        else if( value==='desc')
          formFields.value.sortingAscending = false;
        else
          throw new Error(`mdm-ui-recordsfilter component: unrecognized sort order: "${value}"`);
      } catch(e) {
        logErr(e);
        logErr('mdm-ui-recordsfilter component: failed when handling sort order onChange');
        throw e;
      }
    };

    const handleSubmit = () => undefined;

    return {
      handleSubmit,
      handleFilterChange,
      handleSortColChange,
      handleSortOrderChange,
      formFields,
      columnsSanitized,
      pagination,
      recordsSorted,
    };
  },
};

export default FormWrapper;
