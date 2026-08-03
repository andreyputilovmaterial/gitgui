#!/usr/bin/env bash
set -e

echo "Update program version"
echo "" > src/GENERATED/_VERSION.py
echo "# THIS IS AUTO_GENERATED" >> src/GENERATED/_VERSION.py
echo "# updated" >> src/GENERATED/_VERSION.py
python -c 'from datetime import datetime; print(f"# {datetime.now()}")' >> src/GENERATED/_VERSION.py
echo "_VERSION = '''" >> src/GENERATED/_VERSION.py
git describe >> src/GENERATED/_VERSION.py
echo "'''" >> src/GENERATED/_VERSION.py
echo "done"
echo -
echo -


python build_templates.py --program build --resource blank --dest src/frontend/template/GENERATED

python build_templates.py --program build --resource blank --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

python build_templates.py --program build --resource css --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

python build_templates.py --program build --resource js --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

python build_templates.py --program build --resource normalize.css --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

python build_templates.py --program build --resource src_template --dest src/frontend/template/GENERATED/TEMPLATE_COMPILED

echo "" > src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "" > src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "# THIS IS AUTO_GENERATED" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "# updated" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
python -c 'from datetime import datetime; print(f"# {datetime.now()}")' >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "common_css = '''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
cat src/frontend/template/GENERATED/TEMPLATE_COMPILED/common.css >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "'''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "normalize_css = '''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
cat src/frontend/template/GENERATED/TEMPLATE_COMPILED/normalize.css >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "'''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "common_js = '''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
cat src/frontend/template/GENERATED/TEMPLATE_COMPILED/common.js >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py
echo "'''" >> src/frontend/template/GENERATED/TEMPLATE_COMPILED/ASSETS.py

echo "Produce dist"
echo "" > dist/gitgui_bundle.py
echo "Calling pinliner..."
python "src_dev_build/lib/pinliner/pinliner/pinliner.py" src -o dist/gitgui_bundle.py
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
python dist/gitgui_bundle.py --program done
