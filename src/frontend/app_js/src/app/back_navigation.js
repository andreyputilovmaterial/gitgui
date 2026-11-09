import { ref, computed } from 'vue';

// Physical "back" button (the ← in the tab bar). It navigates to the previous
// *page* within the current tab, never undoing a tab switch and never stepping
// up one level inside the same page (e.g. walking the files tree).
//
// The button is a plain router.back(), so it stays coherent with the browser
// history: it is only offered when the browser-back step lands on a different
// page in the same tab. This module keeps a small stack of the pages visited in
// the current tab and reacts to every navigation via router.afterEach.

// A fresh instance (used by tests). The app uses the shared singleton exported
// at the bottom.
export function createBackNavigation() {
  let router = null;

  // Page keys of the pages visited in the current tab, most recent last.
  const pageStack = ref([]);

  // The tab is the first child route under the AppTabsLayout (matched[0] is the
  // layout, matched[1] is the tab: home/files/history/gitignore/packstatus/tools).
  function tabName(route) {
    return route?.matched?.[1]?.name;
  }

  // A "page" is the deepest matched route. The three files-tab child routes
  // (worktree/gitdir/pack) render the same files list, so they collapse into a
  // single page: walking the files tree must not create back targets.
  function pageKey(route) {
    const leaf = route?.matched?.[route.matched.length - 1];
    if (!leaf) return null;
    if (['files-worktree', 'files-gitdir', 'files-pack'].includes(leaf.name)) {
      return 'files-list';
    }
    return leaf.name;
  }

  function recordNavigation(to, from, failure) {
    if (failure) return;

    if (tabName(to) !== tabName(from)) {
      // Switched tabs: the previous tab's pages are not back targets here.
      pageStack.value = [pageKey(to)];
      return;
    }

    const toKey = pageKey(to);
    const fromKey = pageKey(from);

    if (pageStack.value.length === 0) {
      pageStack.value = [toKey];
      return;
    }

    if (toKey === fromKey) {
      // Same page: walking the files tree, or a modal's query-only change.
      // Keep the stack unchanged.
      return;
    }

    // Different page. If this is a back to the page just below the top (browser
    // back or our own goBack), pop it; otherwise it is a forward page change.
    const previous = pageStack.value[pageStack.value.length - 2];
    if (previous === toKey) {
      pageStack.value.pop();
      return;
    }
    pageStack.value.push(toKey);
  }

  const canGoBack = computed(() => pageStack.value.length >= 2);

  function goBack() {
    if (!router || !canGoBack.value) return;
    router.back();
  }

  function setup(routerInstance) {
    router = routerInstance;
    routerInstance.afterEach(recordNavigation);
  }

  return { setup, canGoBack, goBack };
}

const appBackNavigation = createBackNavigation();

export const canGoBack = appBackNavigation.canGoBack;
export const goBack = appBackNavigation.goBack;
export const setupBackNavigation = appBackNavigation.setup;
