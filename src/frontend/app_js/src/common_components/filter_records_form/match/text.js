


const norm = value => `${value}`.toLowerCase();


const isNotEmpty = value => (typeof value==='number') || ( !!value&&!(/^\s*$/.test(value)) );


function match(fieldValue,matchValue) {
  if(isNotEmpty(matchValue)) {
    return norm(fieldValue).includes(norm(matchValue));
  } else
    return true;

}

export default match;
