

import { ref, reactive, onMounted } from 'vue';

import safetyUrlCheck from './safetycheck';


const Window = {
  props: [
    'resolve',
    'reject',
    'url',
  ],
  template: `
<div class="gitgui-ajax-pageview-form gitgui-modal-form">
  <form  @submit.prevent="handleSubmit" :class="\`mdmreport-controls \${isBusy ? 'mdmreport-form-busy' : ''}\`">
    <fieldset class="mdmreport-controls">
      <div class="gitgui-fetched-content">
        <div class="error" style="color: #990000;">{{ error }}</div>
        <iframe :srcdoc="content" :key="\`fetch-\${lastFetchCounter}\`"></iframe>
      </div>
      <div><input type="submit" value="Close" class="gitgui-button-close"></input></div>
    </fieldset>
  </form>
</div>
`,
  setup(props) {
    // const { ref, reactive, onMounted } = Vue

    const isBusy = ref(false)
    const content = ref('Content is loading, please wait...');
    const lastFetchCounter = ref(0);
    const error = ref('')
    const formFields = reactive({ })

    const handleSubmit = async () => {
       try {
         isBusy.value = true;
         return props.resolve('Yes!')
       } catch (err) {
         props.repoActions.logError(err);
         props.repoActions.logError('Failed submitting ajax page view form');
         console.error('Failed submitting ajax page view form',err);
         isBusy.value = false;
         return props.reject(err);
       } finally {
         isBusy.value = false
       }
     }


  async function fetchContents() {
    try {
      if( !safetyUrlCheck(props.url) )
        throw new Error(`Requested to fetch non-local url: decline (${props.url})`);
      const response = await fetch(props.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const html = await response.text();
      content.value = html;

      lastFetchCounter.value++;
    } catch(e) {
      content.value = ' ';
      error.value = e;
      throw e;
    }
  }
  onMounted(async () => {
    await Promise.all([
      fetchContents(),
    ])
  })

  return { formFields, handleSubmit, isBusy, content, error, lastFetchCounter }
}
}
export default Window;
