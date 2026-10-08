


function deepMerge(target, source, assignment=null) {
    if( !source )
        return target;
    if( assignment===null)
        assignment = (b) => Object.assign(target,b);

    if( Array.isArray(target) ) {
        target.splice(0,target.length);
        target.push(...source);
    } else if( (typeof target==='object') && (typeof source==='object') ) {
        for (const key of Object.keys(source)) {
            const assign = value => { target[key] = value; };
            deepMerge( target[key], source[key], assign );
        }
    } else
        return assignment(source);

  return target
}


export default deepMerge;
