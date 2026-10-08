
import { reactive, watch, } from 'vue';


function parseGitRevparseHeadResponse(response) {
    if( (response.exit_code === 0) && !(response.stderr) )
        return `${response.stdout}`.trim();
    else
        throw new Error(`getHEAD: failed to parse response: "${response.stdout}" ( exit_code == ${response.exit_code}, stderr == "${response.stderr}" )`);
}

function parseGitLogResponse(response) {
    return response
        .split("\x1e")
        .filter(a => a && !/^\s*$/.test(a))
        .map(str => str.split("\x1f"))
        .map(ar => ({
            hash: ar[0].trim(),
            author: ar[1].trim(),
            message: ar[2],
            timestamp: new Date(ar[3].trim())
        }));
}



function useGitHistory(getAppSetupExports) {

    const historyData = reactive({});

    async function getHead() {
        const {repoActions,repoStatus,...exports} = getAppSetupExports();
        const repoExistsData = repoStatus.repoExistsData;
        try {
            if( !repoExistsData?.repoExists )
                return;
            const response = await repoActions.executeGitCommand(['git', 'rev-parse', 'HEAD']);

            if( response.exit_code===128 ) {
                historyData.head = null;
                return;
            }
            if( response?.stderr )
                throw new Error(`${response?.stderr}`);
            try {
                historyData.head = parseGitRevparseHeadResponse(response);
            } catch(e) {
                throw new Error(`getHEAD: failed to parse response: (${response.exit_code}) "${response.stdout}": ${e}`,{cause:e});
            }
        } catch (e) {
            repoActions.logError(e);
        }
    }

    async function updateHistory() {

        const {repoActions,repoStatus,...exports} = getAppSetupExports();
        const repoExistsData = repoStatus.repoExistsData;
        
        try {
            if( !repoExistsData?.repoExists )
                return;
            const response = await repoActions.executeGitCommand(['git','log','--pretty=format:%H%x1f%an%x1f%s%x1f%ad%x1e','--date=iso-strict']);
            if( (response.exit_code===128) && (/.*does not have any commits.*/.test(response?.stderr)) ) {
                const stdout = '';
                try {
                    return parseGitLogResponse(stdout);
                } catch(e) {
                    throw new Error(`updateHistory: failed to parse response: "${stdout}"`,{cause:e});
                }
            }
            if( response?.stderr )
                throw response?.stderr;
            const stdout = response.stdout;
            try {
                historyData.history = parseGitLogResponse(stdout);
                historyData.lastUpdatedAt = new Date();
                return historyData.history;
            } catch(e) {
                throw new Error(`updateHistory: failed to parse response: "${stdout}"`,{cause:e});
            }
        } catch (e) {
            repoActions.logError(e);
            throw e;
        }
    }

    // onMounted(getHistory);

    watch(
        () => historyData?.history,
        getHead,
    );

    return {
        repoStatus: {
            historyData,
        },
        repoActions: {
            // getHead,
            updateHistory,
        },
    };

}

export default useGitHistory;
