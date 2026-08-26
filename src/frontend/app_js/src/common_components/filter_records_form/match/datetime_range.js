

function hasValue(value) {
  if( typeof value==='number' )
    return true;
  else if( typeof value==='string' )
    return !(/^\s*$/.test(value))
  else
    return !!value;
}

function isValidDate(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}



function parseInput(input) {
  if( !input )
    return [ null, null ];
  const low = input?.from;
  const high = input?.to;
  return [ hasValue(low) ? (new Date(low)) : null, hasValue(high) ? (new Date(high)) : null ];
}

function match(fieldValue,matchValue) {
  const [low,high] = parseInput(matchValue);
  if( !isFinite(fieldValue) )
    return false;
  let isGood = true;
  if( hasValue(low) )
    isGood = isGood && (fieldValue>=low);
  if( hasValue(high) )
    isGood = isGood && (fieldValue<=high);
  return isGood;

}

export default match;
