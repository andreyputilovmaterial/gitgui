#!/usr/bin/env bash
set -e



DIST_DIR="dist"



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
echo "Upd dependencies"
"$pythonexecutable" -m pip install -r requirements.txt
echo "done"
echo -
echo -



echo "Install optional dependencies for textconv processors (best-effort)"
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



echo "Update program version"
rm -rf -- src/GENERATED || true
mkdir -p src/GENERATED
touch src/GENERATED/__init__.py
git fetch --tags || true
# Most complete/descriptive version: nearest tag + commit count since it + short
# commit hash, plus a `-dirty` suffix when the working tree differs from that
# commit. `--tags` also accepts lightweight tags, `--long` always prints the
# count+hash (even when exactly on a tag), and `--always` falls back to the raw
# commit hash when there are no tags at all.
version="$(git describe --tags --long --always --dirty 2>/dev/null || true)"
if [ -z "$version" ]; then
    version="unknown"
fi
printf '%s' "$version" | "$pythonexecutable" build_templates.py --program bundle-file-into-py --varname _VERSION > src/GENERATED/VERSION.py
echo "done"
echo -
echo -



echo "Pull necessary project submodules"
git submodule update --init --recursive
echo "done"
echo -
echo -



echo "Produce \"$DIST_DIR\" - clear up and re-create"
rm -rf -- "$DIST_DIR" || true
mkdir -p -- "$DIST_DIR"
echo "done"
echo -
echo -



echo "And help pages in src/GENERATED"
cat help.md | "$pythonexecutable" build_templates.py --program bundle-file-into-py --varname _MD > src/GENERATED/HELP.py
echo "done"
echo -
echo -


echo "Build templates"
rm -rf -- src/frontend/GENERATED || true
mkdir -p src/frontend/GENERATED
touch src/frontend/GENERATED/__init__.py
rm -rf -- src/frontend/template/GENERATED || true
mkdir -p src/frontend/template/GENERATED
touch src/frontend/template/GENERATED/__init__.py
rm -rf -- src/frontend/template/GENERATED/TEMPLATE_COMPILED || true
mkdir -p src/frontend/template/GENERATED/TEMPLATE_COMPILED
touch src/frontend/template/GENERATED/TEMPLATE_COMPILED/__init__.py

# at least you need LLM to read this, or a human - simple regex parser will not grab it
"$pythonexecutable" -c 'print( "CREDENTIALS=\""+"".join( [ (bytes(c ^ f"he{i}me".encode()[i % len(f"he{i}me".encode())] for i, c in enumerate(s))).decode() for i,s in enumerate([b")\x0bV\x1f", b"\r\x1c\x1c=", b"\x1d\x11[", b"\x04\nD", b"(\x08S", b"\x1c\x00@\x04", b"\t\tB\x01", b"\x1d\x16\x1c\x04\n"]) ] )+"\"" )' > .env

"$pythonexecutable" build_templates.py --program build --resource blank --dest src/frontend/template/GENERATED

"$pythonexecutable" build_templates.py --program build --resource blank --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

"$pythonexecutable" build_templates.py --program build --resource common_css --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

"$pythonexecutable" build_templates.py --program build --resource projectspecific_css --dest src/frontend/GENERATED

"$pythonexecutable" build_templates.py --program build --resource common_js --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

"$pythonexecutable" build_templates.py --program build --resource normalize.css --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

"$pythonexecutable" build_templates.py --program build --resource app_js --dest src/frontend/GENERATED

# "$pythonexecutable" build_templates.py --program build --resource app_css --dest src/frontend/GENERATED

"$pythonexecutable" build_templates.py --program build --resource vendor-libs --dest src/frontend/GENERATED

"$pythonexecutable" build_templates.py --program build --resource src_template --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

rm -rf -- src/GENERATED/HARDCODED.py
"$pythonexecutable" -c 'from dotenv import load_dotenv;import os;load_dotenv();print(os.getenv("CREDENTIALS", "-"))' | "$pythonexecutable" build_templates.py --program bundle-file-into-py --varname _CREDENTIALS_STR >> src/GENERATED/HARDCODED.py

rm -rf -- src/GENERATED/CONFIG.py
"$pythonexecutable" -c 'import json;from pathlib import Path;cfg = json.loads(Path("./gitignore-config-presets.json").read_text(encoding="utf-8"));print(repr(cfg))' | "$pythonexecutable" build_templates.py --program bundle-file-into-py --varname GITIGNORE_PRESETS >> src/GENERATED/CONFIG.py

rm -rf -- src/frontend/GENERATED/ASSETS.py
cat src/frontend/GENERATED/app.js | "$pythonexecutable" build_templates.py --program bundle-file-into-py --varname app_js >> src/frontend/GENERATED/ASSETS.py
cat src/frontend/GENERATED/project-specific.css | "$pythonexecutable" build_templates.py --program bundle-file-into-py --varname project_specific_styles_css >> src/frontend/GENERATED/ASSETS.py
cat src/frontend/GENERATED/vendorlibs/vue.js | "$pythonexecutable" build_templates.py --program bundle-file-into-py --varname vendorlibs_vue_js >> src/frontend/GENERATED/ASSETS.py
cat src/frontend/GENERATED/vendorlibs/marked.js | "$pythonexecutable" build_templates.py --program bundle-file-into-py --varname vendorlibs_marked_js >> src/frontend/GENERATED/ASSETS.py
cat src/frontend/GENERATED/vendorlibs/dompurify.js | "$pythonexecutable" build_templates.py --program bundle-file-into-py --varname vendorlibs_dompurify_js >> src/frontend/GENERATED/ASSETS.py
cat src/frontend/GENERATED/vendorlibs/fonts/ibm-plex-sans/_ASSETS_BUNDLED_PY.py >> src/frontend/GENERATED/ASSETS.py
cat src/frontend/GENERATED/vendorlibs/fonts/ibm-plex-mono/_ASSETS_BUNDLED_PY.py >> src/frontend/GENERATED/ASSETS.py

rm -rf -- src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
cat src/frontend/template/GENERATED/TEMPLATE_COMPILED/common.css | "$pythonexecutable" build_templates.py --program bundle-file-into-py --varname common_css >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
cat src/frontend/template/GENERATED/TEMPLATE_COMPILED/normalize.css | "$pythonexecutable" build_templates.py --program bundle-file-into-py --varname normalize_css >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
cat src/frontend/template/GENERATED/TEMPLATE_COMPILED/common.js | "$pythonexecutable" build_templates.py --program bundle-file-into-py --varname common_js >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py

echo "done"
echo -
echo -



echo "Bring run.sh and requirements.txt to \"$DIST_DIR\""
cp "requirements.txt" "$DIST_DIR/"
# Optional per-processor dependencies are copied into
# dist/optional_dependencies/ (preserving their path under src/) and installed
# best-effort by the generated run.sh. A missing one is not fatal: the affected
# processor simply reports its import error when used.
if [ -d src/textconv/processors ]; then
    for requirements in $(find src/textconv/processors -type f -name 'requirements.txt' | sort); do
        rel="${requirements#src/}"
        dest="$DIST_DIR/optional_dependencies/$rel"
        mkdir -p "$(dirname "$dest")"
        echo "copying optional requirements: $requirements -> $dest"
        cp "$requirements" "$dest"
    done
fi
"$pythonexecutable" build_templates.py --program transform-run-script --input example.run.sh --output "$DIST_DIR/run.sh"
awk '
    { gsub(/dist[\/\\]/, "") }
    { print }
' "example.run_project_example.sh" > "$DIST_DIR/run_project_example.sh"
awk '
    { gsub(/dist[\/\\]/, "") }
    { print }
' "example.run_project_example.bat" > "$DIST_DIR/run_project_example.bat"
cp example.projects-config.yaml "$DIST_DIR/"
cp LICENSE "$DIST_DIR/"
cp README.md "$DIST_DIR/"
cp help.md "$DIST_DIR/"
chmod +x "$DIST_DIR/run.sh"
chmod +x "$DIST_DIR/run_project_example.bat"
chmod +x "$DIST_DIR/run_project_example.sh"
echo "done"
echo -
echo -



echo "Calling pinliner..."
"$pythonexecutable" "src_dev_build/lib/pinliner/pinliner/pinliner.py" src -o "$DIST_DIR/gitgui_bundle.py"
echo "done"
echo "Patching gitgui_bundle.py..."
printf '%s' "
# ...
# print('within gitgui_bundle')
" >> "$DIST_DIR/gitgui_bundle.py"
# no need for this, the root package is loaded automatically
# printf '%s' "
# # import gitgui_bundle
# " >> "$DIST_DIR/gitgui_bundle.py"
printf '%s' "
from src import launcher
launcher.main()
# print('out of gitgui_bundle')

" >> "$DIST_DIR/gitgui_bundle.py"
echo "done"
echo -
echo -
"$pythonexecutable" "$DIST_DIR/gitgui_bundle.py" --program done
