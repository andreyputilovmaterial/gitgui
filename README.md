# Git-gui

<!--
For now, I have the same text here and in help.md that is displayed as help pages in the program
-->

## What is this tool doing?
It helps you manage previous versions of your scripts.

It is simply a graphical wrapper that executes Git. It is launched as a Python app, and the GUI is shown in a browser at localhost. No network connection or internet access is needed.

It is also designed to work with commit history stored locally (that's what Git normally does). I mean: no remote website, no cloud, no github.com — you don't have to worry about privacy. All work is done in local folders.

This app simply executes Git commands and makes it easier to manage and see what we have stored in previous versions, what the current state is, and how changes from older versions compare.

Basically, it is the same thing you normally get from Git, however:
- It makes it easier to set up a Git repo — no commands in the terminal; everything is nicely presented in front of your eyes with clear graphics.
- It adds certain flags for `--work-tree` and `--git-dir` so that Git history can be stored separately from your working folder.
- This means: do not run Git commands directly without this tool. You can, if you know what you are doing and are able to add `--work-tree` and `--git-dir` manually. If you add these CLI parameters, everything is fine; this is just normal Git.
- You can also use the full power of Git, such as branching and merging changes from different versions in different branches. For this, you can use the command-terminal pane in the app. Or, just run Git commands directly in the terminal if you are able to add those `--work-tree` and `--git-dir` parameters to your CLI calls.

## Why is this based on Git?
Because, what else? Git is designed for this, with certain limitations.

By "limitations" I mean that Git's possibilities are unlimited, but Git is great when working with text files and loses some of its advantages when working with binary data files. It can handle them, but it loses many of its benefits. See the more detailed answer in the dedicated section below.

Git is basically the industry standard for version control. There are 8 billion people in the world, and roughly all of them use Git when they need to manage the history of their scripts.

## What will be tracked? Scripts only? Full backups?
There is some very basic configuration for the "gitignore" file that defines tracked and ignored files. This is super important because we don't want to have backups of everything.

So, you have to decide carefully what you want to have tracked. But the app will guide you through this.

Why? Because when working with text files:
- Git is super efficient — history takes very little space. Backups are compressed, and only deltas are stored, so it takes little space.
- You get all the benefits of comparing versions, seeing changes and differences, and even merging changes from different versions and branches.

When working with binary files:
- They can be perfectly stored as well.
- Compression does not reduce the space much — when Git calculates "deltas", it usually turns out that almost everything is different in new versions of binary files. That's why it stores a full new copy every time. No win in terms of space.
- There is no diffing or comparison (generally, but this can be implemented for certain file types through textconv).
- There is no easy way to delete some older backups. Rewriting history is technically possible, and orphaned older versions will eventually be purged, but there is no straightforward way to do this.

## Simple guide on what to have and to not have tracked
| | | |
|---|---|---|
| (yes) | Your scripts | perfectly tracked |
| (yes) | MDD | perfectly tracked. Internally, it is XML, which is a text file. We can also implement version comparison. |
| (maybe) | Image files | I don't see any issues; I think it makes sense to have them tracked. Yeah, they are binary and "not efficient", but 100 × 0.5 MB files per year should definitely not be an issue, and they are also an important part of the history. |
| (no) | Logs, TMP files, generated artifacts | definitely no, useless garbage |
| (rather no) | Data files, DDF files | normally, I'd discourage this, as they are binary files with the downsides mentioned above (take full disk space with every new copy, not easy to delete older backups, no comparison) |
| (maybe) | Excel, Word documents | open for debate. On the one hand, technically they are ZIP archives, which are binary. However, if they are not very big, it should not be such a big issue. And binary files can't be compared — that is not true; we can implement comparison via textconv. |
| (no) | Outputs, generated tables, SPSS | I believe Git is for tracking source, not generated stuff. Also, outputs could take up a lot of disk space. Even knowing that the compression ratio of SPSS files can look good — you are still storing all the data, just not as inefficiently as with plain SPSS — why would you need it? Git is for tracking source, not generated. |

Can this be configured in a more detailed way? Like, globally exclude DDF but store certain P-data files?
- Definitely, yes. Just search for "gitignore" and get hints on the formatting rules.

## When are snapshots captured?
Only when you make a "commit". Press a button and write a description — that becomes the version name in the history log. However, since it's a CLI command, it can be fully automated, like on Sundays with the week number.
