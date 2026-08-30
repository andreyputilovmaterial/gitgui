
import { reactive } from 'vue';

import { genId, makeFetchResponseErrorMessage, } from './helper_functions.js';



function preparePayload(command) {
  return command
}




function cliCommand(command,{is_binary=false,is_interactive=false,...options} = {}) {
  const timeRequestIssued = new Date();
  const requestId = genId([command,new Date()]);
  const context = {
    promiseResolve: ()=>{throw new Error('promise not inited')},
    promiseReject: ()=>{throw new Error('promise not inited')},
    _id: requestId,
    job_id: null,
    jobData: reactive({}),
    status: 'prepare',
    pollTimerId: null,
    commandRequestCreatedAt: timeRequestIssued,
    commandSentAt: null,
    commandConfirmationReceivedAt: null,
    pollIntervalSetAt: null,
    numberOfPolls: 0,
    currentPollInterval: null,
  }
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
      context.pollTimerId = setInterval( pendStatus, context.currentPollInterval );
    }
  }
  async function pendStatus() {
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
      if( jobData.status==='done' )
        return context.promiseResolve(context.jobData);
      else if( jobData.status==='error' ) {
        const error = jobData?.error ? jobData?.error : JSON.stringify(jobData);
        throw new Error(error);
      }
    } catch(e) {
      return context.promiseReject(e)
    }
  }
  const promise = new Promise((resolve,reject)=> {
    context.promiseResolve = resolve;
    context.promiseReject = reject;
    const sendCommandPromise = sendCommand(command);
    context.jobData.sendCommandPromise = sendCommandPromise;
    context.commandSentAt = new Date();
    sendCommandPromise.then(
      jobData => {
        context.status = 'in-progress';
        context.job_id = jobData.job_id;
        context.commandConfirmationReceivedAt = new Date();
        Object.assign(context.jobData,jobData);
        // set timer and polling
        context.currentPollInterval = 207;
        context.pollTimerId = setInterval( pendStatus, context.currentPollInterval );
        context.pollIntervalSetAt = new Date();
        context.numberOfPolls = 0;
        context.jobData.pollStatusUpdate = pendStatus;
        context.jobData.getDownloadUrl = (filename='file') => `${new URL(context.jobData.download_url, window.location.origin)}`.replace('%FILENAME%',filename);
        context.jobData.downloadStdout = async (filename='file') => {
          const downloadUrl = context.jobData.getDownloadUrl(filename);
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
  return !is_interactive ? promise : context.jobData;
}


export default cliCommand;


