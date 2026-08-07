
// const { ref, watch } = Vue



export const ComponentSectionRollUp = {
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
