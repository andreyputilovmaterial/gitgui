import { reactive } from 'vue';

// App-wide reactive context, populated by app.js setup via the use* feature
// functions and shared with route components through the router's `props`
// option (see router.js). This replaces threading the same two objects through
// every component's props by hand.
//
// repoStatus: reactive data the app progressively discovers (config, repo
//   existence, history, status, ...).
// repoActions: the progressively-built set of callables (logError, getStatus,
//   createModal, ...).
export const repoStatus = reactive({});

export const repoActions = reactive({
  // Placeholder, overwritten almost immediately by useErrorReporting (see app.js).
  // Defer the throw so it doesn't fire during setup.
  logError: msg => { Promise.resolve().then(() => { throw new Error(`repoActions.logError not initialized yet: ${msg}`); }); },
});
