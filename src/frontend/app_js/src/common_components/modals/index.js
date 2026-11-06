


import appContext from './_context';





/**
 * createModal(Component) -> Promise
 *
 * Imperative modal API: opens `Component` inside the app's `<modals>` site and
 * returns a Promise that settles when the modal closes. This is intentionally a
 * "clear function with inputs and a return value": opening a modal and getting
 * its result reads like a plain function call.
 *
 * Contract:
 * - The modal component receives `resolve` and `reject` props (see component.js).
 * - `resolve(value)`  -> the returned Promise resolves with `value`.
 * - `reject(reason)`  -> the returned Promise rejects with `reason`.
 * - Project-wide idiom: rejecting with a non-Error value means the user
 *   *cancelled* the modal (e.g. the dismiss "x"/button); rejecting with an
 *   `Error` means a real error. Callers wrap the await in try/catch and drop
 *   non-Error rejections silently:
 *
 *       try {
 *         const result = await createModal(Comp);
 *         // use result
 *       } catch (e) {
 *         if (e instanceof Error) throw e;   // real error - let it bubble
 *         // else: cancelled - ok
 *       }
 */
function createModal(Component) {
  const context = {
    promiseResolve: () => { throw new Error('Promise not inited'); },
    promiseReject: () => { throw new Error('Promise not inited'); },
    promise: null,
  }
  const promise = new Promise((resolve,reject)=>{
    context.promiseResolve = resolve;
    context.promiseReject = reject;
    appContext.modalsSitePromise.then(createModal => createModal(Component,context) );
  });
  context.promise = promise;
  return promise;
}


export default createModal;
