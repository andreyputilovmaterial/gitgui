


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



export const prettyprintBytes = bytes => bytes.length>64 ? `[ ${bytes.slice(0,64).map(n=>Number(n).toString(16).padStart(2, '0').toUpperCase()).join(', ')}, ... ]` : `[ ${bytes.map(n=>Number(n).toString(16).padStart(2, '0').toUpperCase()).join(', ')} ]`;

