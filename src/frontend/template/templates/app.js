// import { Vue } from "./vue.js";
document.addEventListener("DOMContentLoaded", () => {

  const { createApp, ref, onMounted, onUnmounted } = Vue

  const globalRepoSetup = {}

  const ComponentSectionRollUp = {
    props: {
      'header': String,
      'condensed': {
        type: [String, Boolean], // Accepts either a string "true" or an actual boolean true
        default: "true",          // The default value if the prop is missing
      },
      // How to check the prop value inside your TemplateYou can
      // use Vue directives directly in your HTML template string
      // to react to the prop:
      // To toggle visibility:
      // <div class="body" v-if="condensed === 'true'">
      // To toggle a CSS class:
      // <div :class="{ 'is-condensed': condensed === 'true' }">
      // pro tip:
      // condensed: {
      //   type: Boolean,
      //   default: true
      // }
      // Use code with caution.
      // If you do this, passing it via plain HTML like
      // condensed="false"
      // will still evaluate as a string and cause bugs.
      // To pass a real JavaScript boolean from your HTML file,
      // you must use Vue's binding colon (:):
      // <section-roll-up :condensed="false">
      // Would you like to see how to use this condensed prop to dynamically add a CSS class to your container element?

    },
    template: `
<div class="mdm-ui-rollup"
   :data-condensed="isCondensed"
   :class="{
     'mdm-ui-rollup-condensed': isCondensed == 'true' || isCondensed === true,
     'mdm-ui-rollup-open': isCondensed != 'true' && isCondensed !== true
   }"><div class="mdm-ui-rollup-header" @click="isCondensed = !isCondensed">{{ header }}</div>
<div class="mdm-ui-rollup-body"><slot></slot></div>
</div>
`,
    setup(props) {
      const {ref,watch} = Vue
      const determineInitialState = () => {
        return props.condensed === 'true' || props.condensed === true
      }
      const isCondensed = ref(determineInitialState())
      watch(() => props.condensed, () => {
        isCondensed.value = determineInitialState()
      })
      return {isCondensed}
    }
  }

  const GitRepoInitView = {
    props: {
      repoInitRequiresAttention: [String,Boolean],
      repoStatus: Object,
    },
    template: `
      <component-section-rollup header="Repo Init View" :condensed="!repoInitRequiresAttention">
      Hey, you project is...
      </component-section-rollup>
    `,
    setup() {
      return {  }
    }
  }

  const GitMainGuiView = {
    template: `
      <component-section-rollup header="Main Status View" :condensed="false">
      Hey, your current status is...
      </component-section-rollup>
    `,
    setup() {
      return {  }
    }
  }

  const GitTerminalSessionView = {
    template: `
      <component-section-rollup header="Commands View" :condensed="false">
      Hey, your last commands are
      </component-section-rollup>
    `,
    setup() {
      const count = ref(0)
      return { count }
    }
  }

  const app = createApp({
    template: `
<git-repoinit-view :repoInitRequiresAttention="repoInitRequiresAttention" :repoStatus="repoStatus"></git-repoinit-view>
<git-maingui-view></git-maingui-view>
<git-terminalsession-view></git-terminalsession-view>
`,
    components: {
      'component-section-rollup': ComponentSectionRollUp,
      'git-repoinit-view': GitRepoInitView,
      'git-maingui-view': GitMainGuiView,
      'git-terminalsession-view': GitTerminalSessionView,
    },
    setup() {
      const repoStatus = ref({})
      const repoInitRequiresAttention = ref(false)
      return {
        repoStatus,
        repoInitRequiresAttention,
      }
    }
  })
  // FORCE VUE DEVTOOLS TO ACTIVATE
  app.config.performance = true;
  app.component('component-section-rollup', ComponentSectionRollUp)
  app.mount('#gitui_app')





});
