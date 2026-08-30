

import './gitignore_help_window.css';



const HelpWindow = {
  props: [
    'resolve', 'reject',
    'repoStatus', 'repoCallbacks',
  ],
  template: `
<form  @submit.prevent="handleSubmit" class="gitgui-modal-form">
  Hey here we help ya
  <div><input type="submit" value="Close" class="gitgui-button-close"></input></div>
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
