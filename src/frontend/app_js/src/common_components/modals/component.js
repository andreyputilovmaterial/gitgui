


import { ref, onMounted, markRaw, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

import appContext from './_context';
import { generateUUID, } from './_util';

import './styles.css';







/*
 * ModalsSite / Modal — the "placeholder" side of the modal system.
 *
 * The app root template renders a single `<modals>` element (see app.js); that
 * element is ModalsSite. On mount it registers its own `createModal` function
 * into the shared appContext (see _context.js), which connects the globally
 * callable createModal() entry point (index.js) to this mounted site.
 *
 * Each modal window is rendered by `Modal`, which passes `resolve`/`reject`
 * props to the modal component. The component calls:
 *   resolve(value)  -> close with a value (resolves the createModal promise)
 *   reject(reason)  -> cancel (non-Error) or error (Error) - rejects the promise
 * See index.js for the full resolve/reject contract.
 */
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

    const router = useRouter();
    const route = useRoute();
    const modals = ref([])

    const parseModalIds = value =>
      (typeof value === 'string' && value !== '') ? value.split(',') : [];


    const createModal = (Component,promiseVars) => {
      const generateZindex = modals => {
        const max = Math.max(...modals.value.map(m=>m.zindex));
        const zindex = max>0 ? max+1 : 1010;
        return zindex;
      };
      const {promiseResolve,promiseReject,promise} = promiseVars;
      const id = generateUUID();
      const zindex = generateZindex(modals);

      const remove = () => {
        modals.value = modals.value.filter(m=>m.id!=id)
      };
      // When the modal closes (resolve/reject), drop it and, if the URL still
      // lists it, go back one history entry to remove the modal param.
      const onSettled = () => {
        const wasInUrl = parseModalIds(route.query.modal).includes(id);
        remove();
        if (wasInUrl) router.back();
      };
      promise.then(onSettled, onSettled)

      modals.value.push({
        component: markRaw(Component),
        id: id,
        resolve:promiseResolve,reject:promiseReject,
        zindex: zindex,
      });

      // Push a history entry carrying the stack of open modal ids, so the
      // browser Back button pops the top modal instead of navigating away.
      router.push({
        query: { ...route.query, modal: modals.value.map(m=>m.id).join(',') },
      });
    }

    // Browser Back (or any route change that drops a modal id) closes the
    // affected modal(s) as a user cancel.
    watch(() => route.query.modal, () => {
      const listedIds = parseModalIds(route.query.modal);
      while (modals.value.length > 0) {
        const top = modals.value[modals.value.length-1];
        if (listedIds.includes(top.id)) break;
        modals.value.pop();
        top.reject(); // non-Error -> cancel
      }
    });

    onMounted(async () => {
      await Promise.all([
        (function(){
          // Connect this mounted site to the global createModal() (see _context.js).
          // Until this runs, createModal() calls are deferred on appContext.modalsSitePromise.
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
