// import { onMounted, onUnmounted } from 'vue';
import './style_component_in_progress.css';

const Component = {
  props: [],
  template: `
    <span class="mdm-ui-component-in-progress">
      <span class="dot dot-1">.</span><span class="dot dot-2">.</span><span class="dot dot-3">.</span>
    </span>
  `,

  setup() {
    // let interval;
    //
    // onMounted(() => {
    //   interval = setInterval(() => {
    //     // Restart the CSS animation.
    //     const dots = document.querySelector(
    //       '.mdm-ui-component-in-progress .dots'
    //     );
    //
    //     // if (!dots) return;
    //     //
    //     // dots.classList.remove('animate');
    //     //
    //     // // Force reflow so the animation can restart.
    //     // void dots.offsetWidth;
    //     //
    //     // dots.classList.add('animate');
    //   }, 2000);
    // });
    //
    // onUnmounted(() => {
    //   clearInterval(interval);
    // });

    return {};
  },
};

export default Component;
