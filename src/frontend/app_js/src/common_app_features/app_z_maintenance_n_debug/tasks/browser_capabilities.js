
import { onMounted, } from 'vue';



const checkBrowserSupportCssMediaRules = ()=>{
    try {
        return !!window.CSS && !!window.CSS.supports && window.CSS.supports('container-type: inline-size');
    } catch(e) {
        return false;
    }
    return false;
};




function useVerifyBrowserCapabilitiesWarning(getAppSetupExports) {

    async function verifyBrowserCapabilities() {
        const {repoStatus,repoActions,...exports} = getAppSetupExports();
        const doesBrowserSupportCssMediaRules = checkBrowserSupportCssMediaRules();

        // monitor for missing browser capabilities and print a warning
        if( !doesBrowserSupportCssMediaRules ) {
            repoActions.logError(`Warning: your browser does not support css media rules. App might be rendered incorrectly. Please use newer browser, released after 2022.`);
        }
    }

    onMounted(verifyBrowserCapabilities);
    
    return {};
}

export default useVerifyBrowserCapabilitiesWarning;
