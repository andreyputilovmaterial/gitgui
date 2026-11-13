# Roadmap

## Exact plans

- Something

## Things to consider, reminders, random thoughts

- consider Tauri
- (fixed) Running the full backend suite (`pytest -q`) used to fail at collection due to a `test_webserve_logging.py` basename collision between `tests/` and `src/lib/webinput/tests/`. Fixed by making webinput's `tests/` a package and switching its test to a relative import (`from ..src.helper_webserve_logging import ...`), which also makes it import webinput's own `src` instead of the parent's same-named `src` package.
- adopt filtering of projects in project-selector
- sorting of categories (  )
- make widgets a lib in webinput
- sort out the app config object, what entry types it includes and which should be delivered to front along with whole config object.
- finish the welcome view
- Review this statement: I used module-level repoStatus/repoActions + vue-router's route props option rather than provide/inject. This keeps every existing component untouched (they still declare and receive repoStatus/repoActions as props), so it's much lower-risk. provide/inject remains an optional later cleanup — the module singleton is exactly how Pinia-style stores work, so this is a standard pattern.
- (Task to think of, not to implement) Revision view - decide if files need to be grouped into folders
- Finally, add icon lib `https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/` - it's too much pain finding unicode characters and adjusting sizes without it, even I prefer globally to avoid unnecessary dependencies...
- On welcome screen, when I click some folder in files list, it is opened, but I am getting scrolled far below, so that I see terminal commands near the top of my screen, and need to scroll back up to see files.
