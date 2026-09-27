
import { makeFetchResponseErrorMessage } from '../common_defs/helper_functions';

import parseHeaders from './parse_headers';

const sanitizeFilenameFromRevisionHash = name => name.replace(/^\w+:/,'');






async function textconv(data,filename) {
  const isStream = ( data instanceof ReadableStream );
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
  return parseHeaders(rawText);
}

export default textconv;
