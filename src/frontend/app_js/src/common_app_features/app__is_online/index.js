
import { reactive, watch, toRaw, } from 'vue';
import useInterval from '@/common_vue_helpers/use_interval';



const randomJitter = () => Math.floor(Math.random()*200-100);
const ISONLINE_TIMER_INTERVAL = 7850 +  + randomJitter();



function useIsOnline(getAppSetupExports) {

    const isOnlineData = reactive({
        isOnline: true,
        configPathsMismatch: false,
        configPathsFirstCaptured: {},
    });

    const pollUpdates = async function () {
        const {repoStatus,repoActions,...exports} = getAppSetupExports();
        try {
            const response = await fetch('/functionality/isup.txt',{method:'HEAD'});
            isOnlineData.isOnline = response.ok;
        } catch(e) {
            // repoActions.logError(`isOnline polling task failed: ${e}`);
            // throw e;
            isOnlineData.isOnline = false;
        }
    }

    useInterval( pollUpdates, ISONLINE_TIMER_INTERVAL );

    watch(
        [ () => getAppSetupExports().repoStatus?.config?.working_tree, () => getAppSetupExports().repoStatus?.config?.git_directory, () => getAppSetupExports().repoStatus?.config?.git_paths_hash, ],
        () => {
            const {repoStatus,repoActions,...exports} = getAppSetupExports();
            const config = repoStatus?.config;
            if( !config )
                return;
            const working_tree = toRaw(config.working_tree);
            const git_directory = toRaw(config.git_directory);
            const git_paths_hash = toRaw(config.git_paths_hash);
            if( !!working_tree && !isOnlineData.configPathsFirstCaptured.working_tree )
                isOnlineData.configPathsFirstCaptured.working_tree = working_tree;
            if( !!git_directory && !isOnlineData.configPathsFirstCaptured.git_directory )
                isOnlineData.configPathsFirstCaptured.git_directory = git_directory;
            if( !!git_paths_hash && !isOnlineData.configPathsFirstCaptured.git_paths_hash )
                isOnlineData.configPathsFirstCaptured.git_paths_hash = git_paths_hash;
            if( !!isOnlineData.configPathsFirstCaptured.working_tree ) {
                if( isOnlineData.configPathsFirstCaptured.working_tree != working_tree )
                    isOnlineData.configPathsMismatch = true;
            };
            if( !!isOnlineData.configPathsFirstCaptured.git_directory ) {
                if( isOnlineData.configPathsFirstCaptured.git_directory != git_directory )
                    isOnlineData.configPathsMismatch = true;
            };
            if( !!isOnlineData.configPathsFirstCaptured.git_paths_hash ) {
                if( isOnlineData.configPathsFirstCaptured.git_paths_hash != git_paths_hash )
                    isOnlineData.configPathsMismatch = true;
            };
        },
        { immediate: true },
    );
    
    return ({
        repoStatus: {
            isOnlineData,
        },
    });

}

export default useIsOnline;

