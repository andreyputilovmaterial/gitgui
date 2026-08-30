


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
