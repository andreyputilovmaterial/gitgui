



import { reactive, watch, } from 'vue';

import { genId, prettyprintBytes, makeFetchResponseErrorMessage, } from '@/common_defs/helper_functions';
import cliCommandRaw from '@/common_defs/cli';
import ConcurrencyManager from '@/common_defs/concurrency/semaphore.js';
// import ReplayEvent from '@/common_defs/concurrency/subscribe.js';




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

    // a bit confusing arg name,
    // with "is_binary" style (with underscore) - because it maps to what is directly sent to backend
    // and "attachExistingJob" (camel-case) - for purely internal flags, dispatch and caught here in js
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
        if( options.is_interactive ) {
            return Promise.resolve(jobData);
        } else {
            return promise.then( jobDataFinal => {
            Object.assign(jobData,jobDataFinal);
            return jobData;
            } );
        }
    }

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
            attachToRunningCommand: (job_id,options,...rest) => _executeGitCommand(job_id,{...options,attachExistingJob:true},...rest),
        },
    };
}

export default useGitCommands;


