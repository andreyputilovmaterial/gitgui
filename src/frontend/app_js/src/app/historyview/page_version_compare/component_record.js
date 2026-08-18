
import './style.css';





const Record = {
  props: [
    'componentFilterRecordsGetClassesCb',
  	'repoStatus',
  	'repoCallbacks',
  	'old_mode',
  	'new_mode',
  	'old_oid',
  	'new_oid',
  	'status',
  	'path',
  ],
  template: `
<div :class="[...['diff-record','mdm-ui-record'],...componentFilterRecordsGetClassesCb({old_mode,new_mode,old_oid,new_oid,status,path})]">
old_mode: "{{ old_mode }}", new_mode: "{{ new_mode }}", old_oid: "{{ old_oid }}", new_oid: "{{ new_oid }}", status: "{{ status }}", path: "{{ path }}"
</div>
`,
  components: {
  },
  setup() {
    return {};
  },
};

export default Record;
