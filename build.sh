#!/usr/bin/env bash
set -e


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


echo "Update program version"
mkdir -p src/GENERATED
echo "" >> src/GENERATED/__init__.py
git fetch --tags
echo "" > src/GENERATED/_VERSION.py
echo "# THIS IS AUTO_GENERATED" >> src/GENERATED/_VERSION.py
echo "# updated" >> src/GENERATED/_VERSION.py
"$pythonexecutable" -c 'from datetime import datetime; print(f"# {datetime.now()}")' >> src/GENERATED/_VERSION.py
echo "_VERSION = '''" >> src/GENERATED/_VERSION.py
git describe >> src/GENERATED/_VERSION.py
echo "'''" >> src/GENERATED/_VERSION.py
echo "done"
echo -
echo -


echo "Build templates"
mkdir -p src/frontend/GENERATED
echo "" >> src/frontend/GENERATED/__init__.py
mkdir -p src/frontend/template/GENERATED
echo "" >> src/frontend/template/GENERATED/__init__.py
mkdir -p src/frontend/template/GENERATED/TEMPLATE_COMPILED
echo "" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/__init__.py

"$pythonexecutable" build_templates.py --program build --resource blank --dest src/frontend/template/GENERATED

"$pythonexecutable" build_templates.py --program build --resource blank --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

"$pythonexecutable" build_templates.py --program build --resource common_css --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

"$pythonexecutable" build_templates.py --program build --resource projectspecific_css --dest src/frontend/GENERATED

"$pythonexecutable" build_templates.py --program build --resource common_js --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

"$pythonexecutable" build_templates.py --program build --resource normalize.css --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

"$pythonexecutable" build_templates.py --program build --resource app_js --dest src/frontend/GENERATED

"$pythonexecutable" build_templates.py --program build --resource vue --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

"$pythonexecutable" build_templates.py --program build --resource src_template --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

echo "" > src/frontend/GENERATED/ASSETS.py
echo "# THIS IS AUTO_GENERATED" >> src/frontend/GENERATED/ASSETS.py
echo "# updated" >> src/frontend/GENERATED/ASSETS.py
"$pythonexecutable" -c 'from datetime import datetime; print(f"# {datetime.now()}")' >> src/frontend/GENERATED/ASSETS.py
echo "app_js = r'''" >> src/frontend/GENERATED/ASSETS.py
cat src/frontend/GENERATED/app.js >> src/frontend/GENERATED/ASSETS.py
echo "'''" >> src/frontend/GENERATED/ASSETS.py
echo "project_specific_styles_css = r'''" >> src/frontend/GENERATED/ASSETS.py
cat src/frontend/GENERATED/project-specific.css >> src/frontend/GENERATED/ASSETS.py
echo "'''" >> src/frontend/GENERATED/ASSETS.py

echo "" > src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "# THIS IS AUTO_GENERATED" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "# updated" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
"$pythonexecutable" -c 'from datetime import datetime; print(f"# {datetime.now()}")' >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "common_css = r'''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
cat src/frontend/template/GENERATED/TEMPLATE_COMPILED/common.css >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "'''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "normalize_css = r'''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
cat src/frontend/template/GENERATED/TEMPLATE_COMPILED/normalize.css >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "'''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "common_js = r'''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
cat src/frontend/template/GENERATED/TEMPLATE_COMPILED/common.js >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "'''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "vue_js = r'''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
cat src/frontend/template/GENERATED/TEMPLATE_COMPILED/vue.js >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "'''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "done"
echo -
echo -

echo "Produce dist"
mkdir -p dist
echo "" > dist/gitgui_bundle.py
echo "Calling pinliner..."
"$pythonexecutable" "src_dev_build/lib/pinliner/pinliner/pinliner.py" src -o dist/gitgui_bundle.py
echo "done"
echo "Patching gitgui_bundle.py..."
echo "# ..." >> "dist/gitgui_bundle.py"
echo "# print('within gitgui_bundle')" >> "dist/gitgui_bundle.py"
# no need for this, the root package is loaded automatically
# echo "# import gitgui_bundle" >> "dist/gitgui_bundle.py"
echo "from src import launcher" >> "dist/gitgui_bundle.py"
echo "launcher.main()" >> "dist/gitgui_bundle.py"
echo "# print('out of gitgui_bundle')" >> "dist/gitgui_bundle.py"
echo "done"
echo -
echo -
"$pythonexecutable" dist/gitgui_bundle.py --program done
