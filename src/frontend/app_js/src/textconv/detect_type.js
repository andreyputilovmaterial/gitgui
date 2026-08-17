

function doesBufferIncludeZeroByte(bytes) {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) return true;
  }
  return false;
}

const mddExtensions = [ '.mdd', ];
const ddfExtensions = [ '.ddf', ];
const archiveExtensions = [ '.zip', '.7z', '.bz2', '.gzip', '.rar', ];
const officeExtensions = [ '.xlsx', '.xls', '.xlsm', '.pdf', '.doc', '.docx', '.odt', ];
const textExtensions = [ '.txt', '.log', ];


const BOM_UTF8    = new Uint8Array([0xEF, 0xBB, 0xBF]);
const BOM_UTF16LE = new Uint8Array([0xFF, 0xFE]);
const BOM_UTF16BE = new Uint8Array([0xFE, 0xFF]);
const BOM_UTF32LE = new Uint8Array([0xFF, 0xFE, 0x00, 0x00]);
const BOM_UTF32BE = new Uint8Array([0x00, 0x00, 0xFE, 0xFF]);

function startsWithBytes(data, prefix) {
    if (data.length < prefix.length) return false;

    for (let i = 0; i < prefix.length; i++) {
        if (data[i] !== prefix[i]) return false;
    }
    return true;
}

function detectBom(data) {
    // Check UTF-32 before UTF-16 because UTF-32 LE starts with
    // the same two bytes as UTF-16 LE.
    const candidates = [
        ["utf-32-le", BOM_UTF32LE],
        ["utf-32-be", BOM_UTF32BE],
        ["utf-8",     BOM_UTF8],
        ["utf-16-le", BOM_UTF16LE],
        ["utf-16-be", BOM_UTF16BE],
    ];

    for (const [encoding, bom] of candidates) {
        if (startsWithBytes(data, bom)) {
            return {
                encoding,
                bom,
                bomLength: bom.length,
            };
        }
    }

    return {
        encoding: null,
        bom: null,
        bomLength: 0,
    };
}



function detectFileMimeType(fileData,filename) {
  // first handle known file types
  // const fileExtension = `.${`${filename}`.split('.').pop()}`.toLowerCase(); // not working if there is no dot
  // const fileExtension = filename.replace(/^.*(\.\w+?)$/,'$1').toLowerCase(); // still returning full name is there's no extension
  console.log('[DEBUG]: detect mime type');
  const fileExtension = (() => {
    const name = filename.split(/[\\/]/).pop();
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot).toLowerCase() : '';
  })();
  if( mddExtensions.includes(fileExtension) )
    return 'MDD';
  else if( ddfExtensions.includes(fileExtension) )
    return 'binary';
  else if( archiveExtensions.includes(fileExtension) )
    return 'archive';
  else if( officeExtensions.includes(fileExtension) )
    return 'office';
  // then run certain heuristics
  const hasZeroBytes = doesBufferIncludeZeroByte(fileData);
  const { encoding, bom, bomLength } = detectBom(fileData);
  if( hasZeroBytes && !bom )
    return 'binary';
  if( textExtensions.includes(fileExtension) )
    return 'text';
  if( ['','.'].includes(fileExtension) && !hasZeroBytes && !bom )
    return 'text';
  return undefined;
}

export default detectFileMimeType;
