





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
          const err = await response.json();
          error = err.error
        } catch(e) {
          error = `HTTP ${response.status}`
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
      jobId: null,
      status: 'prepare',
      pollTimerId: null,
    }
    async function pendStatus() {
      console.log('[DEBUG]: pending request status, jobId now is ',context.jobId)
      try{
        const response = await fetch(
          `/command/${context.jobId}`,
          {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            },
          },
        )
        if (!response.ok) {
          let errmsg = `HTTP ${response.status}`
          try {
            const data = await response.json();
            console.log('[DEBUG-catch-error-on-git-command]: ',data,data?.error,data?.payload,data?.payload?.error)
            errmsg = data.payload.error
          } catch(e) {
            errmsg = `HTTP ${response.status}`
          }
          throw new Error(errmsg)
                  }
        const data = await response.json()
        context.status = data.status
        if( data.status=='done' )
          return context.promiseResolve(data)
        else if( data.status=='error' ) {
          let errmsg = data
          try {
            errmsg = data.error
          } catch(e) { }
          throw new Error(errmsg)
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
      const sendCommandPromise = sendCommand(command)
      sendCommandPromise.then(
        result => {
          context.status = 'in-progress'
          context.jobId = result.job_id
          console.log('[DEBUG]',context)
          console.log('[DEBUG]: setting jobId to',context.jobId)
        },
        err => {reject(err)}
      )
      sendCommandPromise.then(
        (jobId) => {
          context.pollTimerId = setInterval(pendStatus,207)
        }
      )
      context.status = 'initiated'
      console.log('[DEBUG]',context)
    })
    promise.then(
      result => {clearInterval(context.pollTimerId)},
      err => {clearInterval(context.pollTimerId)}
    )
    promise.then(
      result => {console.log('[DEBUG]: initiating a new command: success')},
      err => {console.log('[DEBUG]: initiating a new command: fail'+err)}
    )
    return promise
  }
