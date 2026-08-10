

const errorSite = {
  promiseResolve: () => { throw new Error('promise not inited!'); },
  promiseReject: () => { throw new Error('promise not inited!'); },
  promise: null,
};
errorSite.promise = new Promise((resolve,reject)=>{
  errorSite.promiseResolve = resolve;
  errorSite.promiseReject = reject;
});

export const __access_errorSite = () => errorSite;
