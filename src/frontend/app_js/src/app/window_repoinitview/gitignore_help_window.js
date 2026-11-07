

import './gitignore_help_window.css';



const HelpWindow = {
  props: [
    'resolve', 'reject',
    'repoStatus', 'repoActions',
  ],
  template: `
<form  @submit.prevent="handleSubmit" class="gitgui-modal-form">
  Hey here we help ya
  <div><button type="submit" class="mdm-btn mdm-modal-close">Close</button></div>
</form>
`,
  setup(props) {

    const handleSubmit = async () => {
      try {
        return props.resolve('close')
      } catch (e) {
        if( e instanceof Error )
        props.repoActions.logError(e);
      }
    }

    return { handleSubmit };
  },
}

export default HelpWindow;
