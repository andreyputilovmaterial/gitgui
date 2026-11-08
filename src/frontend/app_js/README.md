# app_js

This is a frontend vue app.

It can be built without node and vite (so that app can be built in machines without node).
As well it can be launched with vite, that is necessary for making development less slow.

## Two ways to run

Both ways must keep working, and both should be checked during development when
their requirements are met.

### 1. Vite dev server (development only)

```sh
npm install
npm run dev
```

Requires **Node** and a **running Python backend** (Vite proxies API calls to it
— see `vite.config.js`); `vue`/`vue-router` come from `node_modules`. This is the
fast hot-reload path for iterating on UI code.

### 2. Backend-served bundle (the normal/final app)

Only the Python backend runs — no Node. `build.sh` bundles this app with
`py_js_bundler` into `src/frontend/GENERATED/app.js`, and the backend serves it
(`/assets/app.js`) together with Vue and vue-router from `/assets/vendorlibs/`
(an importmap in the page `<head>` resolves the `vue` / `vue-router` imports).

> If valid JS passes npm/Vite but is rejected by `py_js_bundler`, prefer
> updating `py_js_bundler` for common/widespread syntax over bending the JS to
> fit it.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
