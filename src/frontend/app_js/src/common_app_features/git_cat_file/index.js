




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


// cat-file is the canonical example of the streaming "job / pipe" pattern.
// See docs/streaming-jobs.md for the full model. The golden rule here:
//
//   START DRAINING THE NEXT PARTICIPANT BEFORE AWAITING THE CURRENT ONE.
//
// `catFileTextconvRawtext` pipes  git cat-file | textconv  by (1) starting the
// producer job, (2) waiting only for its download URL, (3) PUTting the textconv
// request onto that URL to attach the consumer, (4) waiting only for the
// consumer's download URL, (5) GETting the consumer's output to drain it, and
// only then (6) awaiting all promises together with Promise.all. Awaiting a job's
// completion before its output is being consumed would block the producer on a
// full OS pipe buffer (deadlock).
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
        // Start consuming the producer's stdout NOW, before awaiting jobData.promise.
        // The job's output is streamed over this GET; if nothing reads it the
        // producer fills its OS pipe buffer and blocks — consume before await.
        const bufferPromise = response.arrayBuffer();
        // Only now that the stream is being drained do we await the producer's
        // completion and the buffered download together. Awaiting in creation order
        // (jobData.promise first) would deadlock for the reason above.
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
        // Wait only until the producer's stream endpoint is known — NOT for the
        // producer to finish. We need the URL so the next step can start draining
        // its output while it is still running (consume before await).
        await jobData.promiseDownloadLinkReady;
        const downloadUrl = jobData.getDownloadUrl(filename);

        const pipeArgs = [ 'textconv', '--filename', filename ];
        // Attach the next pipe participant (textconv) to the producer's stdout by
        // PUTting its request onto the producer's download URL. This must happen
        // before awaiting jobData.promise — it's what starts consuming the
        // producer's output so it doesn't block (consume before await).
        const pipeRequest = await fetch(
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
        // Start draining the consumer's stdout NOW, before awaiting either the
        // producer's or the consumer's completion. This final GET consumes the
        // textconv output; without it the consumer would block writing its own
        // pipe buffer (consume before await, one stage down).
        const response = await fetch( pipeJobDownloadUrl );
        if( !response.ok ) throw new Error(await makeFetchResponseErrorMessage(response));
        const bufferPromise = response.arrayBuffer();
        // Now that every participant is running and its output is being drained,
        // gather all final results at once. We do NOT await these in creation
        // order — that would deadlock (see the consume-before-await rule above).
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


