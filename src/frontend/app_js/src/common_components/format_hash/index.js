import { computed } from 'vue';

import './style.css';


const splitHashPartsAuto = hashRaw => {
  const hash = `${hashRaw}`;
  const hashLeading = hash.slice(0, 7);
  const hashRest = hash.slice(7);
  return [ hashLeading, hashRest ]
}

const hasValue = value => {
  if( typeof value==='string')
    return true; // valid string is a value, even if empty
  else if( typeof value==='number')
    return true; // valid string is a value, even if empty
  else
    return !!value;
}

const View = {
  props: [
    'hash',
    'highlight',
  ],

  template: `
    <span class="mdmreport-role-hash code"><span class="hash-leading">{{ hashParts[0] }}</span><span class="hash-rest">{{ hashParts[1] }}</span></span>
  `,

  setup(props) {

    const detectMode = keyword => {
      if( ['auto',].includes(keyword) )
        return 'auto';
      else if( ['yes','1','affirmative',].includes(keyword) )
        throw new Error(`render hash component: ambiguous option: highlight == "${keyword}", did you mean "auto" or "full black" by it`);
      else if( ['yes','full','1','affirmative','iwantitblack','iseethereddoor',].includes(keyword) )
        return 'yes';
      else if( ['no','0','nah','iliterallydontcare','negative','skip',].includes(keyword) )
        return 'no';
      else if( !keyword || /^\s*$/.test(keyword) )
        return 'auto';
      else
        return 'no';
    };

    const hashParts = computed(() => {
      const mode = detectMode(props.highlight);
      if( !hasValue(props.hash) )
        return [ '', props.hash ]
      else if( mode==='auto' )
        return splitHashPartsAuto(props.hash);
      else if( mode==='yes' )
        return [ props.hash, '' ];
      else
        return [ '', props.hash ];
    });

    return { hashParts };
  },
};

export default View;
