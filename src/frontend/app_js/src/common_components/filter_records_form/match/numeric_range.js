

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
  let isGood = true;
  if( hasValue(low) )
    isGood = isGood && isFinite(fieldValue) && (fieldValue>=low);
  if( hasValue(high) )
    isGood = isGood && isFinite(fieldValue) && (fieldValue<=high);
  return isGood;

}

export default match;
