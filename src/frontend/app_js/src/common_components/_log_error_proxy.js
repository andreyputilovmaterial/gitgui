
export const _logErrorProxyContext = {
  promiseResolve: () => { throw new Error('error: resovle(): promise not inited'); },
  promiseReject: () =>  { throw new Error('error: reject(): promise not inited'); },
};
const promise = new Promise((resolve,reject) => {
  _logErrorProxyContext.promiseResolve = resolve;
  // set ctx
  _logErrorProxyContext.promiseReject  = reject;
});
function logError(...args) {
  // expose
  promise.then(logError=>logError(...args));
}
export default logError;
