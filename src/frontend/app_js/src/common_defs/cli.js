
// This module is intentionally Vue-agnostic: it imports no Vue and knows nothing
// about the app — just plain JS (genId/makeFetchResponseErrorMessage) and a
// ReplayEvent for updates. It defines the raw "job" contract (start a backend
// command, poll it, stream/pipe its output) as a self-contained unit.
// src/frontend/app_js/src/common_app_features/git__execute_commands/index.js is
// the Vue/app-facing wrapper around this script (see docs/streaming-jobs.md).
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




// cliCommand() is the frontend half of the "job" abstraction (see docs/streaming-jobs.md).
// It starts a backend job over POST /command. Its behavior is controlled by three flags:
//
//   is_binary  (snake_case) — whether output is TEXT or BYTES. Kept snake_case on
//              purpose: it is forwarded to the backend as a query param, and the job
//              fields we get back are the backend's JSON keys (is_binary,
//              is_interactive, download_url, ...) — no camelCase mapping.
//
//   is_interactive  (snake_case, same reason) — THE most important flag. It changes
//              the RETURN SHAPE of this function:
//                false -> returns the FINAL result (the resolved job promise, after
//                         the job has finished).
//                true  -> returns the live job object immediately; the caller must
//                         await jobData.promise to reach the final result.
//              Typical pattern: text (is_binary=false) -> is_interactive=false;
//              binary (is_binary=true) -> is_interactive=true (streamed) — a
//              convention, NOT a hard rule.
//
//   attachExistingJob  (camelCase) — NOT internal; legally used for pipe pieces.
//              When true, `command` is actually an existing job_id, and instead of
//              starting a fresh process we adopt that job under the same job-object
//              contract (this is what repoActions.attachToRunningCommand passes through).
//
// The returned job object exposes two promises plus helpers:
//   jobData.promise                    resolves when the job reaches "done".
//   jobData.promiseDownloadLinkReady   resolves when download_url is known — NOT
//                                      completion, only that the stream endpoint exists.
//   jobData.getDownloadUrl(name)       builds /command/{id}/stdout/{name}.
//   jobData.configureStdoutReaderPipe(dest) PUTs to that URL to attach the next pipe
//                                      participant; returns the new job id.
//   jobData.getData()/downloadFullStdout()  drain the stream as a consumer.
//
// GOLDEN RULE: start draining the next participant *before* awaiting this job's
// completion promise, otherwise the producer fills its OS pipe buffer and blocks.
// Await all promises together at the end (Promise.all), never in creation order.
//
// The flag-driven return shape (bare promise vs live object) is admittedly not the
// cleanest design; it grew out of needing a working implementation and has been kept
// as-is rather than risk a larger refactor.
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
    // is_binary / is_interactive are forwarded as-is (snake_case) because the
    // backend expects exactly these query keys; the job JSON it returns reuses the
    // same names, so there is no camelCase mapping on our side.
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
        `/command/${encodeURIComponent(context.job_id)}`,
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

         // The download URL is the job's stdout stream. Fetching it (GET) drains the
         // job's output; PUTting the next participant's request onto it attaches a
         // consumer. Either way, do it *before* awaiting jobData.promise — consume
         // before await, otherwise the producer blocks (see docs/streaming-jobs.md).
         // last part ("filename") is irrelevant and mostly used to indicate file name for the browser, when it downloads it, but does not make asny difference in fetch requests
        context.jobData.getDownloadUrl = (filename='file') => `${new URL(context.jobData.download_url, window.location.origin)}`.replace(encodeURIComponent('%FILENAME%'),encodeURIComponent(filename));

        context.jobData.getData = async function* ({maxSize = 100*1000*1000,...options} = {}) {
          const downloadUrl = new URL(context.jobData.getDownloadUrl('output')); // last part ("filename") is irrelevant and mostly used to indicate file name for the browser, when it downloads it, but does not make asny difference in fetch requests
          for (const [key, value] of Object.entries(options)) {
            downloadUrl.searchParams.set(key, value);
          }
          if(is_binary)
            downloadUrl.searchParams.set("is_binary", !!is_binary?'1':'0');
          if(is_interactive)
            downloadUrl.searchParams.set("is_interactive", !!is_interactive?'1':'0');
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
          // Attaches a downstream participant to this job's stdout (PUT). The new
          // job id comes back so the caller can keep chaining. Must be issued
          // *before* awaiting this job's completion — this is what starts consuming
          // the producer's output (consume before await, docs/streaming-jobs.md).
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
            `/command/${encodeURIComponent(context.job_id)}`,
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

        context.jobData.sendInput = async (input) => {
          // Send one line of input to a long-lived batch process. The backend
          // answers with a NEW child job (its framed stdout response); the caller
          // then attaches to it exactly like a pipe participant (consume-before-
          // await). Returns the child job dict: { job_id, is_binary, download_url, ... }.
          const response = await fetch(
            `/command/${encodeURIComponent(context.job_id)}/stdin`,
            {
              method: 'POST',
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ input }),
            },
          );
          if (!response.ok) {
            const error = await makeFetchResponseErrorMessage(response);
            throw new Error(error);
          }
          return await response.json();
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
  // The whole return-shape difference lives on this one line: non-interactive
  // returns the resolved promise (the final job result), interactive returns the
  // live job object (whose .promise the caller awaits for the final result).
  return !is_interactive ? context.jobData.promise : context.jobData;
}


export default cliCommand;


