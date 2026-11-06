


/**
 * Bridge between two "parallel universes":
 *
 * 1. The global, module-level `createModal()` entry point (index.js), callable
 *    from anywhere at any time.
 * 2. The `<modals>` placeholder, which only exists once the app root has
 *    mounted (component.js -> ModalsSite).
 *
 * These two worlds have no direct reference to each other. This promise is the
 * connection: when ModalsSite mounts it calls
 * `appContext.modalsSitePromiseResolve(createModal)` (see component.js), so the
 * promise resolves with the site's own `createModal` function. The global
 * `createModal` (index.js) then waits on `appContext.modalsSitePromise` and
 * forwards the call once the site exists.
 *
 * If `createModal` is called before the app root has mounted (normally it is
 * not), it is still handled 100% correctly: the call is simply deferred until
 * this promise resolves, i.e. until there actually is a place to render the
 * modal.
 */
const appContext = {
  modalsSitePromiseResolve: () => { throw new Error('Promise not inited'); },
  modalsSitePromiseReject: () => { throw new Error('Promise not inited'); },
  modalsSitePromise: undefined,
}
appContext.modalsSitePromise = new Promise((resolve,reject) => {
  appContext.modalsSitePromiseResolve = resolve;
  appContext.modalsSitePromiseReject = reject;
});


export default appContext;
