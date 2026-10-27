#!/usr/bin/env bash
set -e

WORKDIR="$1"
GITDIRLOC="$2"


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

# Install optional per-processor dependencies (best-effort).
# A missing optional dependency must not fail the whole run: the affected
# processor simply reports its import error when used.
# In the distributed copy (dist/), build_templates.py --program
# transform-run-script rewrites the source-tree path to `optional_dependencies`.
if [ -d src/textconv/processors ]; then
    for requirements in $(find src/textconv/processors -type f -name 'requirements.txt' | sort); do
        echo "installing optional dependencies: $requirements"
        if ! "$pythonexecutable" -m pip install -r "$requirements"; then
            echo "WARNING: optional dependencies in $requirements not installed (the corresponding processor will be unavailable)"
        fi
    done
fi
echo "done"
echo -
echo -

"$pythonexecutable" "./gitgui_bundle.py" --program gitgui --working-tree "$WORKDIR" --git-directory-location "$GITDIRLOC"
