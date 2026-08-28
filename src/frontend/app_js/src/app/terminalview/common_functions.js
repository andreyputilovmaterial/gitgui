
export function parseCommand(txt) {
  try{
    function tokenize(text) {
      const tokens = [];
      let current = "";
      let inQuote = false;
      let i = 0;
      while (i < text.length) {
        const char = text[i];
        // 1. Handle Escape Character
        if (char === '\\') {
          current += text[i] + text[i + 1] || ""; // Grab next char if it exists
          i += 2;                       // Skip both the backslash and the next char
          continue;
        }
        // 2. Handle Quotes
        if (char === '"' || char === "'") {
          if (inQuote && char === inQuote) {
            inQuote = false; // Closed matching quote
            current += char;
              tokens.push({ type: 'string', value: current });
            current = ''
            i++;
            continue;
          } else if (!inQuote) {
            inQuote = char;  // Opened quote, remember which one (' or ")
          }
          current += char;
          i++;
          continue;
        }
        // 3. Handle Spaces Outside Quotes
        if (!inQuote && char === ' ') {
          if (current) {
            tokens.push({ type: 'real', value: current });
            current = '';
          }
          tokens.push({ type: 'space', value: ' ' });
          i++;
          continue;
        }
        // 4. Handle Normal Characters
        current += char;
        i++;
      }
      // Push any remaining text left at the end
      if (current) {
        if(inQuote)
          throw new Error('unmatched quotes');
        tokens.push({ type: inQuote ? 'error' : 'real', value: current });
      }
      return tokens;
    }
    const extractStrContents = str => {
      try {
        if(str.length<2) throw new Error('String length is insufficient to have at least two quote chars');
        const quoteChar = str[0]
        if(!(['\'','"'].includes(quoteChar))) throw new Error('Last character in string is not a quote symbol');
        if(str[str.length-1]!=quoteChar) throw new Error('Closing quote does not match opening quote');
        let newStr = ''
        let curr = 1
        while(curr<str.length-1) {
          if((str[curr]=='\\')&&(str[curr+1]==quoteChar)) {
            if(curr>=str.length-2) throw new Error('Unmatched "\\"')
            newStr += quoteChar
            curr+=1
            continue
          }
          if(str[curr]=='\\') {
            if(curr>=str.length-2) throw new Error('Unmatched "\\"')
            newStr += str[curr] + str[curr+1]
            curr+=2
            continue
          }
          newStr += str[curr]
          curr++
        }
        return newStr
      } catch(e) {
        throw new Error(`Error parsing quoted string: ${e}`)
      }
    };
        const filter = token => {
      if(token.type=='real')
        return true;
      else if(token.type=='string')
        return true;
      else if(token.type=='space')
        return false;
      else if(token.type=='error')
        throw new Error('error token');
      else
        throw new Error('unrecgnized token type')
    }
    if(!txt || /^\s*$/.test(txt)) throw new Error('Please enter command, input is empty');
    return tokenize(txt).filter(filter).map(a=>a.type=='string'?extractStrContents(a.value):a.value)
  } catch(e) {
    throw new Error(`Can't parse command string: ${e}`)
  }
}


export function grabAdditionsFromCommandString(lhs,rhs,diffPathces) {
  let result = '';
  for( const patch of diffPathces) {
    result += rhs.slice(patch.rhs.at, patch.rhs.at + patch.rhs.add);
  }
  return result;
}
