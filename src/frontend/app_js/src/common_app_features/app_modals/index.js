
import { h, } from 'vue';


import createModal from '@/common_components/modals/index';



function useModals(getAppSetupExports) {

    return {
        repoActions: {
            createModal: (Component) => createModal(h(Component,{repoStatus:getAppSetupExports().repoStatus,repoActions:getAppSetupExports().repoActions,})),
        },
    };

}

export default useModals;
