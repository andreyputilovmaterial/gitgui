

Usually, when I put some files in a separate folder, it means
some isolation - each file is a separate module.

Here, it's not. All files here are executed in setup() in app.js

It means, outer (exposed) function must be sync.

So, the only goal for making these files is housekeep - keep app's setup() cleaner.

There is no ui in these files - no templates. Templates are not in "common_app_features" folder.
