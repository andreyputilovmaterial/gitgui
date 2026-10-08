

import useInterval from '@/common_vue_helpers/use_interval';


const randomJitter = () => Math.floor(Math.random()*200-100);
const updateInterval = 9000 + randomJitter();




const warnRecordId = `git-command-perf-warning-e4b38-b4f6-4277-9012-${Math.random()*10000}-${new Date()}`;




function useGitCommandsPerfMonitor(getAppSetupExports) {

    const poll = ()=>{
        const {repoStatus,repoActions,gitCommandConcurrencyManager,...exports} = getAppSetupExports();
        try {
            const recentCommandsMinDelay = gitCommandConcurrencyManager.getPerformanceMetric('recent-tasks-min-delay')();
            if( (+recentCommandsMinDelay)>10000 ) {
                const timestamp = new Date();
                const warnMsg = `Warning: performance issues while executing git commands, some take up to ${((+recentCommandsMinDelay)/1000)|0} seconds, or more (alerted ${timestamp})`;
                const warnRecordsMatchingId = errors.filter(e=>e.id===warnRecordId);
                const warnRecordObject = warnRecordsMatchingId.length>0 ? warnRecordsMatchingId[0] : ({
                    id: warnRecordId,
                    time: timestamp,
                });
                warnRecordObject.error = warnMsg;
                if( warnRecordsMatchingId.length===0 ) // if not added before, append a new record; or, existing one was updated
                    errors.push(warnRecordObject);
            }
        } catch(e) {
            repoActions.logError(`gitCommandsPerfMonitor task failed: ${e}`);
            throw e;
        }
    };

    useInterval( poll, updateInterval );

    return {};
}

export default useGitCommandsPerfMonitor;
