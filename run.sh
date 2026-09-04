#!/usr/bin/env bash
set -e

WORKDIR="$1"
GITDIR="$2"


echo "Prep python"
echo "set venv"
if [ -x ".venv/Scripts/python.exe" ]; then
    pythonexecutable=".venv/Scripts/python.exe"
elif [ -x ".venv/bin/python" ]; then
    pythonexecutable=".venv/bin/python"
else
    python -m venv .venv
    if [ -x ".venv/Scripts/python.exe" ]; then
        pythonexecutable=".venv/Scripts/python.exe"
    elif [ -x ".venv/bin/python" ]; then
        pythonexecutable=".venv/bin/python"
    else
        python -m venv .venv
        echo "No Python virtual environment found"
        exit 1
    fi
fi
echo "upd dependencies"
"$pythonexecutable" -m pip install -r requirements.txt
echo "done"
echo -
echo -


# "$pythonexecutable" -m src.launcher --program gitgui --work-tree-folder "tests-real-sensitive-data/my-test-project" --git-repo-folder "tests-real-sensitive-data/test-project-repo"
"$pythonexecutable" "./dist/gitgui_bundle.py" --program gitgui --work-tree-folder "$WORKDIR" --git-repo-folder "$GITDIR"
