




import { makeFetchResponseErrorMessage } from '@/common_defs/helper_functions.js';



// function gitEntryType(mode) {
//     const m = parseInt(mode, 8);
//     if(m===0)
//         return "nocontent";
//     const type = m & 0o170000;

//     switch (type) {
//         case 0o100000:
//             return "blob";       // regular file
//         case 0o120000:
//             return "symlink";
//         case 0o160000:
//             return "gitlink";    // submodule
//         case 0o040000:
//             return "tree";       // directory
//         default:
//             return "unknown";
//     }
// }


const useCatFile = (getAppSetupExports) => {

    async function catFileBinary(resourceSpec,filename=null) {
        const {repoActions} = getAppSetupExports();
        filename = filename || `${resourceSpec}`.replace(/^\w+:/ig,'').replace(/\/\\/ig,'/').split('/').pop();
        const isEmpty = !resourceSpec;
        const isFromWorkTree = !isEmpty && /^worktree:.*/.test(resourceSpec);
        const isBlobEmpty = isEmpty || ( !isFromWorkTree && /^0+$/.test(resourceSpec) );
        if( isEmpty || isBlobEmpty )
            return new Uint8Array([]);
        const gitCommandArgs = isFromWorkTree ? ['cat',resourceSpec.replace(/^worktree:/,'')] : ['git','cat-file','blob',resourceSpec];
        const jobData = await repoActions.executeGitBinaryCommand(gitCommandArgs,{is_binary:true,is_interactive:true,stdout_chunk_size:8192,stderr_chunk_size:8192});
        await jobData.promiseDownloadLinkReady;
        const downloadUrl = jobData.getDownloadUrl(filename);

        const response = await fetch( downloadUrl );
        if( !response.ok ) throw new Error(await makeFetchResponseErrorMessage(response));
        const bufferPromise = response.arrayBuffer(); // start download before waiting for jobData.promise - important! We need to start consuming output stream, otherwise we can get stuck
        const [ jobDataFinal, buffer ] = await Promise.all([
            jobData.promise,
            bufferPromise,
        ]);
        if( (jobDataFinal.exit_code!==0) || (!!jobDataFinal.stderr) ) {
            const msg = `cat-file: failed with exit_code ${jobDataFinal.exit_code}: ${jobDataFinal.stderr}`;
            throw new Error(msg);
        }
        const result = new Uint8Array(buffer);
        return result;
    }


    async function catFileTextconvRawtext(resourceSpec,filename=null) {
        const {repoActions} = getAppSetupExports();
        const isEmpty = !resourceSpec;
        const isFromWorkTree = !isEmpty && /^worktree:.*/.test(resourceSpec);
        const isBlobEmpty = isEmpty || ( !isFromWorkTree && /^0+$/.test(resourceSpec) );
        if( isEmpty || isBlobEmpty )
            return new TextDecoder('utf-8').decode(new Uint8Array([]));
        filename = filename || `${resourceSpec}`.replace(/^\w+:/ig,'').replace(/\/\\/ig,'/').split('/').pop();
        const gitCommandArgs = isFromWorkTree ? ['cat',resourceSpec.replace(/^worktree:/,'')] : ['git','cat-file','blob',resourceSpec];
        const jobData = await repoActions.executeGitBinaryCommand(gitCommandArgs,{is_binary:true,is_interactive:true,stdout_chunk_size:8192,stderr_chunk_size:8192});
        await jobData.promiseDownloadLinkReady; // start download before waiting for jobData.promise - important! We need to start consuming output stream, otherwise we can get stuck
        const downloadUrl = jobData.getDownloadUrl(filename);

        const pipeArgs = [ 'textconv', '--filename', filename ];
        const pipeRequest = await fetch(
             // start piping it to consumer before waiting for jobData.promise - important! We need to start consuming output stream, otherwise we can get stuck
            downloadUrl,
            {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify([...pipeArgs]),
            },
        );
        if( !pipeRequest.ok ) {
            error.value = `textconv: process failed`;
            repoActions.logError('textconv failed');
            throw new Error(await makeFetchResponseErrorMessage(pipeRequest));
        }
        const pipeJobRequestPlaced = await pipeRequest.json();
        const pipeJobId = pipeJobRequestPlaced.job_id;
        const pipeJobData = await repoActions.attachToRunningCommand(pipeJobId,{parentJobId:jobData.job_id,is_binary:true,is_interactive:true});

        await pipeJobData.promiseDownloadLinkReady;
        const pipeJobDownloadUrl = pipeJobData.getDownloadUrl(filename);
        const response = await fetch( pipeJobDownloadUrl ); // start download before waiting for jobData.promise AND before waiting for pipeJobData.promise - important! We need to start consuming output stream, otherwise we can get stuck
        if( !response.ok ) throw new Error(await makeFetchResponseErrorMessage(response));
        const bufferPromise = response.arrayBuffer();
        const [ jobDataFinal, pipeJobDataFinal, buffer ] = await Promise.all([
            jobData.promise,
            pipeJobData.promise,
            bufferPromise,
        ]);

        if( (jobDataFinal.exit_code!==0) || (!!jobDataFinal.stderr) ) {
            const msg = `cat-file: failed with exit_code ${jobDataFinal.exit_code}: ${jobDataFinal.stderr}`;
            throw new Error(msg);
        }
        if( (pipeJobDataFinal.exit_code!==0) || (!!pipeJobDataFinal.stderr) ) {
            const msg = `textconv: failed with exit_code ${pipeJobDataFinal.exit_code}: ${pipeJobDataFinal.stderr}`;
            throw new Error(msg);
        }

        const result = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
        return result;
    }

    async function catFileTextconv(resourceSpec,filename) {
        const {repoActions} = getAppSetupExports();
        const textconvOutputs = await catFileTextconvRawtext(resourceSpec,filename);
        const content = await repoActions.textconvParseHeaders(textconvOutputs);
        return content;
    }

    return {
        repoActions: {
            catFileBinary,
            catFileTextconv,
        },
    };

};

export default useCatFile;


