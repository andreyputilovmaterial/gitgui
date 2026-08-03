#!/usr/bin/env bash
set -e

# python -m src.launcher --program gitgui --working-tree-folder "tests-real-sensitive-data/my-test-project" --git-repo-folder "tests-real-sensitive-data/test-project-repo"
python dist/gitgui_bundle.py --program gitgui --working-tree-folder "tests-real-sensitive-data/my-test-project" --git-repo-folder "tests-real-sensitive-data/test-project-repo"
