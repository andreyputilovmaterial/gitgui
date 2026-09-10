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

echo "Install optional dependencies for textconv processors"
# BEGIN GENERATED OPTIONAL DEPENDENCIES
optional_dependencies=(
)
# END GENERATED OPTIONAL DEPENDENCIES# echo "$optional_dependencies" |
#while IFS= read -r -d '' requirements; do
# while IFS= read -r requirements; do
for requirements in "${optional_dependencies[@]}"; do
    echo "installing for $requirements:"
    if ! "$pythonexecutable" -m pip install -r "$requirements"; then
        echo "WARNING: not installed"
    fi
done
echo "done"
echo -
echo -

"$pythonexecutable" "./gitgui_bundle.py" --program gitgui --work-tree-folder "$WORKDIR" --git-repo-folder "$GITDIR"
