




const View = {
  props: [
    'stdout',
    'stderr',
    'exit_code',
    'label',
    'repoStatus',
    'repoActions',
    'resolve',
    'reject',
  ],
  template: `
<div class="mdm-git-gui-popupview-message-window">
  <h2>{{ label }}</h2>
  <fieldset class="mdmreport-controls">
    <div class="mdmreport-controls-group mdmreport-controls-group-nonegmargin">
      <p v-if="exit_code!==0" :class="['exit-code',...(exit_code!==0?['error']:[])]">Exit code: {{ exit_code }}</p>
      <section class="section">
      <textarea readonly disabled placeholder="stdout" title="stdout">
        {{ stdout }}
      </textarea>
      </section>
      <section v-if="isNotEmpty(stderr)" class="section">
        <textarea readonly disabled class="error" placeholder="stderr" title="stderr">
          {{ stderr }}
        </textarea>
      </section>
    </div>
  </fieldset>
  <div class="mdmreport-controls"><input type="button" value="Close" @click.prevent="reject" class="mdmreport-buttom mdm-git-gui-button-close gitgui-button-close"></input></div>
</div>
`,
  setup() {
    const isNotEmpty = value => {
      if( typeof value==='number' )
        return true;
      else if( typeof value==='string' )
        return !( /^\s*$/.test(value) );
      else
        return !!value;
    };
    return { isNotEmpty };
  },
};

export default View;
