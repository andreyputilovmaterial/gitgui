

import './gitignore_help_window.css';

import logError from '../../error_logger/logError';


const HelpWindow = {
  props: ['resolve','reject'],
  template: `
<form  @submit.prevent="handleSubmit" class="gitgui-modal-form">
  Hey here we help ya
  <div><input type="submit" value="Close" class="gitgui-button-modal-close"></input></div>
</form>
`,
  setup(props) {

    const handleSubmit = async () => {
      try {
        return props.resolve('close')
      } catch (err) {
        logError(err);
      }
    }

    return { handleSubmit };
  },
}

export default HelpWindow;
