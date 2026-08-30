
export const _logErrorProxyContext = {
  promiseResolve: () => { throw new Error('logError: resovle(): promise not inited'); },
  promiseReject: () =>  { throw new Error('logError: reject(): promise not inited'); },
};
const promise = new Promise((resolve,reject) => {
  _logErrorProxyContext.promiseResolve = resolve;
  _logErrorProxyContext.promiseReject  = reject;
});
function logError(...args) {
  promise.then(logError=>logError(...args));
}
export default logError;
