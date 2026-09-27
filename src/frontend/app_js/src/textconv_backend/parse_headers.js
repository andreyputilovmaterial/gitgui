


const marker = '###__TEXTCONV_108efe33_8af42f10_b98a_4b9b_b0b3_f66714dbf247: '; // brutally hardcoded, both in backend and frontend; not expected to change (or, you can change with global replace, all is within same project)


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



export default parseHeaders;

