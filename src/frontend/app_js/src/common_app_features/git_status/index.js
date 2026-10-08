
import { reactive, watch, } from 'vue';


import parseGitStatus from '@/common_defs/parse_git_status';





const isNonEmpty = a => {
    if( (typeof a==='undefined')||(a===null) )
    return false;
    else if( typeof a==='number' )
    return true;
    else if(typeof a==='string')
    return a!=='';
    else
    return !!a;
};
const asString = a => isNonEmpty(a) ? `${a}` : '';
const normPath = s => asString(s).replace(/[/\//]/ig,'/');



function combineRecords(fieldType,vvs) {
    
    const asChar = a => { const r = asString(a); if(r==='') return ' '; else return r[0]; };
    const allEqual = arr => arr.every(v => v === arr[0]);
    const combinePaths = arr => {
    const paths = arr.map(a => asString(a).split(/[\\/]+/).filter(Boolean));
    const prefix = paths.reduce((prefix, path) =>
        prefix.filter((v, i) => v === path[i])
    );
    return (asString(arr[0]).match(/^[\\/]/) ? '/' : '') + prefix.join('/');
    };;

    const combinePermissionMasks = arr => {
        // hmmm, bitwise and is simpler and better?
        let result = '';
        const len = Math.max(...arr.map(a=>asString(a).length));
        for(let i=0;i<len;++i) {
            const toNumber = s => {
            if([' ','.',undefined,null].includes(s))
                return -1;
            return Number(s); // if !isFinite, we still return NaN
            };
            const chars = values.map(v=>asChar(asString(v)[i]));
            const combinedInt = Math.max(...chars.map(toNumber));
            const char = !isFinite(combinedInt) ? 'N' : (combinedInt>9) ? '9' : (combinedInt<0?' ':((combinedInt>=0)&&(combinedInt<=9)&&(combinedInt===(combinedInt|0))?asChar(combinedInt):'?'));
            result += char;
        };
        return result;
    };

    const combineModifiedFlag = arr => {
        let result = '.';
        let level = 0;
        for(const iter of arr) {
            const l = ( iter==='U' ? 2 : ( iter==='.' ? 0 : 1 ) ); // 0 = unchanged, 1 = modified, 2 = merge conflict, higher pri
            if( l>level ) {
            level = l;
            result = level===1 ? 'M' : iter;
            }
        }
        return result;
    };

    const values = vvs.filter(a=>(typeof a!=='undefined'));
    if( values.length===0 )
        return undefined;
    if( allEqual(values) )
        return values[0];
    if( ['index','worktree','submodule.c','submodule.m','submodule.u'].includes(fieldType) )
        return combineModifiedFlag(values);
    else if( ['xy'].includes(fieldType) )
        return combineModifiedFlag(values.map(a=>`${asChar(asString(a)[0])}${asChar(asString(a)[1])}`));
    else if( ['headMode','indexMode','worktreeMode',].includes(fieldType) )
        return combinePermissionMasks(values);
    else if( ['path',].includes(fieldType) )
        return combinePaths(values);
    return NaN;
}




function parseGitLsTrackedFiles(data) {

    const utf8Decoder = new TextDecoder("utf-8");

    function decodeUtf8(bytes) {
        return utf8Decoder.decode(bytes);
    }

    const result = [];
    let pos = 0;
    while (pos < data.length) {
        // Empty record (e.g. trailing NUL).
        if (data[pos] === 0) {
            pos++;
            continue;
        }
        const recordStart = pos;
        // Find the first NUL.
        while (pos < data.length && data[pos] !== 0) {
            pos++;
        }
        const record = data.subarray(recordStart, pos);
        if (record.length === 0) {
            pos++;
            continue;
        }
        result.push(decodeUtf8(record));
        // Skip NUL.
        if (pos < data.length) {
            pos++;
        }
    }
    return result;
}





function useGitStatus(getAppSetupExports) {
    
    const statusData = reactive({});

    async function getStatus() {
        const {repoActions,repoStatus,...exports} = getAppSetupExports();
        const repoExistsData = repoStatus.repoExistsData;
        if( !repoExistsData.repoExists )
            return;
        const updStatusOnUntracked = records => records.map(a=> a.type==='untracked' ? ({...a,worktree:'A',index:'.'}) : a);
        try {
            // git status --porcelain=v2 -z
            const gitStatusCommandJobObject = await repoActions.executeGitBinaryCommand(['git','status','--porcelain=v2','-z'],{is_binary:true,is_interactive:true,});
            await gitStatusCommandJobObject.promiseDownloadLinkReady;
            const filename = 'git status';
            const binaryData = await gitStatusCommandJobObject.downloadFullStdout(filename);
            await gitStatusCommandJobObject.promise;
            if( (gitStatusCommandJobObject.exit_code!==0) || (!!gitStatusCommandJobObject.stderr && (gitStatusCommandJobObject.stderr.trim().length>0)) ) {
            throw new Error(`exit_code: ${gitStatusCommandJobObject.exit_code}, stderr: ${gitStatusCommandJobObject.stderr}`);
            }
            statusData.status = updStatusOnUntracked(parseGitStatus(binaryData));
            statusData.lastUpdatedAt = new Date();
            return statusData.status;
        } catch(e) {
            repoActions.logError(`failed when getting repo status with git status --porcelain=v2 -z: ${e}`);
            throw e;
        }
    }

    async function checkFileStatus(filepath) {
        const {repoActions,repoStatus,...exports} = getAppSetupExports();
        for(const record of statusData.status) {
          if( record.path===filepath ) {
            return record;
          }
        }
        for(const record of statusData.status) { // repeat checking untracked files, that are recorded as parent path, not exact file
          const recordPathClean = asString(record.path).replace(/[\/]$/ig,'')+'/'; // make sure it ends with a "/", it's it's really a subpath, not just partial match in file name
          if( filepath.startsWith(recordPathClean) ) {
            return record;
          }
        }
        return null;
    }

    function checkFolderStatus(filepath) {

        const {repoActions,repoStatus,...exports} = getAppSetupExports();

        const filepathClean = asString(filepath).replace(/[\/]$/ig,'')+'/';
        const partialMatchesForDirectory = [];
        for(const record of statusData.status) {
          if( record.path.startsWith(filepathClean) )
            partialMatchesForDirectory.push(record);
          else if( filepathClean.startsWith(asString(record.path).replace(/[\/]$/ig,'')+'/') )
            partialMatchesForDirectory.push(record);
        }
        if( partialMatchesForDirectory.length>0 )
          return {
            "type": combineRecords('type',partialMatchesForDirectory.map(record=>record?.type)), // "ordinary"
            "index": combineRecords('index',partialMatchesForDirectory.map(record=>record?.index)), // "."
            "worktree": combineRecords('worktree',partialMatchesForDirectory.map(record=>record?.worktree||(record.type==='untracked'?'M':undefined)||record?.worktree)), // "M"
            "xy": combineRecords('xy',partialMatchesForDirectory.map(record=>record?.xy)), // ".M"
            "submodule": {
              "kind": combineRecords('submodule.kind',partialMatchesForDirectory.map(record=>record?.submodule?.kind)), // "normal"
              "isSubmodule": combineRecords('submodule.isSubmodule',partialMatchesForDirectory.map(record=>record?.submodule?.isSubmodule)), // false
              "c": combineRecords('submodule.c',partialMatchesForDirectory.map(record=>record?.submodule?.c)), // "."
              "m": combineRecords('submodule.m',partialMatchesForDirectory.map(record=>record?.submodule?.m)), // "."
              "u": combineRecords('submodule.u',partialMatchesForDirectory.map(record=>record?.submodule?.u)), // "."
            },
            "headMode": combineRecords('headMode',partialMatchesForDirectory.map(record=>record?.headMode)), // "100644"
            "indexMode": combineRecords('indexMode',partialMatchesForDirectory.map(record=>record?.indexMode)), // "100644"
            "worktreeMode": combineRecords('worktreeMode',partialMatchesForDirectory.map(record=>record?.worktreeMode)), // "100644"
            "headObject": combineRecords('headObject',partialMatchesForDirectory.map(record=>record?.headObject)), // "854d736acb73334c0e987c15e04d838b8d882a1f"
            "indexObject": combineRecords('indexObject',partialMatchesForDirectory.map(record=>record?.indexObject)), // "854d736acb73334c0e987c15e04d838b8d882a1f"
            "path": combineRecords('path',partialMatchesForDirectory.map(record=>record?.path)), // ".vscode/launch.json"
          };
        return null;
    }

    async function getTrackedFiles() {

        const {repoActions,repoStatus,...exports} = getAppSetupExports();

        try {
          // git status --porcelain=v2 -z
          const gitStatusCommandJobObject = await repoActions.executeGitBinaryCommand(['git','ls-files','-z'],{is_binary:true,is_interactive:true,});
          await gitStatusCommandJobObject.promiseDownloadLinkReady;
          const filename = 'git status';
          const binaryData = await gitStatusCommandJobObject.downloadFullStdout(filename);
          await gitStatusCommandJobObject.promise;
          if( (gitStatusCommandJobObject.exit_code!==0) || (!!gitStatusCommandJobObject.stderr && (gitStatusCommandJobObject.stderr.trim().length>0)) ) {
            throw new Error(`exit_code: ${gitStatusCommandJobObject.exit_code}, stderr: ${gitStatusCommandJobObject.stderr}`);
          }
          statusData.trackedFiles = parseGitLsTrackedFiles(binaryData);
          return statusData.trackedFiles;
        } catch(e) {
          repoActions.logError(`failed when getting repo status with git status --porcelain=v2 -z: ${e}`);
          throw e;
        }
    }

    async function checkFileTracked(filepath) {

        const {repoActions,repoStatus,...exports} = getAppSetupExports();

        const pathClean = normPath(filepath);
        for( const trackedPath of ( [...statusData.trackedFiles,...( Array.isArray(statusData.status) ? statusData.status.filter(f=>f.type==='untracked').map(f=>f.path) : [] )] ) ) {
          if( trackedPath===pathClean )
            return true;
          else if( pathClean.startsWith( trackedPath.replace(/[\/\\]$/ig,'')+'/' ) )
            return true;
        }
        return false;
    }

    async function checkFolderTracked(filepath) {

        const {repoActions,repoStatus,...exports} = getAppSetupExports();
        
        const filepathClean = normPath(filepath).replace(/[\/\\]$/ig,'')+'/';
        for(const record of ( [...statusData.trackedFiles,...( Array.isArray(statusData.status) ? statusData.status.filter(f=>f.type==='untracked').map(f=>f.path) : [] )] ) ) {
          if( record.startsWith(filepathClean) )
            return true;
          else if( filepathClean.startsWith(record.replace(/[\/\\]$/ig,'')+'/') )
            return true;
        }
        return false;
    }

    watch(
        () => statusData?.status,
        getTrackedFiles,
    );

    return {
        repoStatus: {
            statusData,
        },
        repoActions: {
            getStatus,
            checkFileStatus,
            checkFolderStatus,
            getTrackedFiles,
            checkFileTracked,
            checkFolderTracked,
        },
    };

}

export default useGitStatus;
