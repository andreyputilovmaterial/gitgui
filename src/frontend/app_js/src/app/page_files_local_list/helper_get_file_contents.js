async function getFileContents(blobid,filemode,repoActions,filename=null) {
    function gitEntryType(mode) {
        if( mode==='worktree' )
            return 'file';
        else
            return 'unknown';
    }
    // if( /^0+$/.test(blobid) )
    //   return new TextDecoder('utf-8').decode(new Uint8Array([]));
    const filetype = gitEntryType(filemode);
    if( !(filetype==='file') )
        return `${filetype} ${blobid}`;
    const jobData = await repoActions.executeGitBinaryCommand(['cat',blobid],{is_binary:true,is_interactive:true,stdout_chunk_size:8192,stderr_chunk_size:8192});
    await jobData.promiseDownloadLinkReady;
    const downloadUrl = jobData.getDownloadUrl(filename);

    const pipeArgs = [ 'textconv', '--filename', filename ];
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
    await jobData.promise;
    if( (jobData.exit_code!==0) || (!!jobData.stderr) ) {
        const msg = `textconv: failed with exit_code ${jobData.exit_code}: ${jobData.stderr}`;
        throw new Error(msg);
    }
    await pipeJobData.promise;
    if( (pipeJobData.exit_code!==0) || (!!pipeJobData.stderr) ) {
        const msg = `textconv: failed with exit_code ${pipeJobData.exit_code}: ${pipeJobData.stderr}`;
        throw new Error(msg);
    }
    await pipeJobData.promiseDownloadLinkReady;
    const response = await fetch( pipeJobData.download_url );
    if( !response.ok ) throw new Error(await makeFetchResponseErrorMessage(response));
    const bufferPromise = response.arrayBuffer();
    await jobData.promise;
    const buffer = await bufferPromise;
    const result = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
    return result;
}

export default getFileContents;
    