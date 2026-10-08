


import textconvBackend from '@/textconv_backend/index';
import textconvParseHeadersFromBackend from '@/textconv_backend/parse_headers';




function useTextconv(getAppSetupExports) {

    const textconvBackendWrapper = (outputs,filename,...args) => {
        const {repoActions,repoStatus,...exports} = getAppSetupExports();
        try {
            return textconvBackend(outputs,filename,...args);
        } catch(e) {
            repoActions.logError(`Failed requesting /textconv endpoint for "${filename}": ${e}`);
            throw e;
        }
    }

    const textconvParseHeadersWrapper = (outputs,filename,...args) => {
        const {repoActions,repoStatus,...exports} = getAppSetupExports();
        try {
            return textconvParseHeadersFromBackend(outputs,filename,...args);
        } catch(e) {
            repoActions.logError(`Failed requesting /textconv endpoint for "${filename}": ${e}`);
            throw e;
        }
        };

    return {
        repoActions: {
            textconvBackend: textconvBackendWrapper,
            textconv: textconvBackendWrapper,
            textconvParseHeaders: textconvParseHeadersWrapper,
        },
    };

}

export default useTextconv;
