# vue-router (pre-bundled)

`vue-router.browser.js` is a pre-bundled ESM build of vue-router v4.6.4,
produced with rolldown so that `@vue/devtools-api` is inlined and `vue` is left
as an external bare import (resolved by the app's importmap).

The result has exactly one import:

```js
import { ... } from "vue";
```

## Rebuild (requires Node + rolldown; NOT part of `build.sh`)

```bash
npm install vue-router@4.6.4
rolldown node_modules/vue-router/dist/vue-router.esm-browser.js \
    --file vue-router.browser.js --format esm --external vue --platform browser
```

This is a one-time, manual step (like the committed `vue.esm-browser.js`); the
committed artifact is what `build.sh` and the runtime actually consume, so a
fresh clone / offline build never needs Node.
