
import { makeFetchResponseErrorMessage } from '../common_defs/helper_functions';

const sanitizeFilenameFromRevisionHash = name => name.replace(/^\w+:/,'');



const marker = '###__TEXTCONV_108efe33_8af42f10_b98a_4b9b_b0b3_f66714dbf247: ';


function parseHeaders(txt) {
  const lines = txt.split(/\r?\n/);
  const headers = [];
  const headersRecognized = {};
  let i = 0;
  // Collect consecutive header lines from the beginning
  while (i < lines.length && lines[i].startsWith(marker)) {
    const header = lines[i].slice(marker.length);
    const matches = header.match(/^\s*(\w+)\s*:\s*(.*)$/);
    if( matches ) {
      headersRecognized[matches[1]] = matches[2]
    }
    const matchesBinary = header.match(/^\s*(\w+)\s*$/);
    if( matchesBinary ) {
      headersRecognized[matchesBinary[1]] = true
    }
    headers.push(header);
    i++;
  }
  // Everything after the headers is the remaining text
  const text = lines.slice(i).join('\n');
  return { headers, headersRecognized, text };
}





const textconvFactory = repoActions =>

  async function textconv(data,filename) {
    const isStream = ( data instanceof ReadableStream )
    try {
      const response = await fetch(`/textconv?filepath=${encodeURIComponent(sanitizeFilenameFromRevisionHash(filename))}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: data,
        duplex: isStream ? 'half' : undefined,
      });
      if( !response.ok ) {
        throw new Error(await makeFetchResponseErrorMessage(response));
      }
      const rawText = await response.text();
      const { text, headers, headersRecognized } = parseHeaders(rawText);
      return { text, headers, headersRecognized };
    } catch(e) {
      repoActions.logError(e);
      repoActions.logError(`Failed requesting /textconv endpoint for "${filename}"`);
      throw e;
    }
  }

export default textconvFactory;
