

export const MainView = {
  props: [
    'repoStatus', 'repoCallbacks',
  ],
  template: `
<component-section-rollup header="Main Status View" :condensed="!repoStatus?.repoExists">
  <div v-if="!repoStatus?.repoExists">
    Repo is not inited. Nothing to display.
  </div>
  <div v-else>
    ...Repo status here...
  </div>
</component-section-rollup>
  `,
  setup(props) {
    return {  }
  }
}
