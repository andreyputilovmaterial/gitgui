

import { ref, onMounted, watch } from 'vue';

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
  <template v-if="!changedFiles && !error">Quering data, please wait...</template>
  <template v-else-if="!!changedFiles">
    <component-filter-records-form :columns="{'path': 'path', 'status': 'status', 'old_mode': 'old_mode', 'new_mode': 'new_mode', 'old_oid': 'old_oid', 'new_oid': 'new_oid', }" :setComponentFilterRecordsClasses="setComponentFilterChangedfilesRecordsClasses">
      <div class="mdm-git-gui-diff-records diff-records mdm-ui-records">
        <diff-record
          v-for="h in changedFiles"
          :key="\`\${h.old_mode}-\${h.new_mode}-\${h.old_oid}-\${h.new_oid}-\${h.status}-\${h.path}\`"
          :componentFilterRecordsGetClassesCb="componentFilterChangedfilesRecordsGetClassesCb"
          :repoStatus="repoStatus"
          :repoCallbacks="repoCallbacks"
          :old_mode="h.old_mode"
          :new_mode="h.new_mode"
          :old_oid="h.old_oid"
          :new_oid="h.new_oid"
          :status="h.status"
          :path="h.path"
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
        // :<old mode> <new mode> <old oid> <new oid> <status>\t<path>\0

        // Helper function to split Uint8Arrays
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

        // A helper function to split by whitespace and decode to strings (like Python's default split)
        function splitWhitespace(bytes) {
          const text = new TextDecoder().decode(bytes);
          return text.trim().split(/\s+/);
        }

        // for record in data.split(b"\0"):
        //     if not record:
        //         continue
        //
        //     header, path = record.split(b"\t", 1)
        //
        //     fields = header.split()
        //
        //     old_mode = fields[0][1:]   # remove ':'
        //     new_mode = fields[1]
        //     old_oid  = fields[2]
        //     new_oid  = fields[3]
        //     status   = fields[4]
        //
        //     print(old_mode, new_mode, old_oid, new_oid, status, path)

        const results = [];

        // // 1. Split data by null byte \0 (ASCII 0)
        // const records = splitBytes(data, 0);
        //
        // for (const record of records) {
        //   // Check if record is empty
        //   if (record.length === 0) {
        //     continue;
        //   }
        //
        //   // 2. Split into [header, path] by tab \t (ASCII 9). Maxsplit = 1
        //   const tabIndex = record.indexOf(9);
        //   if (tabIndex === -1) continue; // Safety check
        //
        //   const headerBytes = record.subarray(0, tabIndex);
        //   const pathBytes = record.subarray(tabIndex + 1);
        //
        //   // Decode path to string
        //   const path = new TextDecoder().decode(pathBytes);
        //
        //   // 3. Split header fields by whitespace
        //   const fields = splitWhitespace(headerBytes);
        //
        //   // 4. Extract fields (removing leading ':' from the first field)
        //   const old_mode = fields[0].substring(1);
        //   const new_mode = fields[1];
        //   const old_oid  = fields[2];
        //   const new_oid  = fields[3];
        //   const status   = fields[4];
        //
        //   // 5. Output the results
        //   results.push({
        //     old_mode,
        //     new_mode,
        //     old_oid,
        //     new_oid,
        //     status,
        //     path,
        //   });
        // }

        const parts = splitBytes(data, 0);
        const records = [];
        for (const [index,part] of parts.entries()) {
          if((index&1)===0)
            records.push({headerBytes:part,pathBytes:null});
          else
            records[records.length-1].pathBytes = part;
        }
        for (const record of records) {
            const { headerBytes, pathBytes } = record;
            if( (headerBytes.length==0) && !pathBytes )
              continue;

            // Decode path to string
            const path = new TextDecoder().decode(pathBytes);

            // 3. Split header fields by whitespace
            const fields = splitWhitespace(headerBytes);

            // 4. Extract fields (removing leading ':' from the first field)
            const old_mode = fields[0].substring(1);
            const new_mode = fields[1];
            const old_oid  = fields[2];
            const new_oid  = fields[3];
            const status   = fields[4];

            // 5. Output the results
            results.push({
              old_mode,
              new_mode,
              old_oid,
              new_oid,
              status,
              path,
            });
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
        const result = ( props.hashLeft==props.hashRight ? '' : await props.repoCallbacks.executeGitBinaryCommand([...['git', 'diff', '--raw', '-z', '--no-abbrev', '-M',],...args]) );
        changedFiles.value = handleResult(result);
        error.value = '';
      } catch(e) {
        error.value = e;
        logError(e);
        logError(`Failed fetching diff for hash "${props.hashLeft}" and "${props.hashRight}"`);
        throw e;
      }
    };

    onMounted(async () => {
      await Promise.all([
        getFiles(),
      ])
    });

    return {
      error,
      changedFiles,
      componentFilterChangedfilesRecordsGetClassesCb, setComponentFilterChangedfilesRecordsClasses,
    };
  },
};

export default View;
