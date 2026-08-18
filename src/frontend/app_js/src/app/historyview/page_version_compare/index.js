

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
<div class="mdm-git-gui-historyfileslistview">
  <p class="description">Compare {{ hashLeft }} and {{ hashRight }}</p>
  <div class="error">{{ error }}</div>
  <template v-if="!changedFiles">Quering data, please wait...</template>
  <template v-else-if="!!changedFiles">
    <component-filter-records-form :columns="{'old_mode': 'old_mode', 'new_mode': 'new_mode', 'old_oid': 'old_oid', 'new_oid': 'new_oid', 'status': 'status', 'path': 'path', }" :setComponentFilterRecordsClasses="setComponentFilterChangedfilesRecordsClasses">
      <div class="diff-records mdm-ui-records">
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
    <component-filter-records-form v-if="!!blobs" :columns="{'blobid': 'blob id', }" :setComponentFilterRecordsClasses="setComponentFilterBlobsRecordsClasses">
      <div class="blobs-records mdm-ui-records">
        <div
          v-for="h in blobs"
          :key="h"
          :class="[...['diffblob-record','mdm-ui-record'],...componentFilterBlobsRecordsGetClassesCb({blob:h})]"
        >
        {{ h }}
        </div>
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
    const blobs = ref(null);

    const componentFilterChangedfilesRecordsGetClassesCb = ref(()=>[]);
    const setComponentFilterChangedfilesRecordsClasses = cb => componentFilterChangedfilesRecordsGetClassesCb.value = cb;
    const componentFilterBlobsRecordsGetClassesCb = ref(()=>[]);
    const setComponentFilterBlobsRecordsClasses = cb => componentFilterBlobsRecordsGetClassesCb.value = cb;

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
        error.value = '';
        // git diff --raw -z --no-abbrev -M ec18f2c b4c0edf
        const result = await props.repoCallbacks.executeGitBinaryCommand(['git', 'diff', '--raw', '-z', '--no-abbrev', '-M', props.hashLeft, props.hashRight]);
        changedFiles.value = handleResult(result);
        error.value = '';
      } catch(e) {
        logError(e);
        logError(`Failed fetching diff for hash "${props.hashLeft}" and "${props.hashRight}"`);
        throw e;
      }
    };

    const collectBlobs = async () => {
      if( !changedFiles.value )
        return;
      const result = new Set();
      for (const record of changedFiles.value) {
        const isZero = s => /^0+$/.test(s);
        if( !isZero(record.old_oid) )
          result.add(record.old_oid);
        if( !isZero(record.new_oid) )
          result.add(record.new_oid);
      }
      blobs.value = Array.from(result);
    };

    onMounted(async () => {
      await Promise.all([
        getFiles(),
      ])
    });

    watch(() => changedFiles.value, () => {
      collectBlobs();
    });

    return {
      error,
      changedFiles,
      blobs,
      componentFilterChangedfilesRecordsGetClassesCb, setComponentFilterChangedfilesRecordsClasses,
      componentFilterBlobsRecordsGetClassesCb, setComponentFilterBlobsRecordsClasses,
    };
  },
};

export default View;
