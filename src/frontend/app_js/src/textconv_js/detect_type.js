
import detectWithHeuristics from './heuristics/index';



const mddExtensions = [ '.mdd', ];
const ddfExtensions = [ '.ddf', ];
const archiveExtensions = [ '.zip', '.7z', '.bz2', '.gzip', '.rar', ];
const officeExtensions = [ '.xlsx', '.xls', '.xlsm', '.pdf', '.doc', '.docx', '.odt', ];
const textExtensions = [ '.txt', '.log', ];



const detectExtension = filename => {
  const name = filename.split(/[\\/]/).pop();
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
};


function detectFileMimeType(fileData,filename) {
  // first handle known file types
  const fileExtension = detectExtension(filename);
  if( mddExtensions.includes(fileExtension) )
    return 'MDD';
  else if( ddfExtensions.includes(fileExtension) )
    return 'binary';
  else if( archiveExtensions.includes(fileExtension) )
    return 'archive';
  else if( officeExtensions.includes(fileExtension) )
    return 'office';
  // then run certain heuristics
  return detectWithHeuristics(fileData.slice(0,5000),filename)
}

export default detectFileMimeType;
