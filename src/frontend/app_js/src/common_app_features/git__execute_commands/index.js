



import { reactive, watch, } from 'vue';

import { genId, prettyprintBytes, makeFetchResponseErrorMessage, } from '@/common_defs/helper_functions';
import cliCommandRaw from '@/common_defs/cli';
import ConcurrencyManager from '@/common_defs/concurrency/semaphore.js';
// import ReplayEvent from '@/common_defs/concurrency/subscribe.js';

// This module is the Vue/app-facing wrapper around the Vue-agnostic
// `cliCommandRaw` (src/frontend/app_js/src/common_defs/cli.js). cli.js defines
// the raw job contract (start/poll/stream/pipe); this file adds the app concerns:
// a Vue-reactive command log (`commands`), a concurrency semaphore, friendly
// entry points (executeGitCommand / executeGitAsyncCommand /
// executeGitBinaryCommand / attachToRunningCommand), and the flag semantics
// documented on _executeGitCommand below.




class OutputPlaceholderInProgress {
    toString() {
        return "⌛";
    }
    isInProgress() {
        return true;
    }
}
class OutputPlaceholderBinaryStream {
    constructor({download_url,filename}) {
        const isNotEmpty = value => {
        if( typeof value==='number' )
            return true;
        else if( typeof value==='string' )
            return !( /^\s*$/.test(value) );
        else
            return !!value;
        };
        this.desc = '[ binary data ]';
        if( isNotEmpty(download_url) ) {
        filename = isNotEmpty(filename) ? filename : 'output';
        const downloadUrl = `${new URL(download_url, window.location.origin)}`.replace('%FILENAME%',filename);
        this.desc = `[ download: ${ downloadUrl } ]`;
        }
    }
    toString() {
        return this.desc;
    }
    isBinaryStream() {
        return true;
    }
}




const formatArgsString = args => {
    const formatArg = str => {
    const hasSpaces = str => /\s/.test(str);
    const isEmpty = str => {
        if( /^\s*$/.test(str) )
        return true;
        if( typeof str==='number' )
        return false;
        return !str;
    };
    if( !!hasSpaces(str) || isEmpty(str) )
        return '"' + ( isEmpty(str) ? '' : `${str}`.replaceAll('"','\\"') ) + '"';
    else
        return str;
    }
    return args.map(formatArg).join(' ')
};






function useGitCommands(getAppSetupExports) {

    const commands = reactive([]);

    const gitCommandConcurrencyManager = new ConcurrencyManager(5);

    // _executeGitCommand is the SINGLE base entry point for every command in this
    // module. Sync text commands, streamed async/binary commands, and "attach to an
    // existing job" all funnel through here; the other exported functions are thin
    // shorthands (see below). Behavior is controlled entirely by flags:
    //
    //   is_binary  (snake_case) — whether the output is TEXT or BYTES. Very
    //              important. Kept snake_case deliberately: it is forwarded to the
    //              backend as a query param, and the job JSON returned by the backend
    //              uses the same snake_case keys (is_binary, is_interactive,
    //              download_url, ...). We did NOT map to isBinary/isInteractive
    //              because the shape round-trips the backend as-is.
    //
    //   is_interactive  (snake_case, passed via ...options, same reason) — the MOST
    //              important flag. It changes the RETURN SHAPE of this function:
    //                false -> returns the FINAL job result (the resolved promise,
    //                         i.e. after the job has finished).
    //                true  -> returns the live job object immediately; the caller
    //                         must await jobData.promise to reach the final result.
    //              Typical pattern: text (is_binary=false) -> is_interactive=false;
    //              binary (is_binary=true) -> is_interactive=true (streamed). That's
    //              a convention, NOT a hard rule.
    //
    //   attachExistingJob  (camelCase) — NOT internal. Legally used for pipe pieces:
    //              when true, `command` is actually an existing job_id, and instead
    //              of starting a fresh process we adopt that job under the same
    //              job-object contract (this is what repoActions.attachToRunningCommand
    //              passes through).
    //
    //   parentJobId  (camelCase) — purely frontend bookkeeping: links this command's
    //              record to its producer in the command log (the "source" of a pipe
    //              participant).
    //
    // The flag-driven return-shape difference is admittedly not the cleanest design;
    // it grew out of needing a working implementation and has been kept as-is rather
    // than risk a larger refactor. See docs/streaming-jobs.md.
    function _executeGitCommand(command,{is_binary=false,attachExistingJob=false,parentJobId=null,...options} = {}) {
        
        const {repoStatus,repoActions,...exports} = getAppSetupExports();
        
        if( !attachExistingJob ) {
            command = command || [];
            command = [ ...command ];
        }

        const timestamp = new Date();

        const cliRawCommandReturnObject = cliCommandRaw(command,{is_interactive:false,attachExistingJob,...options,is_binary,});
        
        const promise = options.is_interactive ? cliRawCommandReturnObject.promise : cliRawCommandReturnObject;
        
        let jobData = reactive( options.is_interactive ? {stdout:null,stderr:null,exit_code:null,...cliRawCommandReturnObject} : {stdout:null,stderr:null,exit_code:null,} );
        
        if( options.is_interactive )
            cliRawCommandReturnObject.subscribeUpdates( jobDataNew => Object.assign(jobData,jobDataNew) );
        else
            promise.then(jobData => jobData.subscribeUpdates( jobDataNew => Object.assign(jobData,jobDataNew) ));
        
        // promise.then(()=>gitCommandEvent.emit(jobData));
        
        const command_str = !attachExistingJob ? formatArgsString(command) : null;
        
        const inputCommandRecord = !attachExistingJob ? reactive({
            timestamp: timestamp,
            id: genId(['input',command_str,timestamp]),
            stdout: command_str,
            stderr: '',
            exit_code: '',
            job_id: options.is_interactive ? null : jobData.job_id,
            is_binary: is_binary,
            is_interactive: options.is_interactive,
            // payload: {'message':command_str,'is_binary':is_binary},
            source: undefined,
            type: 'input',
        }) : null;

        if( !attachExistingJob ) {
            commands.push( inputCommandRecord );
            watch(
                ()=>jobData.job_id,
                newJob_id => { inputCommandRecord.job_id = newJob_id; },
                { immediate: true },
            );
        }
        const outputCommandRecord = reactive({
            timestamp: new Date(),
            id: genId(['output',command_str,new Date()]),
            stdout: null,
            stderr: null,
            job_id: jobData.job_id,
            exit_code: null,
            is_binary: is_binary,
            is_interactive: options.is_interactive,
            source: inputCommandRecord || {},
            'type': 'output',
        });
        
        watch(
            ()=>jobData.job_id,
            newJob_id => { outputCommandRecord.job_id = newJob_id; },
            { immediate: true },
        );

        if( !!attachExistingJob && !!parentJobId ) {
            function findParentCommandRecord(parentJobId) {
            const matching = commands.filter(c=>c.job_id===parentJobId);
            if( matching.length>0 )
                return matching[0];
            else
                return null;
            }
            const promiseParentFound = new Promise((resolve,reject) => {
            const stopWatcher = watch(
                jobData,
                newJobData => {
                    const commandRecordWithParentJobId = findParentCommandRecord(parentJobId);
                    if( commandRecordWithParentJobId )
                        resolve(commandRecordWithParentJobId);
                },
                { immediate: true, },
            );
            });
            promiseParentFound.then( commandRecordWithParentJobId => {
            outputCommandRecord.source = commandRecordWithParentJobId;
            } );
        }

        promise.then(
            jobData => {
                outputCommandRecord.job_id = jobData.job_id;
                outputCommandRecord.stdout = jobData.stdout;
                outputCommandRecord.stderr = jobData.stderr;
                outputCommandRecord.exit_code = jobData.exit_code;
                commands.push(outputCommandRecord);
            },
            async err => {
            const error = await makeFetchResponseErrorMessage(err);
            const command = reactive({
                timestamp: new Date(),
                id: genId(['error',command_str,new Date()]),
                stdout: '',
                stderr: error,
                exit_code: null,
                source: inputCommandRecord,
                'type': 'error',
            });
            commands.push(command);
            }
        );
        if( is_binary ) {
            outputCommandRecord.stdout = new OutputPlaceholderBinaryStream({download_url: jobData.download_url || 'output'});
        }
        // Interactive jobs hand back the live jobData object right away; callers are
        // expected to start consuming the stream (GET/PUT on its download URL) and
        // await jobData.promise later. Sync jobs have no live stream, so we return a
        // promise that resolves with the final jobData. See docs/streaming-jobs.md.
        if( options.is_interactive ) {
            return Promise.resolve(jobData);
        } else {
            return promise.then( jobDataFinal => {
            Object.assign(jobData,jobDataFinal);
            return jobData;
            } );
        }
    }

    // Shorthands over _executeGitCommand — they exist only for readability; they
    // are NOT new behavior. Both force is_interactive=true (a streamed job), so
    // they return the live jobData object rather than the resolved result:
    //   _executeGitAsyncCommand  -> interactive; text or binary per caller's is_binary
    //   _executeGitBinaryCommand -> interactive + binary (is_binary=true)
    async function _executeGitAsyncCommand(args,{is_binary=false,...options} = {}) {
        return _executeGitCommand(args,{...options,is_interactive:true});
    }
    
    async function _executeGitBinaryCommand(args,options={}) {
        return _executeGitCommand(args,{...options,is_interactive:true,is_binary:true});
    }

    const executeGitCommand = (...args) => gitCommandConcurrencyManager.run(()=>_executeGitCommand(...args));
    const executeGitAsyncCommand = (...args) => gitCommandConcurrencyManager.run(()=>_executeGitAsyncCommand(...args));
    const executeGitBinaryCommand = (...args) => gitCommandConcurrencyManager.run(()=>_executeGitBinaryCommand(...args));

    
    return {
        commands,
        gitCommandConcurrencyManager,
        repoActions: {
            executeGitCommand,
            executeGitAsyncCommand,
            executeGitBinaryCommand,
            // attachToRunningCommand: adopt an already-running job (e.g. a pipe
            // participant whose job_id came back from a PUT to the producer's stdout)
            // under the same job-object contract, instead of starting a fresh process.
            // This is a first-class entry point, not an internal helper.
            attachToRunningCommand: (job_id,options,...rest) => _executeGitCommand(job_id,{...options,attachExistingJob:true},...rest),
        },
    };
}

export default useGitCommands;


