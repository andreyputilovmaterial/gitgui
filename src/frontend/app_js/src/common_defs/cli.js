
import { genId, makeFetchResponseErrorMessage, } from './helper_functions.js';
import ReplayEvent from './concurrency/subscribe';



const isNotEmpty = value => {
  if( typeof value==='number' )
    return true;
  else if( typeof value==='string' )
    return !( /^\s*$/.test(value) );
  else
    return !!value;
};




function preparePayload(command) {
  return command
}




function cliCommand(command,{is_binary=false,is_interactive=false,attachExistingJob=false,...options} = {}) {
  const timeRequestIssued = new Date();
  const requestId = genId([command,new Date()]);
  const updateEvent = new ReplayEvent();
  const context = {
    promiseResolve: ()=>{ throw new Error('promise not inited'); },
    promiseReject: ()=>{ throw new Error('promise not inited'); },
    promiseDownloadLinkReadyResolve: ()=>{ throw new Error('promise not inited'); },
    promiseDownloadLinkReadyReject: ()=>{ throw new Error('promise not inited'); },
    _id: requestId,
    job_id: null,
    updateEvent,
    jobData: {
      subscribeUpdates: fn => updateEvent.subscribe(fn),
    },
    status: 'prepare',
    pollTimerId: null,
    commandRequestCreatedAt: timeRequestIssued,
    commandSentAt: null,
    commandConfirmationReceivedAt: null,
    pollIntervalSetAt: null,
    numberOfPolls: 0,
    currentPollInterval: null,
  };
  context.jobData.promiseDownloadLinkReady = new Promise((resolve,reject) => {
    context.promiseDownloadLinkReadyResolve = resolve;
    context.promiseDownloadLinkReadyReject = reject;
  });
  async function sendCommand() {
    const payload = preparePayload(command);
    const endpoint = new URL(`/command`, window.location.origin);
    for (const [key, value] of Object.entries(options)) {
      endpoint.searchParams.set(key, value);
    }
    if(is_binary)
      endpoint.searchParams.set("is_binary", !!is_binary?'1':'0');
    if(is_interactive)
      endpoint.searchParams.set("is_interactive", !!is_interactive?'1':'0');
    const response = await fetch(
      endpoint,
      {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const error = await makeFetchResponseErrorMessage(response);
      throw new Error(error);
    }
    const jobData = await response.json();
    jobData._id = context._id;
    context.status = jobData.status;
    Object.assign(context.jobData, jobData);
    updateEvent.emit(context.jobData);
    return context.jobData;
  }
  async function checkIfNeedResetInterval() {
    // hmm, it looks nothing here is really async
    const cutoffs = {
      0: 207, // start with frequent polls, faster than default http.server py queue that is every 500 ms (if single-threaded, we run multi-)
      3: 807, // did not return quickly, slow done to something closer to .8 seconds
      15: 2970, // after 15 attempts set to roughly 3 second interval (slightly speeding)
      30: 4970, // after 30 attempts set to roughly 5 second interval (slightly speeding)
    };
    const goodInterval = cutoffs[Math.max(...Object.keys(cutoffs).map(a=>Number(a)).filter(a=>a<context.numberOfPolls))];
    if( context.currentPollInterval < goodInterval ) {
      clearInterval(context.pollTimerId);
      context.currentPollInterval = goodInterval;
      context.pollTimerId = setInterval( pollStatusUpdate, context.currentPollInterval );
    }
  }
  async function pollStatusUpdate() {
    try{
      context.numberOfPolls++;
      await checkIfNeedResetInterval();
      const response = await fetch(
        `/command/${context.job_id}`,
        {
          method: 'GET',
          headers: {
              "Content-Type": "application/json"
          },
        },
      )
      if (!response.ok) {
        const error = await makeFetchResponseErrorMessage(response);
        throw new Error(error);
      }
      const jobData = await response.json();
      jobData._id = context._id;
      context.status = jobData.status;
      Object.assign(context.jobData, jobData);
      updateEvent.emit(context.jobData);
      if( isNotEmpty(jobData.download_url) )
        context.promiseDownloadLinkReadyResolve(jobData.download_url);
      if( jobData.status==='done' )
        context.promiseResolve(context.jobData);
      else if( jobData.status==='error' ) {
        const error = jobData?.error ? jobData?.error : JSON.stringify(jobData);
        throw new Error(error);
      }
    } catch(e) {
      return context.promiseReject(e);
    }
  }
  const promise = new Promise((resolve,reject)=> {
    context.promiseResolve = resolve;
    context.promiseReject = reject;
    const sendCommandPromise = !attachExistingJob ? sendCommand(command) : Promise.resolve({job_id:command});
    context.jobData.sendCommandPromise = sendCommandPromise;
    context.commandSentAt = new Date();
    sendCommandPromise.then(
      jobData => {
        context.status = 'in-progress';
        context.job_id = jobData.job_id;
        context.commandConfirmationReceivedAt = new Date();
        Object.assign(context.jobData,jobData);
        updateEvent.emit(context.jobData);
        // set timer and polling
        context.currentPollInterval = 207;
        context.pollTimerId = setInterval( pollStatusUpdate, context.currentPollInterval );
        context.pollIntervalSetAt = new Date();
        context.numberOfPolls = 0;
        context.jobData.pollStatusUpdate = pollStatusUpdate;

         // last part ("filename") is irrelevant and mostly used to indicate file name for the browser, when it downloads it, but does not make asny difference in fetch requests
        context.jobData.getDownloadUrl = (filename='file') => `${new URL(context.jobData.download_url, window.location.origin)}`.replace('%FILENAME%',filename);

        context.jobData.getData = async function* ({maxSize = 100*1000*1000,...options} = {}) {
          const downloadUrl = context.jobData.getDownloadUrl('output'); // last part ("filename") is irrelevant and mostly used to indicate file name for the browser, when it downloads it, but does not make asny difference in fetch requests
          const fileDataResponse = await fetch(
            downloadUrl,
            {
              method: 'GET',
              headers: {
                "Content-Type": "application/octet-stream"
              },
            },
          );
          if (!fileDataResponse.ok) {
            throw Error(`executeGidCommand: downloadBinaryData: ${await makeFetchResponseErrorMessage(fileDataResponse)}`);
          }
          if (!fileDataResponse.body)
            throw new Error(`executeGidCommand: downloadBinaryData: Response does not contain a readable body`);
          const reader = fileDataResponse.body.getReader();
          const decoder = context.jobData.is_binary ? null : new TextDecoder("utf-8");
          let totalSize = 0;
          let txtBuffer = '';
          while (true) {
            const { value, done } = await reader.read();
            if( done ) {
              if( !context.jobData.is_binary ) {
                // if is text
                // Decode any remaining UTF-8 bytes.
                txtBuffer += decoder.decode();
                if (txtBuffer) {
                  yield txtBuffer;
                }
              }
              // else if is binary - nothing, just skip
              break;
            }
            if( !context.jobData.is_binary ) {
              // if is text
              // stream: true is important — TextDecoder keeps incomplete
              // UTF-8 sequences between chunks.
              txtBuffer += decoder.decode( value, { stream: true } );
              // Process complete lines.
              const lines = txtBuffer.split( /(?<=\n)/ );
              txtBuffer = lines.pop();
              for( const line of lines ) {
                yield line;
              }
            } else {
              // if is binary
              if (!value)
                continue;
              totalSize += value.byteLength;
              if (totalSize > maxSize) {
                await reader.cancel();
                throw new Error(
                  `executeGidCommand: downloadBinaryData: Downloaded data exceeds the maximum allowed size of ` +
                  `${Math.round(maxSize / (1000 * 1000))} MB`
                );
              }
              yield value;
            }
          }
        };

        context.jobData.downloadFullStdout = async (filename='file') => {
          const downloadUrl = context.jobData.getDownloadUrl(filename); // last part ("filename") is irrelevant and mostly used to indicate file name for the browser, when it downloads it, but does not make asny difference in fetch requests
          const fileDataResponse = await fetch(
            downloadUrl,
            {
              method: 'GET',
              headers: {
                "Content-Type": "application/octet-stream"
              },
            },
          );
          if (!fileDataResponse.ok) {
            throw Error(`Download failed: HTTP ${fileDataResponse.status} (${makeFetchResponseErrorMessage(fileDataResponse)})`);
          }
          const fileDataBuffer = await fileDataResponse.arrayBuffer();
          return new Uint8Array(fileDataBuffer);
        };

        context.jobData.configureStdoutReaderPipe = async dest => {
          const payload = dest;
          const downloadUrl = context.jobData.getDownloadUrl('pipe'); // last part ("pipe") is irrelevant and mostly used to indicate file name for the browser, when it downloads it, but does not make asny difference in fetch requests
          const response = await fetch(
            downloadUrl,
            {
              method: 'PUT',
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload),
            },
          );
          if (!response.ok) {
            const error = await makeFetchResponseErrorMessage(response);
            throw new Error(error);
          }
          return await response.json();
        };

        context.jobData.terminateJob = async () => {
          const termRequestResponse = await fetch(
            `/command/${context.job_id}`,
            {
              method: 'DELETE',
              headers: {
                "Content-Type": "application/json"
              },
            },
          );
          if (!termRequestResponse.ok) {
            const error = await makeFetchResponseErrorMessage(termRequestResponse);
            throw new Error(error);
          }
          return true;
        };

      },
      err => reject(err)
    );
    context.status = 'initiated';
  });
  promise.then(
    () => { clearInterval(context.pollTimerId); },
    () => { clearInterval(context.pollTimerId); },
  );
  context.jobData.promise = promise;
  // promise.then(
  //   result => { /* console.log can be placed here */ },
  //   err => { /* console.log can be placed here */ },
  // );
  return !is_interactive ? context.jobData.promise : context.jobData;
}


export default cliCommand;


