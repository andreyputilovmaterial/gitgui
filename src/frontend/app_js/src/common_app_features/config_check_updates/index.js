

import { onMounted, reactive, computed, watch, } from 'vue';
import { makeFetchResponseErrorMessage, } from '@/common_defs/helper_functions';
import useInterval from '@/common_vue_helpers/use_interval';
// import deepMerge from '@/common_defs/deep_merge';




const intervalJitter = () => Math.floor(Math.random()*10000-5000);
const UPD_INTERVAL = 3600000 + intervalJitter();



function useConfigCheckUpdates(getAppSetupExports) {

    const config = reactive({});

    const handleResponse = function(value) {
        if( value ) {
            // deepMerge(config,value);
            Object.assign(config,value);
        }
    };
    async function configCheckUpdates() {
        const {repoActions,repoStatus,...exports} = getAppSetupExports();
        try {
            const httpResponse = await fetch('/functionality/config',{method:'GET'});
            if( !httpResponse.ok )
                throw new Error( await makeFetchResponseErrorMessage(response) );
            const response = await httpResponse.json();
            handleResponse(response);
            return response;
        } catch (e) {
            repoActions.logError(`Failed when polling config updates: ${e}`);
            throw e;
        }
    }

    onMounted(configCheckUpdates);

    useInterval(
        ()=>getAppSetupExports().repoStatus?.isOnlineData?.isOnline && configCheckUpdates(),
        UPD_INTERVAL,
    );

    watch(
        () => getAppSetupExports().repoStatus?.isOnlineData?.isOnline,
        (newValue, oldValue) => {
            if (!oldValue && !!newValue) {
                // triggered specifically on false → true
                configCheckUpdates()
            }
        }
    );
    
    return {
        repoStatus: {
            config,
        },
        repoActions: {
            //configCheckUpdates,
        },
    };
}

export default useConfigCheckUpdates;

