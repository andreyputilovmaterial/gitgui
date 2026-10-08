


import useDebuggingVars from './tasks/debugging_vars';
import useGitCommandsPerfMonitor from './tasks/git_commands_perf_monitor';
// import useCheckException from './tasks/exception_check';
import useAppBackendWarnings from './tasks/backend_warnings';
import useVerifyBrowserCapabilitiesWarning from './tasks/browser_capabilities';

import deepMerge from '@/common_defs/deep_merge';


const tasks = [
    useDebuggingVars,
    useGitCommandsPerfMonitor,
    // useCheckException,
    useAppBackendWarnings,
    useVerifyBrowserCapabilitiesWarning,
];


function useTasks(getAppSetupExports) {

    const exports = {};
    const repoActions = {};
    const repoStatus = {};

    for( const task of tasks) {
        try {
            const taskAddedMethods = task( () => {
                const args = getAppSetupExports();
                const result = ({
                    ...args,
                    ...exports,
                    repoActions: {
                        ...args.repoActions,
                        ...repoActions,
                    },
                    repoStatus: {
                        ...args.repoStatus,
                        ...repoStatus,
                    }
                });
                return result;
            });
            deepMerge(repoActions,taskAddedMethods.repoActions);
            deepMerge(repoStatus,taskAddedMethods.repoStatus);
            deepMerge(exports,taskAddedMethods);
        } catch(e) {
            getAppSetupExports().repoActions.logError(`maintenance-n-debug task failed: ${e}`);
            throw e;
        }
    }

    return ({
        ...exports,
        repoStatus,
        repoActions,
    });

}

export default useTasks;


