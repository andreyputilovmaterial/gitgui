


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
