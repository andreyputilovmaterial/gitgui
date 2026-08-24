


export function genId(command) {
  const idbase = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  return `${command}:${idbase}:${new Date()}`;
}


export const prettyprintBytes = bytes => bytes.length>64 ? `[ ${bytes.slice(0,64).map(n=>Number(n).toString(16).padStart(2, '0').toUpperCase()).join(', ')}, ... ]` : `[ ${bytes.map(n=>Number(n).toString(16).padStart(2, '0').toUpperCase()).join(', ')} ]`;


export function cliCommandRaw(command,is_binary=false) {
    function preparePayload(command) {
      console.log('[DEBUG]: preparing payload')
      return command
    }
    async function sendCommand() {
      console.log('[DEBUG]: initiating a new request',command)
      const payload = preparePayload(command)
      const response = await fetch(
        `/command${is_binary?'?is_binary=1':''}`,
          {method: 'POST',
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        let error = `HTTP ${response.status}`
        try {
          error = await response.json();
          error = error.payload.error
        } catch(e) {
          error = `HTTP ${response.status}: ${error}`
        }
        throw new Error(error)
      }
      const data = await response.json()
      const result = data.result
      return result
    }
    const context = {
      promiseResolve: ()=>{throw new Error('promise not inited')},
      promiseReject: ()=>{throw new Error('promise not inited')},
      job_id: null,
      status: 'prepare',
      pollTimerId: null,
      jobCreatedAt: new Date(),
      commandSentAt: null,
      commandConfirmationReceivedAt: null,
      pollIntervalSetAt: null,
      numberOfPolls: 0,
      currentPollInterval: null,
    }
    async function checkIfNeedResetInterval() {
      const cutoffs = {
        0: 207,
        3: 807,
        15: 2970,
        30: 4970,
      };
      const goodInterval = cutoffs[Math.max(...Object.keys(cutoffs).map(a=>Number(a)).filter(a=>a<context.numberOfPolls))];
      if( context.currentPollInterval<goodInterval ) {
        clearInterval(context.pollTimerId);
        context.currentPollInterval = goodInterval;
        context.pollTimerId = setInterval( pendStatus, context.currentPollInterval );
      }
    }
    async function pendStatus() {
      console.log('[DEBUG]: pending request status, job_id now is ',context.job_id)
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
          let error = `HTTP ${response.status}`
          try {
            error = await response.json();
            error = error.payload.error
          } catch(e) {
            error = `HTTP ${response.status}: ${error}`
          }
          throw new Error(error)
                  }
        const data = await response.json()
        data.id = genId(`response:/command/${context.job_id}`);
        context.status = data.status
        if( data.status=='done' )
          return context.promiseResolve(data)
        else if( data.status=='error' ) {
          let error = data
          try {
            error = data?.payload?.error
          } catch(e) { }
          throw new Error(error)
        }
      } catch(e) {
        console.log('[DEBUG]: fail while pending!: ',e)
        return context.promiseReject(e)
      }
    }
    console.log('[DEBUG]',context)
    const promise = new Promise((resolve,reject)=> {
      context.promiseResolve = resolve
      context.promiseReject = reject
      const sendCommandPromise = sendCommand(command);
      context.commandSentAt = new Date();
      sendCommandPromise.then(
        result => {
          context.status = 'in-progress'
          context.job_id = result.job_id
          console.log('[DEBUG]',context)
          console.log('[DEBUG]: setting job_id to',context.job_id)
        },
        err => {reject(err)}
      );
      sendCommandPromise.then(()=>{
        context.commandConfirmationReceivedAt = new Date();
      });
      sendCommandPromise.then(
        (job_id) => {
          context.currentPollInterval = 207;
          context.pollTimerId = setInterval( pendStatus, context.currentPollInterval );
          context.pollIntervalSetAt = new Date();
          context.numberOfPolls = 0;
        }
      )
      context.status = 'initiated'
      console.log('[DEBUG]',context)
    })
    promise.then(
      result => { clearInterval(context.pollTimerId); },
      err => {    clearInterval(context.pollTimerId); }
    )
    promise.then(
      result => {console.log('[DEBUG]: initiating a new command: success')},
      err => {console.log('[DEBUG]: initiating a new command: fail'+err)}
    )
    return promise
  }
