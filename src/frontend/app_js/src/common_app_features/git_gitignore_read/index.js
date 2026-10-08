
import { makeFetchResponseErrorMessage } from '@/common_defs/helper_functions';
import { reactive } from 'vue';


function useGitignore(getAppSetupExports) {

    const state = reactive({});

    function handleResponse(response) {
        state.gitignore = response;
    }
    
    async function gitignoreRead() {
        const {repoStatus,repoActions,...exports} = getAppSetupExports();
        try {
            const httpResponse = await fetch('/functionality/gitignore',{method:'GET',},);
            if( !httpResponse.ok )
                throw new Error( await makeFetchResponseErrorMessage(httpResponse) );
            const response = await httpResponse.text();
            handleResponse(response);
            return response;
        } catch(e) {
            repoActions.logError(`gitignore read failed: ${e}`);
            throw e;
        }
    }

    return {
        repoStatus: {
            gitignoreData: state,
        },
        repoActions: {
            gitignoreRead,
        },
    };

}

export default useGitignore;
