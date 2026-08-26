

import { ref, onMounted, watch, computed } from 'vue';

import DiffRecord from './component_record';

import './style.css';


import logError from '../../../error_logger/logError';

// import FilesRecords from './component_records';




const View = {
  props: [
    'hashLeft',
    'hashRight',
    'repoStatus',
    'repoCallbacks',
    'resolve','reject', /* could both be called to close this window - parent will destroy the component once called */
  ],
  template: `
<div class="mdm-git-gui-historydiff">
  <p class="description">Compare revisions {{ hashLeft }} and {{ hashRight }}</p>
  <div class="error">{{ error }}</div>
  <template v-if="!changedFiles && !error">Querying data, please wait...</template>
  <template v-else-if="!!changedFiles">
    <component-filter-records-form
      :columns="{'path': 'path', 'status': 'status', 'old_mode': 'old_mode', 'new_mode': 'new_mode', 'old_oid': 'old_oid', 'new_oid': 'new_oid', }"
      :keyField="'path'"
      :records="changedFiles"
      :needSort="true"
      ref="filteringComponent"
    >
      <div class="mdm-git-gui-diff-records diff-records mdm-ui-records">
        <div v-if="!(changedFiles.length>0)">Nothing to show</div>
        <diff-record
          v-for="h in changedFilesSorted"
          :key="\`\${h.old_mode}-\${h.new_mode}-\${h.old_oid}-\${h.new_oid}-\${h.status}-\${h.path}\`"
          :componentRecordsFiltData="h.componentRecordsFiltData"
          :repoStatus="repoStatus"
          :repoCallbacks="repoCallbacks"
          :old_mode="h.old_mode"
          :new_mode="h.new_mode"
          :old_oid="h.old_oid"
          :new_oid="h.new_oid"
          :status="h.status"
          :path="h.path || h.new_path"
          :old_path="h.old_path"
          :new_path="h.new_path"
        />
      </div>
    </component-filter-records-form>
  </template>
</div>
`,
  components: {
    'diff-record': DiffRecord,
  },
  setup(props) {

    const error = ref('');
    const changedFiles = ref(null);

    const componentFilterChangedfilesRecordsGetClassesCb = ref(()=>[]);
    const setComponentFilterChangedfilesRecordsClasses = cb => componentFilterChangedfilesRecordsGetClassesCb.value = cb;

    const getFiles = async data => {
      function handleResult(data) {
        const decoder = new TextDecoder();

        function splitBytes(bytes, separator) {
          const result = [];
          let start = 0;

          for (let i = 0; i <= bytes.length; i++) {
            if (i === bytes.length || bytes[i] === separator) {
              result.push(bytes.subarray(start, i));
              start = i + 1;
            }
          }

          return result;
        }

        function splitWhitespace(bytes) {
          return decoder.decode(bytes).trim().split(/\s+/);
        }

        const parts = splitBytes(data, 0);
        const results = [];

        let i = 0;

        while (i < parts.length) {
          const headerBytes = parts[i++];

          // Ignore trailing NUL
          if (headerBytes.length === 0) {
            continue;
          }

          const fields = splitWhitespace(headerBytes);

          const old_mode = fields[0].substring(1);
          const new_mode = fields[1];
          const old_oid = fields[2];
          const new_oid = fields[3];
          const status = fields[4];

          // R = rename, C = copy; both have two paths.
          const isRenameOrCopy =
            status.startsWith("R") || status.startsWith("C");

          if (isRenameOrCopy) {
            const old_path = decoder.decode(parts[i++]);
            const new_path = decoder.decode(parts[i++]);

            results.push({
              old_mode,
              new_mode,
              old_oid,
              new_oid,
              status,
              old_path,
              new_path,
            });
          } else {
            const path = decoder.decode(parts[i++]);

            results.push({
              old_mode,
              new_mode,
              old_oid,
              new_oid,
              status,
              path,
            });
          }
        }

        return results;
      }

      try {
        // git diff --raw -z --no-abbrev -M ec18f2c b4c0edf
        const { leftIsWorktree, leftIsIndex, rightIsWorktree, rightIsIndex, } = {
          leftIsWorktree: props.hashLeft==='worktree',
          leftIsIndex: props.hashLeft==='index',
          rightIsWorktree: props.hashRight==='worktree',
          rightIsIndex: props.hashRight==='index',
        };
        const { leftIsHash, rightIsHash, } = {
          leftIsHash: !leftIsWorktree && !leftIsIndex,
          rightIsHash: !rightIsWorktree && !rightIsIndex,
        };
        const args = (()=>{
          if     ( leftIsWorktree && rightIsWorktree )
            throw new Error(`diff ${leftIsHash?'hash':props.hashLeft} vs ${rightIsHash?'hash':props.hashRight}: compare same revisions - should not be called`);
          else if( leftIsWorktree && rightIsIndex )
            throw new Error(`diff ${leftIsHash?'hash':props.hashLeft} vs ${rightIsHash?'hash':props.hashRight}: we can't show diff when worktree is left source, please select it as right`);
          else if( leftIsWorktree && rightIsHash )
            throw new Error(`diff ${leftIsHash?'hash':props.hashLeft} vs ${rightIsHash?'hash':props.hashRight}: we can't show diff when worktree is left source, please select it as right`);
          else if( leftIsIndex && rightIsWorktree )
            // return ['--cached'];
            throw new Error(`diff ${leftIsHash?'hash':props.hashLeft} vs ${rightIsHash?'hash':props.hashRight}: we don't show diff with worktree - please stage files first`);
          else if( leftIsIndex && rightIsIndex )
            throw new Error(`diff ${leftIsHash?'hash':props.hashLeft} vs ${rightIsHash?'hash':props.hashRight}: compare same revisions - should not be called`);
          else if( leftIsIndex && rightIsHash )
            throw new Error(`diff ${leftIsHash?'hash':props.hashLeft} vs ${rightIsHash?'hash':props.hashRight}: we can't show diff when index is left source and worktree is right, please select them in reverse order`);
          else if( leftIsHash && rightIsWorktree )
            // return [ props.hashLeft ];
            throw new Error(`diff ${leftIsHash?'hash':props.hashLeft} vs ${rightIsHash?'hash':props.hashRight}: we don't show diff with worktree - please stage files first`);
          else if( leftIsHash && rightIsIndex )
            return [ '--cached', props.hashLeft ];
          else if( leftIsHash && rightIsHash )
            return [ props.hashLeft, props.hashRight ];
          else
            throw new Error(`diff ${leftIsHash?'hash':props.hashLeft} vs ${rightIsHash?'hash':props.hashRight}: not implemented`);
        })();
        const result = ( props.hashLeft==props.hashRight ? new Uint8Array([]) : await props.repoCallbacks.executeGitBinaryCommand([...['git', 'diff', '--raw', '-z', '--no-abbrev', '-M',],...args]) );
        changedFiles.value = handleResult(result);
        error.value = '';
      } catch(e) {
        error.value = e;
        logError(e);
        logError(`Failed fetching diff for hash "${props.hashLeft}" and "${props.hashRight}"`);
        throw e;
      }
    };

    const filteringComponent = ref(null);

    const changedFilesSorted = computed(()=> {
      if( filteringComponent.value?.paginateAndSort ) {
        return filteringComponent.value?.paginateAndSort(changedFiles.value);
      } else {
        return changedFiles.value;
      }
    });

    onMounted(async () => {
      await Promise.all([
        getFiles(),
      ])
    });

    return {
      error,
      changedFiles,
      changedFilesSorted,
      filteringComponent,
    };
  },
};

export default View;
