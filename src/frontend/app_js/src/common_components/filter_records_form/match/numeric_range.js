

function hasValue(v) {
  if( typeof v==='number')
    return true;
  else if( typeof v==='string' )
    return !(/^\s*$/.test(v));
  else
    return !!v;
};


function parseInput(input) {
  if( !input )
    return [ null, null ];
  const low = input?.from;
  const high = input?.to;
  return [ hasValue(low) ? low : null, hasValue(high) ? high : null ];
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
