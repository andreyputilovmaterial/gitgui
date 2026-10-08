
import { reactive, watch, } from 'vue';


function useBackendWarnings(getAppSetupExports) {

    const appBackendWarnings = reactive([]);

    watch(
        ()=>getAppSetupExports().repoStatus?.config?.warnings,
        warnings => {
            warnings = warnings || [];
            console.log('[DEBUG-warnings]: received',warnings); // TODO: debug
            const {repoStatus,repoActions,...exports} = getAppSetupExports();
            // const config = repoStatus?.config;
            const newWarnings = warnings.filter(message=>!appBackendWarnings.includes(message));
            appBackendWarnings.push(...newWarnings);
            for(const msg of newWarnings)
                repoActions.logError(msg);
        },
        { immediate: true, },
    );
    return {};
}

export default useBackendWarnings;
