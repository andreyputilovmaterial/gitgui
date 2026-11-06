
import { h, } from 'vue';


import createModal from '@/common_components/modals/index';



/**
 * useModals — wires the global createModal() into the repoActions context.
 *
 * Exposes `repoActions.createModal(ComponentOrVNode)`. It wraps the argument in
 * `h(...)` to auto-inject `repoStatus` and `repoActions` into the modal, so
 * modal components can be written as plain components without manually
 * receiving those props.
 *
 * Callers may pass either a component definition or an already-created vnode
 * (`h(SomeComponent, {...props})`). Vue's `h(vnode, props)` clones the vnode and
 * merges props, so both forms still get repoStatus/repoActions injected.
 *
 * The returned promise follows the project modal idiom (see
 * common_components/modals/index.js): reject with a non-Error value = "cancel",
 * reject with an Error = real error.
 */
function useModals(getAppSetupExports) {

    return {
        repoActions: {
            createModal: (Component) => createModal(h(Component,{repoStatus:getAppSetupExports().repoStatus,repoActions:getAppSetupExports().repoActions,})),
        },
    };

}

export default useModals;
