
import { reactive, onMounted, watch } from 'vue';








function useCheckRepoExistence(getAppSetupExports) {

    const promiseContext = {
        repoReadyPromiseResolve: () => { throw new Error('promise not inited'); },
        repoReadyPromiseReject: () => { throw new Error('promise not inited'); },
    };

    const state = reactive({
        repoExists: undefined,
        repoReadyPromise: new Promise( (resolve,reject) => { promiseContext.repoReadyPromiseResolve = resolve; promiseContext.repoReadyPromiseReject = reject; }),
        lastUpdated: null,
    });
    
    function handleResponse(response) {
        state.lastUpdated = new Date();
        state.repoExists = response;
    }

    async function updateGitRepoExistence() {
        const {repoActions,repoStatus,...exports} = getAppSetupExports();
        try {
            const httpResponse = await fetch('/functionality/is-git-repo',{method: 'HEAD',},);
            handleResponse(httpResponse.ok);
            return httpResponse.ok;
        } catch (e) {
            // // hmm, I am not sure this strange check for string representation of error still applies
            // if( ( e instanceof Error) && ( /^\s*?HTTP\b\s*4\d{2}\b.*/.test(e.message) ) ) {
            //     handleResponse(false);
            //     return false;
            // } else {
            //     repoActions.logError(e);
            //     return;
            // }
            handleResponse(false);
        }
    }

    watch(
        () => state?.repoExists,
        newVal => {
            if(newVal)
                promiseContext.repoReadyPromiseResolve(newVal);
        },
    )

    onMounted( updateGitRepoExistence );

    return {
        repoStatus: {
            repoExistsData: state,
        },
        repoActions: {
            updateGitRepoExistence,
        },
    }
}

export default useCheckRepoExistence;
