# Git-gui

<!--
This file is displayed as help page within program
-->

## What is this tool doing?
It helps you manage previous versions of your scripts.

It is simply a graphical wrapper that executes Git. It is launched as python app and gui is shown in browser at localhost. No network connections, no internet needed.

Also, it is designed to work with commit history stored locally (that's what Git is normally doing). I mean, no remote website, no cloud, no github.com - you don't have to worry about privacy. All work is in local folders.

This app simply executes Git commands and makes it easier to manage and see what do we have stored in previous versions, what is the current state, and compare changes from older versions.

Basically, same what you are normally getting from Git, however,
- It helps you easier set up Git repo - no commands in terminal, all is nice in front of your eyes with clear graphics
- It adds certain flags for `--work-tree` and `--git-dir` so that Git history can be stored separately from you working folder
- It means, do not run Git commands directly, without this tool. You can if you know what you are doing and are able to add `--work-tree` and `--git-dir` manually. If you add these cli params, all is good, this is just normal Git
- Also, you can use all power of Git. Like, use branching, and merge changes from different versions in different branches. For this, you can use the command terminal pane in app. Or, just run Git commands directly in terminal, if you are able to add those `--work-tree` and `--git-dir` params to you cli calls

## Why is this based on Git?
Because, what else? Git is designed for this. With certain limitations.

By "limitations" I mean Git possibilities are unlimited, but Git is great when working with text files and loses its advantages when working with binary data files. It can, but it loses its benefits. See more detailed answer in dedicated section below.

Git is basically the industry standard for version control. There are 8 billion people in the world, they are roughly using Git, if they need manage history of their scripts.

## What will be tracked? Scripts only? Full backups?
There is some very basic config for "gitignore" file, that defines tracked and ignored files. This is super important, because we don't want to have backups of all.

So, you have to decide carefully what do you want to have tracked. But the app will guide you through this.

Why? Because, working with text files:
- Git is super efficient - history is taking very little space, backups are compressed, only deltas are stored - it takes little space
- You get all benefits from comparing versions, seeing changes and differences, and even merging changes from different versions and branches

When working with binary files:
- They can be perfectly stored as well
- Compression does not reduce space much - when git calculates "deltas", it usually turns out that almost everything is now different, in new versions of binary files. That's why, it every time stores a full new copy. No win in space
- No diffing and compare (generally, but can be implemented for certain file types through textconv)
- No easy way to delete some of older backups. Rewriting history is technically possible, and orphaned older versions will get purged, but there is no straightforward way to do this

## Simple guide on what to have and to not have tracked
- <span class="gitgui-md-list-marker">(yes)</span> Your scripts - perfectly tracked
- <span class="gitgui-md-list-marker">(yes)</span> MDD - perfectly tracked. Internally it's xml, that is a text file. And also we can implement version compare.
- <span class="gitgui-md-list-marker">(maybe)</span> Image files - I don't see any issues, I think it makes sense to have it tracked. Yeah, it's binary, and "not efficient", but 100 0.5 MB files yearly should not definitely be an issue, but is also important part of history
- <span class="gitgui-md-list-marker">(no)</span> Logs, TMP files, generated artifacts - definitely no, useless garbage
- <span class="gitgui-md-list-marker">(rather no)</span> Data files, DDF files - normally, I'd discourage from this, as it's binary files, with downsides mentioned above (take full disk space with every new copy, not easy to delete older backups, no compare)
- <span class="gitgui-md-list-marker">(maybe)</span> Excel, Word documents - open for debate. On one side, technically that is a zip archive, that is binary. However, if they are not very big - it should not be such a big issue. And binary files can't be compared - that is not true, we can implement comparison via textconv.
- <span class="gitgui-md-list-marker">(no)</span> Outputs, generated tables, spss - I believe, git is for tracking source, not generated stuff. Also, outputs could take really a lot of disk space. Even with knowledge that ratio of spss compression can look good - you are anyway storing all data, just not as bad as plain spss is - but why would you need it? Git is for tracking source, not generated.

Can this be configured in more detailed way? Like, globally exclude ddf but store certain P-data files?
- Definitely, yes. Just search "gitignore" and get hints on formatting rules

## When are snapshots captured?
Only when you make a "commit". Press specific button and write a description - that is a version name in history log. However, as it's a cli command, it can be automated, like, of Sundays with week number.
