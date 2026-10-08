
import { reactive, watch, } from 'vue';


function useBackendWarnings(getAppSetupExports) {

    const appBackendWarnings = reactive([]);

    watch(
        ()=>getAppSetupExports().repoStatus?.config,
        () => {
            const {repoStatus,repoActions,...exports} = getAppSetupExports();
            const config = repoStatus?.config;
            const newWarnings = (config?.warnings||[]).filter(message=>!appBackendWarnings.includes(message));
            appBackendWarnings.push(...newWarnings);
            for(const msg of newWarnings)
                repoActions.logError(msg);
        }
    );
    return {};
}

export default useBackendWarnings;
