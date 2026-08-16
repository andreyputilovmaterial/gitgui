

import { ref } from 'vue';

import Record from './component_record';

import './style.css';

const Records = {
  props: [
    'history',
    'formVerCompareFields',
  ],
  template: `
<component-filter-records-form :columns="{'hash':'Hash','author':'Author','timestamp':'Date/time','message':'Commit message'}" :setComponentFilterRecordsClasses="setComponentFilterRecordsClasses">
  <div class="history-records mdm-ui-records">
      <history-record
        v-for="h in history"
        :key="h.hash"
        :hash="h.hash"
        :author="h.author"
        :timestamp="h.timestamp"
        :message="h.message"
        :formVerCompareFields="formVerCompareFields"
        :componentFilterRecordsGetClassesCb="componentFilterRecordsGetClassesCb"
      />
  </div>
</component-filter-records-form>
`,
  components: {
    'history-record': Record,
  },
  setup(props) {
    const componentFilterRecordsGetClassesCb = ref(()=>[]);
    const setComponentFilterRecordsClasses = cb => componentFilterRecordsGetClassesCb.value = cb;
    return { componentFilterRecordsGetClassesCb, setComponentFilterRecordsClasses };
  },
};

export default Records;
