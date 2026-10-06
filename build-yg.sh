#!/bin/sh
# Yandex Games build: Yandex SDK (/sdk.js) + all fonts and flags inside the archive, no outside links.
#   → dist-yg/ and platforms/legenda-polya-yg.zip (upload in the Yandex Games developer console)
set -e
cd "$(dirname "$0")"
[ -d i18n/node_modules ] || (cd i18n && npm install --silent)
node i18n/i18n.js build i18n/index.built.html
rm -rf dist-yg && mkdir -p dist-yg/fonts dist-yg/flags
python3 platforms/yg_assets.py i18n/index.built.html dist-yg
cp static/icon.svg static/icon-512.png dist-yg/
rm -f platforms/legenda-polya-yg.zip
(cd dist-yg && zip -qr ../platforms/legenda-polya-yg.zip .)
echo "built dist-yg ($(du -sh dist-yg | cut -f1)), platforms/legenda-polya-yg.zip"
