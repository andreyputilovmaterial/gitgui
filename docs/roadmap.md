# Roadmap

## Exact plans

- Something

## Things to consider, reminders, random thoughts

- consider Tauri
- adopt filtering of projects in project-selector
- sorting of categories (  )
- make widgets a lib in webinput
- (done) adopt github issues rules
- sort out the app config object, what entry types it includes and which should be delivered to front along with whole config object.
- finish the welcome view
- clikable tabs - Overview, Files, History... - remove the outlining dotted border on click
- Review this statement: I used module-level repoStatus/repoActions + vue-router's route props option rather than provide/inject. This keeps every existing component untouched (they still declare and receive repoStatus/repoActions as props), so it's much lower-risk. provide/inject remains an optional later cleanup — the module singleton is exactly how Pinia-style stores work, so this is a standard pattern.
- (done) add vue-router in dev dependencies
- (done) Clarify the use of npm for dev and py_js_bundler for final bundle - to make it clear that both can be legally used and both should work
- (done) Look through npm warnings (2026-11-08). Findings: the `EBADENGINE` "unsupported engine" warnings were because Node 25 is a non-LTS odd release (EOL since ~Jun 2026); npm 11's internals and `npm-run-all2@9` only support even/LTS lines (`^22.22.2 || ^24.15.0 || >=26.0.0`). Decided: develop on Node 26 (even "current" line; LTS in Oct 2027). The 20 `npm audit` findings are dev-tooling-only (Vite/Vitest/ESLint/jsdom), not in the shipped bundle.
- (done) Adopt vue-router v5: re-vendored `vue-router.browser.js` to v5.4.0 (rolldown inlines `@vue/devtools-api` + `nostics`, keeps `vue` external). `package.json` already declared `^5.4.0`; the app uses only stable APIs, so no app-code changes were needed.
- (optional) Run `npm audit fix` in `app_js` (safe, within semver ranges); the ~2 remaining moderate `minimatch`/`glob` items have no compatible patched release yet (need eslint/js-beautify to move to minimatch >= 11.0.1).
- (optional) Re-sync vendored `vue.esm-browser.js` to 3.5.45 (currently 3.5.41); the only prod advisory is SSR-only and the app is client-side, so not urgent.
- I might want to review paths in frontend. For examples, from `/#/files/`, remove the `worktree` prefix. I think this tab pane is entirely for real physical files within work tree.
- (Task to think of, not to implement) Revision view - decide if files need to be grouped into folders
- Revision - decide exact paths. For example, the root is `/#/history`, files within revision are `/#/history/:hash/files/`, then, two questions: 1. where does compare go? 2. what should path show within revision but without `files` suffix? Like, `/#/history/:hash/files/`.
- On files view, give a better error message if path does not exist. Need first to review contract for response from backend on missing file. I think pure http 404 is fine. It is conceptually correct and clean. I love that. However, in backend, 404 often means other types of errors, that are still returned as http 404. I think I should make an agreement for /browse/ path, that 404 specifically means the requested resource was not found, and nothing else. Then, in frontend, just show the red message with error class saying that resource was not found, and path that was not found, and not let exception go further, not logged at global level, not passed to console. Only short message instead of list of files, within the files list component, and not propagated further. Then, any real errors (other failed responses from backed) should still be logged and processed normally, passing to top level handler and to browser console.
- Physical back button for navigation between pages within same app tab. In old versions before switching to vue-router, I did not have navigation based on browser address bar and browser back button. So I was showing a "back" button in topmost part of page. Now I want to still have similar "back" button. But only for navigating back within same app tab. For example, last page was the list of revision, and I navigated to the list of files within revision - I want to have a back button that brings me back to revisions. However, this should only work when navigation was done between conceptually different components - for example, from revisions to files within revision. When same page is shown that lists files, and I walk the files tree but still stay within same "list files" component - I like that browser url changes as I walk, and I okay that browser back button takes me to previous level within files tree. But the ui back button, if present, should be expected to take me to previous view, like previous component type - not just up one level in file tree within same component. Also, do not need back button to undo switching between tabs.
- On welcome screen, when I click some folder in files list, it is opened, but I am getting scrolled far below, tso that I see terminal commands from the top of my screen, and need to scroll back up to see files.
- !! Rework pagination so that it is reflected in url and is part of router! I mean, many pages here have the main thing shown is a list of something. This is usually done wrapped with records-filtering component. So this list and filtering is a part of page inner content. Pagination is currently implemented within the records-filtering component itself used in page content and is not becoming part of url. Can we explore ways to update overall design patterns so that page num is getting part of url? Need to explore options for different design approaches.
