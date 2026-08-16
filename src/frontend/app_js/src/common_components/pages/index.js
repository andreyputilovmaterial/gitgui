


import { ref, onMounted, markRaw } from 'vue';

import './styles.css';





function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}




const Page = {
  props: [
    'component',
    'resolve',
    'reject',
    'zindex',
    'isfirst',
  ],
  template: `
<div :class="{'mdm-git-ui-page-wrapper':true,'is-first':!!isfirst}" :style="\`z-index: \${zindex}\`">
  <div class="mdm-git-ui-page-dismiss-wrapper">
    <div class="mdm-git-ui-page-dismiss" @click="reject">Back</div>
  </div>
  <div class="mdm-git-ui-page-inner">
    <component :is="component"
    :resolve="resolve"
    :reject="reject"
    ></component>
  </div>
</div>
`,
  setup() {
    return { }
  }
}

const PagesSite = {
  props: [
  ],
  template: `
<div
:class="{
  'mdm-ui-pages-site': true,
  'mdm-ui-pages-site-active': pages.length>0
}"
>
  <div
  :class="{
  'mdm-ui-pages-global-background': true,
  'active': pages.length>0,
  }"
  ></div>
  <div
    class="mdm-ui-pages"
  >
    <template
      v-for="(page,index) in pages" :key="page.id"
    >
      <div class="mdm-ui-pages-pageform-background" :style="\`z-index: \${page.zindex}\`"></div>
      <page
      :component="page.component"
      :resolve="page.resolve"
      :reject="page.reject"
      :zindex="page.zindex"
      :isfirst="index===0"
      />
    </template>
  </div>
</div>
`,
  components: {
    'page': Page,
  },
  setup(props,context) {
    try{
    // const {ref,onMounted,markRaw} = Vue

    const appContext = ref({
      pagesSitePromiseResolve: () => { throw new Error('Promise not inited'); },
      pagesSitePromiseReject: () => { throw new Error('Promise not inited'); },
      pagesSitePromise: undefined,
    });
    appContext.value.pagesSitePromise = new Promise((resolve,reject) => {
      appContext.value.pagesSitePromiseResolve = resolve;
      appContext.value.pagesSitePromiseReject = reject;
    });

    const pages = ref([])

    const createPage = (Component) => {
      const generateZindex = pages => {
        const max = Math.max(...pages.value.map(m=>m.zindex));
        const zindex = max>0 ? max+1 : 10;
        return zindex;
      };
      console.log('[DEBUG]: page: called createPage()');
      const promiseContext = {
        promiseResolve: () => {'promise not inited'},
        promiseReject: () => {'promise not inited'},
        promise: undefined,
      };
      promiseContext.promise = new Promise((resolve,reject) => {
        promiseContext.promiseResolve = resolve;
        promiseContext.promiseReject = reject;
      });
      const {promiseResolve,promiseReject,promise} = promiseContext;
      const id = generateUUID();
      const zindex = generateZindex(pages);
      console.log('[DEBUG]: page: assigned id is ',id);

      const del = function() {
        pages.value = pages.value.filter(m=>m.id!=id)
      }
      promise.then(del,del)

      const newPage = {
        component: markRaw(Component),
        id: id,
        resolve:promiseResolve,reject:promiseReject,
        zindex: zindex,
      }
      console.log('[DEBUG]: page: page object is ',newPage);
      pages.value.push(newPage);
    }

    onMounted(async () => {
      await Promise.all([
        (function(){
          appContext.value.pagesSitePromiseResolve(createPage);
          appContext.value.pagesSitePromise = Promise.resolve(createPage);
        })(),
      ])
    });

    context.expose({createPage});

    return {pages}
  } catch(e) {
    console.error(e);
    throw e;
  }
  }
};

export default PagesSite;
