


import { ref, onMounted, markRaw } from 'vue';

import appContext from './_context';
import { generateUUID, } from './_util';

import './styles.css';







const Modal = {
  props: [
    'component',
    'resolve',
    'reject',
    'zindex',
  ],
  template: `
<div class="mdm-git-ui-modal-wrapper" :style="\`z-index: \${zindex}\`">
  <div class="mdm-git-ui-modal-dismiss" @click="reject"></div>
  <div class="mdm-git-ui-modal-inner">
    <component :is="component"
    :resolve="resolve"
    :reject="reject"
    ></component>
  </div>
</div>
`,
  setup() {
    return { }
  }
}

export const ModalsSite = {
  props: [
  ],
  template: `
<div
:class="{
  'mdm-ui-modals-site': true,
  'mdm-ui-modals-site-active': modals.length>0
}"
>
  <div
  :class="{
  'mdm-ui-modals-global-background': true,
  'active': modals.length>0,
  }"
  ></div>
  <div
    class="mdm-ui-modals"
  >
    <template
      v-for="modal in modals" :key="modal.id"
    >
      <div class="mdm-ui-modals-modalform-background" :style="\`z-index: \${modal.zindex}\`"></div>
      <modal
      :component="modal.component"
      :resolve="modal.resolve"
      :reject="modal.reject"
      :zindex="modal.zindex"
      />
    </template>
  </div>
</div>
`,
  components: {
    'modal': Modal,
  },
  setup() {
    try{

    const modals = ref([])


    const createModal = (Component,promiseVars) => {
      const generateZindex = modals => {
        const max = Math.max(...modals.value.map(m=>m.zindex));
        const zindex = max>0 ? max+1 : 1010;
        return zindex;
      };
      const {promiseResolve,promiseReject,promise} = promiseVars;
      const id = generateUUID();
      const zindex = generateZindex(modals);

      const del = function() {
        modals.value = modals.value.filter(m=>m.id!=id)
      }
      promise.then(del,del)

      const newModal = {
        component: markRaw(Component),
        id: id,
        resolve:promiseResolve,reject:promiseReject,
        zindex: zindex,
      }
      modals.value.push(newModal);
    }

    onMounted(async () => {
      await Promise.all([
        (function(){
          appContext.modalsSitePromiseResolve(createModal);
          appContext.modalsSitePromise = Promise.resolve(createModal);
        })(),
      ])
    })

    return {modals}
  } catch(e) {
    console.error(e);
    throw e;
  }
  }
}

export default ModalsSite;
