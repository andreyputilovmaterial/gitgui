
import { createApp, ref, reactive } from 'vue';
import logError from '../../error_logger/logError';


const mountToComponent = (targetEl,outerResolve,outerReject,oldValue,validationCb) => {
  const internalPromiseContext = {
    resolve: () => { throw new Error('promise not inited'); },
    reject: () => { throw new Error('promise not inited'); },
    promise: null,
  };
  internalPromiseContext.promise = new Promise((resolve,reject) => {
    internalPromiseContext.resolve = resolve;
    internalPromiseContext.reject = reject;
  });
  internalPromiseContext.promise.then(
    outerResolve,
    outerReject,
  );
  const widget = createApp({
    template: `
<form  @submit.prevent="handleSubmit" :class="\`\${isBusy ? 'mdmreport-form-busy' : ''}\`">
  <div class="error form-validation-error">{{ error }}</div>
  <div class="error form-validation-error">{{ validationaFailureMsg }}</div>
  <fieldset class="mdmreport-controls line1">
    From
    <input
      type="number"
      class="mdmreport-control"
      v-model="formFields.from"
    />
    to
    <input
      type="number"
      class="mdmreport-control"
      v-model="formFields.to"
    />.
  </fieldset>
  <fieldset class="mdmreport-controls line2">
    <button type="submit" class="gitgui-button-close gitgui-button-close-submit">Select</Button>
    <button type="button" class="gitgui-button-close gitgui-button-close-cancel" @click.prevent="handleCancel">Cancel</Button>
  </fieldset>
</form>
`,
    setup() {
      const error = ref('');
      const validationaFailureMsg = ref('');
      const formFields = reactive({
        from: oldValue?.from,
        to: oldValue?.to,
      });
      const isBusy = ref(false);
      const handleCancel = async () => {
        internalPromiseContext.reject(null);
      };
      const handleSubmit = async () => {
        try {
          isBusy.value = true;
          const validationFailure = validationCb(formFields); // expected to return error message or null
          if( validationFailure ) {
            validationaFailureMsg.value = validationFailure;
            return;
          } else
            internalPromiseContext.resolve(formFields);
        } catch (error) {
          if(error instanceof Error) {
            error.value = error;
            logError('Error in numeric range picker component');
            logError(error);
          } else {
            /* rejected - means "cancel" - ok */
          }
        } finally {
          isBusy.value = false;
        }
      };

      return {
        formFields,
        handleSubmit,
        handleCancel,
        isBusy,
        validationaFailureMsg,
        error,
      };
    },
  });
  internalPromiseContext.promise.finally(()=>{ widget.unmount(); });
  widget.mount(targetEl);
};

export default mountToComponent;
