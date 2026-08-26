

import { reactive, ref, nextTick, onMounted } from 'vue';

import logError from '../../../error_logger/logError';

import './style_bulk_restore_form.css';


const ModalConfirmContinueIfPathsNotVerified = {
  props: ['resolve','reject'],
  template: `
<form  @submit.prevent="handleSubmit" class="gitgui-modal-form git-repo-modal-form-bulk-restore-choose-path mdmreport-controls">
  <p>Please paste the path where you want your files saved.</p>
  <div class="mdmreport-controls-group">
    <div class="error">{{ validationMessage }}</div>
    <input v-model="formFields.dest" class="mdmreport-control" ref="refInput" />
  </div>
  <div class="buttons-confirm">
    <button type="submit" class="gitgui-button-close button-confirm">Yes, restore to this folder</Button>
    <button type="button" class="gitgui-button-close button-cancel" @click.prevent="reject">No, get me back</Button>
  </div>
</form>
`,
  setup(props) {

    const refInput = ref(null);

    const formFields = reactive({
      dest: '',
    });
    const validationMessage = ref('');

    function hasValue(value) {
      if( typeof value==='number' )
        return true;
      else if( typeof value==='string' )
        return !(/^\s*$/.test(value))
      else
        return !!value;
    }

    const focusInput = async () => {
      await nextTick();
      refInput.value?.focus();
    };

    const handleSubmit = async () => {
      try {
        if( !hasValue(formFields.dest) ) {
          validationMessage.value = 'Please enter a path.'
          return false;
        }
        return props.resolve(formFields.dest)
      } catch (err) {
        logError(err);
      }
    }

    onMounted(async () => {
      await Promise.all([
        focusInput(),
      ])
    });

    return { handleSubmit, formFields, validationMessage, refInput };
  },
}

export default ModalConfirmContinueIfPathsNotVerified;
