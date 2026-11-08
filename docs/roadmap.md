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
- (required update in docs) Clarify the use of npm for dev and py_js_bundler for final bundle - to make it clear that both can be legally used and both should work
- Look through npm warnings.
- I might want to review paths in frontend. For examples, from `/#/files/`, remove the `worktree` prefix. I think this tab pane is entirely for real physical files within work tree.
- Revision view - decide if files need to be grouped into folders
- Revision - decide exact paths. For example, the root is `/#/history`, files within revision are `/#/history/:hash/files/`, then, two questions: 1. where does compare go? 2. what should path show within revision but without `files` suffix? Like, `/#/history/:hash/files/`.
- On files view, give a better error message if path does not exist.
- Physical back button for navigation between pages within same app tab.
- Correct last tag message with `git -c core.editor="code --wait" tag -f -a v1.2.0 <commit-hash>`
- On welcome screen, when I click some folder in files list, it is opened, but I am getting scrolled far below, tso that I see terminal commands from the top of my screen, and need to scroll back up to see files.
- !! rework pagination so that it is reflected in url and is part of router!
