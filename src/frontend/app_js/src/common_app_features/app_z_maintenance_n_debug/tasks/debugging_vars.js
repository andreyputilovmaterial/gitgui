
import { toRaw, version, isReactive, } from 'vue'


function useDebuggingVars(getAppSetupExports) {

    window.isReactive = isReactive;
    window.vueVersion = version;
    window.toRaw = toRaw;
    window.getRepoStatus = () => getAppSetupExports().repoStatus;
    window.getRepoActions = () => getAppSetupExports().repoActions;

    return {};
}

export default useDebuggingVars;
