import { describe, it, expect } from 'vitest';
import { createRouter, createMemoryHistory } from 'vue-router';

import { createBackNavigation } from './back_navigation.js';

// The components are never rendered by these tests (we only navigate the
// router), so trivial render functions are enough.
const Dummy = { render: () => null };

// router.back() is synchronous and returns undefined; the navigation it kicks
// off settles asynchronously. Wait for the route to reach the expected name.
async function waitForRoute(router, name) {
  for (let i = 0; i < 20; i += 1) {
    if (router.currentRoute.value.name === name) return;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  throw new Error(`route did not reach "${name}" (stayed at "${router.currentRoute.value.name}")`);
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: Dummy,
        children: [
          { path: 'home', name: 'home', component: Dummy },
          {
            path: 'files',
            name: 'files',
            component: Dummy,
            redirect: { name: 'files-worktree' },
            children: [
              { path: 'worktree/:path(.*)*', name: 'files-worktree', component: Dummy },
              { path: 'gitdir/:path(.*)*', name: 'files-gitdir', component: Dummy },
              { path: 'pack/:path(.*)*', name: 'files-pack', component: Dummy },
            ],
          },
          {
            path: 'history',
            name: 'history',
            component: Dummy,
            redirect: { name: 'history-list' },
            children: [
              { path: '', name: 'history-list', component: Dummy },
              { path: 'compare/:left/:right', name: 'history-compare', component: Dummy },
              { path: 'revision/:hash', name: 'history-revision', component: Dummy },
            ],
          },
          { path: 'packstatus', name: 'packstatus', component: Dummy, redirect: { name: 'packstatus-list' }, children: [
            { path: '', name: 'packstatus-list', component: Dummy },
          ] },
        ],
      },
    ],
  });
}

describe('back_navigation', () => {
  it('offers no back on the first page of a tab', async () => {
    const back = createBackNavigation();
    const router = makeRouter();
    back.setup(router);

    await router.push({ name: 'history-list' });
    expect(back.canGoBack.value).toBe(false);
  });

  it('offers back after a different page, and goBack returns to it', async () => {
    const back = createBackNavigation();
    const router = makeRouter();
    back.setup(router);

    await router.push({ name: 'history-list' });
    await router.push({ name: 'history-revision', params: { hash: 'abc123' } });
    expect(back.canGoBack.value).toBe(true);

    back.goBack();
    await waitForRoute(router, 'history-list');
    expect(back.canGoBack.value).toBe(false);
  });

  it('does not treat walking the files tree as a back target', async () => {
    const back = createBackNavigation();
    const router = makeRouter();
    back.setup(router);

    await router.push({ name: 'files-worktree', params: { path: [] } });
    await router.push({ name: 'files-worktree', params: { path: ['docs'] } });
    await router.push({ name: 'files-worktree', params: { path: ['docs', 'guide'] } });
    expect(back.canGoBack.value).toBe(false);
  });

  it('resets the stack when switching tabs', async () => {
    const back = createBackNavigation();
    const router = makeRouter();
    back.setup(router);

    await router.push({ name: 'history-list' });
    await router.push({ name: 'history-revision', params: { hash: 'abc123' } });
    expect(back.canGoBack.value).toBe(true);

    await router.push({ name: 'packstatus-list' });
    expect(back.canGoBack.value).toBe(false);
  });
});
