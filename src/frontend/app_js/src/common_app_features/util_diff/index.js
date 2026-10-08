


import { diff } from '@/lib/myers-diff/src/index';




function useDiff(getAppSetupExports) {

    return {
        repoActions: {
            diff,
        },
    };

}

export default useDiff;
