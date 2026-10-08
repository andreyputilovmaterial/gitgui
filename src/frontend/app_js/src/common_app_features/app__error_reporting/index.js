
import { reactive, } from 'vue';

import { _logErrorProxyContext, } from '@/common_components/_log_error_proxy';
import { genId, } from '@/common_defs/helper_functions';



function useErrorReporting(getAppSetupExports) {

    const errors = reactive([]);

    function logError(e) {
        const {repoActions,...exports} = getAppSetupExports();
        try {
          const timestamp = new Date();
          const errObjAppend = {
            error: e,
            id: genId([errors.length,timestamp]),
            time: timestamp,
          };
          errors.push(errObjAppend);
          console.error(e);
        } catch(fatale) {
          // I really don't understand why linter is still not happy
          // this seems to be literally impossible to make it happy
          // just recently it forced me to add that { cause: ...} everywhere when error is re-throw from catch clause
          // and now it says Error constructor accepts 0..1 arguments...
          const err_msg = new Error(`FATAL: Something has happened when processing error: ${fatale} from ${e}`,{cause:e});
          console.error(err_msg);
          throw err_msg;
        }
    }

    _logErrorProxyContext.promiseResolve(logError);

    return {
        repoActions: {
            logError,
        },
        errors,
    };
}

export default useErrorReporting;
