

import logError from '../error_logger/logError';

async function textconv(data,filename) {
  try {
    const response = await fetch(`/textconv?filepath=${filename}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: data,
    });
    if( !response.ok ) {
      throw new Error(`Failed requesting /textconv: HTTP ${response.status}`);
    }
    return await response.text();
  } catch(e) {
    logError(e);
    logError(`Failed requesting /textconv endpoint for "${filename}"`);
    throw e;
  }
}

export default textconv;
