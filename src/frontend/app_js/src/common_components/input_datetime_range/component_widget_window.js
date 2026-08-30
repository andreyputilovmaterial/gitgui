
import { createApp, ref, reactive, nextTick, onMounted } from 'vue';
import logErr from '../_log_error_proxy';



function hasValue(value) {
  if( typeof value==='number' )
    return true;
  else if( typeof value==='string' )
    return !(/^\s*$/.test(value))
  else
    return !!value;
}

function isValidDate(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}




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
      type="datetime-local"
      class="mdmreport-control"
      v-model="formFields.from"
      ref="refInputLow"
    />
    to
    <input
      type="datetime-local"
      class="mdmreport-control"
      v-model="formFields.to"
      ref="refInputHigh"
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
      const isBusy = ref(false);

      const refInputLow = ref(null);
      const refInputHigh = ref(null);

      const formFields = reactive({
        from: oldValue?.from,
        to: oldValue?.to,
      });

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
            logErr('Error in numeric range picker component');
            logErr(error);
          } else {
            /* rejected - means "cancel" - ok */
          }
        } finally {
          isBusy.value = false;
        }
      };

      const focusInput = async () => {
        await nextTick();
        const shouldTargetHigh =
          hasValue(formFields.to) &&
          !hasValue(formFields.from);
        if (shouldTargetHigh) {
          refInputHigh.value?.focus();
        } else {
          refInputLow.value?.focus();
        }
      };

      onMounted(async () => {
        await Promise.all([
          focusInput(),
        ])
      });

      return {
        formFields,
        handleSubmit,
        handleCancel,
        isBusy,
        validationaFailureMsg,
        error,
        refInputLow,
        refInputHigh,
      };
    },
  });
  internalPromiseContext.promise.finally(()=>{ widget.unmount(); });
  widget.mount(targetEl);
};

export default mountToComponent;
