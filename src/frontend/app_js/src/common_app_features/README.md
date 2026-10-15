
Pieces of code here are executed in app setup, and
are designed to enrich the app - add something to
repoActions and repoStatus, that are passed to almost all components (maybe I should have used a store?)

This also means functions exposed from these modules must be sync (cause they are executed from setup())

The "features" here normally do not implement any ui - ui should be added elsewhere (not in setup()).

Usually, when I put some files in a separate folder, it means
some isolation - each file is a separate module. Here, it's not. The only purpose is
to housekeep - clean up the global app setup() code.

