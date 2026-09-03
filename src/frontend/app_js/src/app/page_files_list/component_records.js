

import { ref, computed, reactive } from 'vue';

import ModalChooseDestPath from './component_bulk_restore_choose_path_modal.js';

import Record from './component_record.js';

import './style.css';
import './style_bulk_restore_form.css';
import { makeFetchResponseErrorMessage } from "@/common_defs/helper_functions.js";

const Records = {
  props: [
    'files',
    'hash',
    'repoStatus',
    'repoActions',
  ],
  template: `
<form @submit.prevent="handleBulkRestore" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}  \${inBulkRestoreMode ? 'mdm-git-gui-bulk-form' : ''} \`">
  <div class="error">{{ error }}</div>
  <div class="error">{{ bulkRestoreValidationMessage }}</div>
  <p class="note bulk-restore-notice mdmreport-banner" v-if="!inBulkRestoreMode">Or <a href="#!" class="build-restore-link" @click.prevent="inBulkRestoreMode=true">bulk-restore</a> files directly to disk, without downloading large files from operating memory.</p>
  <div v-if="inBulkRestoreMode" class="bulk-restore-submit-controls mdmreport-banner mdmreport-controls">
    <div class="mdmreport-controls-group restore-submit-controls-line">
      <button
        type="button"
        class="mdmreport-control button-check-all"
        @click.prevent="Object.entries(formFields.rows).forEach(([key, row]) => { row.checked = true; })"
      >
        Select all
      </button>
      <button
        type="button"
        class="mdmreport-control button-check-none"
        @click.prevent="Object.entries(formFields.rows).forEach(([key, row]) => { row.checked = false; })"
      >
        Select none
      </button>
      <button
        type="submit"
        class="mdmreport-control button-go"
      >
        Restore selected
      </button>
    </div>
  </div>
  <div class="bulk-restore-success-message">{{ bulkRestoreSuccessMessage }}</div>
  <component-filter-records-form
    :columns="{
      'filepath':'File path',
    }"
    :keyField="'filepath'"
    :records="files"
    :needSort="true"
    ref="filteringComponent"
  >
    <div class="files-records mdm-ui-records">
      <files-record
        v-for="h in filesSorted"
        :key="h.filepath"
        :filepath="h.filepath"
        :componentRecordsFiltData="h.componentRecordsFiltData"
        :repoStatus="repoStatus"
        :repoActions="repoActions"
        :hash="hash"
        :bulkRestoreVModel="formFields.rows[h.filepath]"
        :showBulkRestoreCheckbox="inBulkRestoreMode"
      />
    </div>
  </component-filter-records-form>
</form>
`,
  components: {
    'files-record': Record,
  },
  setup(props) {

    const filteringComponent = ref(null);

    const isBusy = ref(false);
    const formFields = reactive({
      rows: Object.fromEntries(props.files.map(({filepath})=>([filepath,{checked:false}]))),
    });
    const bulkRestoreValidationMessage = ref('');
    const bulkRestoreSuccessMessage = ref('');
    const error = ref('');
    const inBulkRestoreMode = ref(false);

    const handleBulkRestore = async () => {
      try {
        isBusy.value = true;
        bulkRestoreValidationMessage.value = '';
        const selectedFiles = Object.entries(formFields.rows).filter(([_key,value])=>value.checked).map(([key,_value])=>key);
        if( !(selectedFiles.length>0) ) {
          bulkRestoreValidationMessage.value = 'Please select some files. Nothing selected.'
          return false;
        }
        const dest = await props.repoActions.createModal(ModalChooseDestPath);
        const commandArgs = [ 'git', 'archive', props.hash, '--', ...selectedFiles, ];
        const pipeArgs = [ 'tar', '-x', '-C', dest, ];
        const jobData = await props.repoActions.executeGitCommand(commandArgs,{is_interactive:true,is_binary:true,});
        await jobData.promiseDownloadLinkReady;
        const downloadUrl = jobData.getDownloadUrl('tar');
        const pipeRequest = await fetch(
          downloadUrl,
          {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify([...pipeArgs]),
          },
        );
        if( !pipeRequest.ok ) {
          error.value = `git archive: tar postprocessing failed`;
          props.repoActions.logError('"Restore files" failed');
          throw new Error(await makeFetchResponseErrorMessage(pipeRequest));
        }
        const pipeJobRequestPlaced= await pipeRequest.json();
        const pipeJobId = pipeJobRequestPlaced.job_id;
        const pipeJobData = await props.repoActions.attachToRunningCommand(pipeJobId,{parentJobId:jobData.job_id});
        await jobData.promise;
        if( (jobData.exit_code!==0) || (!!jobData.stderr) ) {
          error.value = `git archive: failed with exit_code ${jobData.exit_code}: ${jobData.stderr}`;
          props.repoActions.logError('"Restore files" failed');
          props.repoActions.logError(error.value);
          isBusy.value = false;
          return;
        }
        await pipeJobData.promise;
        if( (pipeJobData.exit_code!==0) || (!!pipeJobData.stderr) ) {
          error.value = `tar: failed with exit_code ${pipeJobData.exit_code}: ${pipeJobData.stderr}`;
          props.repoActions.logError('"Restore files" failed');
          props.repoActions.logError(error.value);
          isBusy.value = false;
          return;
        }
        alert('DONE!'); // TODO: make this a modal


        // import subprocess
        // import tarfile
        // from pathlib import Path
        //
        // destination = Path("/some/new/location")
        // destination.mkdir(parents=True, exist_ok=True)
        //
        // proc = subprocess.Popen(
        //     ["git", "archive", "REV", "--", "README.txt", "docs/", "src/foo.c"],
        //     stdout=subprocess.PIPE,
        //     stderr=subprocess.PIPE,
        // )
        //
        // try:
        //     with tarfile.open(fileobj=proc.stdout, mode="r|") as archive:
        //         archive.extractall(destination)
        //
        //     if proc.wait() != 0:
        //         raise subprocess.CalledProcessError(proc.exit_code, proc.args)
        // finally:
        //     if proc.stdout:
        //         proc.stdout.close()
        //     if proc.stderr:
        //         proc.stderr.close()
        bulkRestoreSuccessMessage.value = `Successfully restored ${selectedFiles.length} files to "${dest}"`
        bulkRestoreValidationMessage.value = '';
      } catch(e) {
        if(e instanceof Error)
          props.repoActions.logError(e);
        isBusy.value = false;
      } finally {
        isBusy.value = false;
      }
    };

    const filesSorted = computed(()=> {
      if( filteringComponent.value?.paginateAndSort ) {
        return filteringComponent.value?.paginateAndSort(props.files);
      } else {
        // return props.files; // returning all unfiltered results in full list rendered and crash on memory
        return [];
      }
    });

    return {
      isBusy,
      error,
      bulkRestoreValidationMessage,
      bulkRestoreSuccessMessage,
      handleBulkRestore,
      formFields,
      filteringComponent,
      filesSorted,
      inBulkRestoreMode,
    };
  },
};

export default Records;
