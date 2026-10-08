


import appContext from './_context';





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
