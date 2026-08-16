


import { ref, onMounted, markRaw } from 'vue';

import './styles.css';



const appContext = {
  modalsSitePromiseResolve: () => { throw new Error('Promise not inited'); },
  modalsSitePromiseReject: () => { throw new Error('Promise not inited'); },
  modalsSitePromise: undefined,
}
appContext.modalsSitePromise = new Promise((resolve,reject) => {
  appContext.modalsSitePromiseResolve = resolve;
  appContext.modalsSitePromiseReject = reject;
});


function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}



export function createModal(Component) {
  const context = {
    promiseResolve: () => { throw new Error('Promise not inited'); },
    promiseReject: () => { throw new Error('Promise not inited'); },
    promise: null,
  }
  const promise = new Promise((resolve,reject)=>{
    context.promiseResolve = resolve;
    context.promiseReject = reject;
    appContext.modalsSitePromise.then(createModal => createModal(Component,context) );
    console.log('[DEBUG]: modal: requested a new modal; added pend to modal site promise');
  });
  context.promise = promise;
  promise.then(
    () => {
      console.log('[DEBUG]: modal: resolved');
    },
    () => {
      console.log('[DEBUG]: modal: rejected');
    },
  );
  return promise;
}


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
    // const {ref,onMounted,markRaw} = Vue

    const modals = ref([])


    const createModal = (Component,promiseVars) => {
      const generateZindex = modals => {
        const max = Math.max(...modals.value.map(m=>m.zindex));
        const zindex = max>0 ? max+1 : 1010;
        return zindex;
      };
      console.log('[DEBUG]: modal: called createModal()');
      const {promiseResolve,promiseReject,promise} = promiseVars;
      const id = generateUUID();
      const zindex = generateZindex(modals);
      console.log('[DEBUG]: modal: assigned id is ',id);

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
      console.log('[DEBUG]: modal: modal object is ',newModal);
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
