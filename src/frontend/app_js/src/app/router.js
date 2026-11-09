import { createRouter, createWebHashHistory } from 'vue-router';

import AppTabsLayout from './layout_app_tabs';
import { repoStatus, repoActions } from './app_context';
import { setupBackNavigation } from './back_navigation';

import PageWelcome from './apptab_welcomeview/index';
import PageFiles from './apptab_filesview/index';
import PageFilesLocalList from './page_files_local_list/index';
import PageFilesWithinRevisionList from './page_files_within_revision_list/index';
import PageRevisionsList from './page_revisions_list/index';
import PageVersionCompare from './page_version_compare/index';
import PageHistory from './apptab_historyview/index';
import PageGitignore from './window_repoinitview/section_gitignore';
import PagePackcompression from './apptab_packcompression/index';
import PageListPackObjects from './page_pack_list_objects/index';
import PageTools from './apptab_tools/index';
import PageToolsHome from './apptab_tools/page_tools_home/index';
import PageToolSearchInHistory from './page_tool_search_in_history/index';

// Shared props passed to every tab route component, so they keep receiving
// repoStatus/repoActions exactly as before (they still declare them as props).
// Nested page routes (files/history/... children) are added in a later phase and
// will extend these props with their own params via a `props: route => ...`.
const routeProps = { repoStatus, repoActions };

// For a files-tab child route: repoStatus/repoActions + the namespace + the
// decoded path (a string) + the route name to navigate back into.
const fileProps = namespace => route => ({
  ...routeProps,
  namespace,
  path: (route.params.path || []).join('/'),
  navigateTo: route.name,
});

const revisionProps = route => ({ ...routeProps, hash: route.params.hash });

const compareProps = route => ({ ...routeProps, hashLeft: route.params.left, hashRight: route.params.right });

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: { name: 'home' } },
    {
      path: '/',
      component: AppTabsLayout,
      children: [
        { path: 'home',       name: 'home',       component: PageWelcome,         props: routeProps },
        { path: 'files', name: 'files', component: PageFiles, redirect: { name: 'files-worktree' }, children: [
            { path: 'worktree/:path(.*)*', name: 'files-worktree', component: PageFilesLocalList, props: fileProps('worktree') },
            { path: 'gitdir/:path(.*)*',   name: 'files-gitdir',   component: PageFilesLocalList, props: fileProps('gitdir') },
            { path: 'pack/:path(.*)*',     name: 'files-pack',     component: PageFilesLocalList, props: fileProps('pack') },
        ]},
        { path: 'history', name: 'history', component: PageHistory, redirect: { name: 'history-list' }, children: [
            { path: '', name: 'history-list', component: PageRevisionsList, props: routeProps },
            { path: 'compare/:left/:right', name: 'history-compare', component: PageVersionCompare, props: compareProps },
            { path: 'revision/:hash', name: 'history-revision', component: PageFilesWithinRevisionList, props: revisionProps },
        ]},
        { path: 'gitignore',  name: 'gitignore',  component: PageGitignore,       props: routeProps },
        { path: 'packstatus', name: 'packstatus', component: PagePackcompression, redirect: { name: 'packstatus-list' }, children: [
            { path: '', name: 'packstatus-list', component: PageListPackObjects, props: routeProps },
        ]},
        { path: 'tools', name: 'tools', component: PageTools, redirect: { name: 'tools-home' }, children: [
            { path: '', name: 'tools-home', component: PageToolsHome, props: routeProps },
            { path: 'search-in-history', name: 'tools-search-history', component: PageToolSearchInHistory, props: routeProps },
        ]},
      ],
    },
  ],
});

setupBackNavigation(router);

export default router;
