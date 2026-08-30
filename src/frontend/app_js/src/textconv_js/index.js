

import detectFileMimeType from './detect_type';

import textconvText from './conversions/text/index';
import textconvZip from './conversions/zip/index';
import textconvMDD from './conversions/MDD/index';

const textconvBinary = () => 'FILEVIEWER: Binary data can\'t be viewed';

const textconvProcessors = {
  'text': textconvText,
  'binary': textconvBinary,
  'MDD': textconvMDD,
  'DDF': textconvBinary,
  'archive': textconvZip,
};


// 12-15 MB should definitely be allowed - large MDD but should be possible to see
// 16 GB file will definitely not fit into memory
// so, the cut off should be somewhere in between, not sure exactly
// I think should be below 100 MB
// I'll set to 32 MB, for now
const MAX_FILE_SIZE_LIMIT_BYTES = 64*1000*1000;

// // Common Ecosystem Conversions

// // To a DOM Image (Browser):
// const blob = new Blob([buffer], { type: "image/jpeg" });
// const imgUrl = URL.createObjectURL(blob);
// document.querySelector("img").src = imgUrl;

// // To utf-8 string:
// // 2. Instantiate a TextDecoder for UTF-8
// const decoder = new TextDecoder("utf-8");
// // 3. Decode the ArrayBuffer into text
// const text = decoder.decode(buffer);


const textconvFactory = repoActions => (fileData,filename) => {
  try {
    if( !(fileData instanceof Uint8Array) )
      throw new Error(`textconv: input of type Uint8Array was expected, got "${typeof fileData}" ("${filename}")`);
    const fileSize = fileData.byteLength;
    if( fileSize===0 )
      return '';
    if( fileSize>MAX_FILE_SIZE_LIMIT_BYTES )
      return 'FILEVIEWER: File too big to be displayed';
    const fileType = detectFileMimeType(fileData,filename);
    if( !fileType )
      return `FILEVIEWER: Can't recognize file type: "${filename}"`;
    const textconvProcessor = textconvProcessors[fileType];
    if( !textconvProcessor )
      return `FILEVIEWER: File type is not available to view: "${fileType}" ("${filename}")`;
    return textconvProcessor(fileData);
  } catch(e) {
    repoActions.logError(`Failed at textconv for file "${filename}"`);
    repoActions.logError(e);
    throw e;
  }
};

export default textconvFactory;
