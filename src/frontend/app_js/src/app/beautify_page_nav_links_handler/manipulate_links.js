

import {defineComponent,h,markRaw,onMounted} from 'vue';


import { createModal } from '../../common_components/modals';
import logError from '../../error_logger/logError';
import Window from './window_component';
import safetyUrlCheck from './safetycheck';




const init = (Vue) => {

  // const {defineComponent,h} = Vue

  const readUrl = linkEl => {
    const urlRaw = linkEl.getAttribute('href');
    const url = new URL(urlRaw, window.location.origin);
    url.searchParams.set('embed', '1');
    // const result = url.pathname + url.search + url.hash;
    // return result;
    return url.toString();
  };

  const createLinkHandler = url => {
    const MyWindowSpecificToThisUrl = defineComponent({
      setup(_, { attrs }) {
        try {
          const render = () => {
            try {
              return h(Window, {
                ...attrs,
                url,
              });
            } catch(e) {
              logError(e);
              throw e;
            }
          }
          return render;
        } catch(e) {
          logError(e);
          throw e;
        }
      },
    })
    return function(event) {
      event.preventDefault();
      (async function (){
        await createModal(MyWindowSpecificToThisUrl)
      })();
      return false;
    }
  }

  Array.from(document.querySelectorAll('[navigation-role] a, a[navigation-role]')).forEach(function(linkEl) {
    try{

      const url = readUrl(linkEl);
      if( safetyUrlCheck(url) )
        linkEl.addEventListener('click',createLinkHandler(url));

    } catch(e) {
      try {
        logError(e);
      } catch(ee) {}
    }
  });

}

const DummyWrapper = {
  props: [],
  template: `<span class="gitgui-navlinks-manipulate-component"></span>`, // empty is raising warning
  setup() {
    // const {defineComponent,h,markRaw,onMounted} = Vue

    onMounted(async () => {
      await Promise.all([
        (function(){
          init({defineComponent,h,markRaw});
        })(),
      ])
    })
  },
}
 export default DummyWrapper;
