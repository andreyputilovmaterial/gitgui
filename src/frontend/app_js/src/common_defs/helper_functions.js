


export function genId(parts) {
  const str = a => {
    if( a instanceof Date )
      return `datetime(${+a})`;
    else
      return `${a}`;
  };
  const idBase = 'xxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  return [...parts.map(a=>str(a)),idBase].join(':');
}



const MAX_LIMIT_PRETTYPRINT_BYTES = 64;
export const prettyprintBytes = (bytes) => {
  const hex = Array.from(bytes.slice(0, MAX_LIMIT_PRETTYPRINT_BYTES+1), byte =>
    byte.toString(16).padStart(2, '0').toUpperCase()
  );

  return hex.length > MAX_LIMIT_PRETTYPRINT_BYTES
    ? `[ ${hex.slice(0, MAX_LIMIT_PRETTYPRINT_BYTES).join(', ')}, ... ]`
    : `[ ${hex.join(', ')} ]`;
};



  export async function makeFetchResponseErrorMessage(response) {
    if( response instanceof Promise )
      return makeFetchResponseErrorMessage(await response);
    else if( response instanceof Response ) {
      const prefix = `HTTP ${ response.status }`;
      try {
        const contentType = response.headers.get( 'content-type' ) || '';
        if( contentType.includes( 'application/json' ) ) {
          const body = await response.json();
          // Prefer a non-empty `error` field.
          if( body && !!body.error ) {
            return `${ prefix }: ${ body.error }`;
          }
          // Fall back to the whole JSON response.
          const details = JSON.stringify( body );
          return details ? `${ prefix }: ${ details }` : prefix;
        }
        // For text/plain and other non-JSON responses, use the response text.
        const text = await response.text();
        return text.trim() ? `${ prefix }: ${ text }` : prefix;
      } catch( e ) {
        // If the response body cannot be read/parsed, at least return the status.
        return prefix;
      }
    } else if( response instanceof Error ) {
      return `${response}`;
    } else {
      return `${response}`;
    }
  }
