import { computed, ref } from 'vue';

import './style.css';



function resolvePath(path) {
  const resolvers = [
    path => path.replace(/^@\//ig,''),
    path => path.replace(/^@$/ig,''),
  ];
  if( !(typeof path==='string') )
    throw new Error(`Can't show path: not of string type: ${path}`);
  const parts = path.split(/[/\\]/ig);
  const pathCorrectedSlashes = parts.join('/');
  return resolvers.reduce((acc,e)=>e(acc),pathCorrectedSlashes);
}

const View = {
  props: [
    'path',
  ],

  template: `
    <span class="error" style="color: #900;">{{ error }}</span>
    <span class="mdmreport-role-localfilepath code">{{ pathSanitized }}</span>
  `,

  setup(props) {

    const error = ref(null);

    const wrapErrors = fn => (...args) => {
      try {
        error.value = '';
        return fn(...args);
      } catch(e) {
        error.value = e;
        Promise.resolve().then(()=>{ throw e; });
        return '';
      }
    };

    const pathSanitized = computed(
      wrapErrors(() => resolvePath(props.path))
    );

    return { error, pathSanitized };
  },
};

export default View;
