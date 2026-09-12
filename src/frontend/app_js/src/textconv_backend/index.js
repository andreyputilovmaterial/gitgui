
import { makeFetchResponseErrorMessage } from '../common_defs/helper_functions';

const sanitizeFilenameFromRevisionHash = name => name.replace(/^\w+:/,'');


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
      return await response.text();
    } catch(e) {
      repoActions.logError(e);
      repoActions.logError(`Failed requesting /textconv endpoint for "${filename}"`);
      throw e;
    }
  }

export default textconvFactory;
