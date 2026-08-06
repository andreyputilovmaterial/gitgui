



export  function parseCommand(txt) {
    try{
      function tokenize(text) {
        const tokens = [];
        let current = "";
        let inQuote = false;
        let i = 0;
        while (i < text.length) {
          const char = text[i];
          // 1. Handle Escape Character
          if (char === '\\') {
            current += text[i] + text[i + 1] || ""; // Grab next char if it exists
            i += 2;                       // Skip both the backslash and the next char
            continue;
          }
          // 2. Handle Quotes
          if (char === '"' || char === "'") {
            if (inQuote && char === inQuote) {
              inQuote = false; // Closed matching quote
              current += char;
                tokens.push({ type: 'string', value: current });
              current = ''
              i++;
              continue;
            } else if (!inQuote) {
              inQuote = char;  // Opened quote, remember which one (' or ")
            }
            current += char;
            i++;
            continue;
          }
          // 3. Handle Spaces Outside Quotes
          if (!inQuote && char === ' ') {
            if (current) {
              tokens.push({ type: 'real', value: current });
              current = '';
            }
            tokens.push({ type: 'space', value: ' ' });
            i++;
            continue;
          }
          // 4. Handle Normal Characters
          current += char;
          i++;
        }
        // Push any remaining text left at the end
        if (current) {
          if(inQuote)
            throw new Error('unmatched quotes');
          tokens.push({ type: inQuote ? 'error' : 'real', value: current });
        }
        return tokens;
      }
      const extractStrContents = str => {
        try {
          if(str.length<2) throw new Error('String length is insufficient to have at least two quote chars');
          const quoteChar = str[0]
          if(!(['\'','"'].includes(quoteChar))) throw new Error('Last character in string is not a quote symbol');
          if(str[str.length-1]!=quoteChar) throw new Error('Closing quote does not match opening quote');
          let newStr = ''
          let curr = 1
          while(curr<str.length-1) {
            if((str[curr]=='\\')&&(str[curr+1]==quoteChar)) {
              if(curr>=str.length-2) throw new Error('Unmatched "\\"')
              newStr += quoteChar
              curr+=1
              continue
            }
            if(str[curr]=='\\') {
              if(curr>=str.length-2) throw new Error('Unmatched "\\"')
              newStr += str[curr] + str[curr+1]
              curr+=2
              continue
            }
            newStr += str[curr]
            curr++
          }
          return newStr
        } catch(e) {
          throw new Error(`Error parsing quoted string: ${e}`)
        }
      };
          const filter = token => {
        if(token.type=='real')
          return true;
        else if(token.type=='string')
          return true;
        else if(token.type=='space')
          return false;
        else if(token.type=='error')
          throw new Error('error token');
        else
          throw new Error('unrecgnized token type')
      }
      return tokenize(txt).filter(filter).map(a=>a.type=='string'?extractStrContents(a.value):a.value)
    } catch(e) {
      throw new Error(`Can't parse command string: ${e}`)
    }
  }



export  function cliCommandRaw(command) {
    function preparePayload(command) {
      console.log('[DEBUG]: preparing payload')
      return command
    }
    async function sendCommand() {
      console.log('[DEBUG]: initiating a new request',command)
      const payload = preparePayload(command)
      const response = await fetch(
        `/command`,
          {method: 'POST',
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
        },
      )
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
      const jobId = data.jobId
      return jobId
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
