#!/bin/sh
# Yandex Games build: Yandex SDK (/sdk.js) + all fonts, flags, portraits inside the archive, no outside links.
#   → dist-yg/ and platforms/legenda-polya-yg.zip (upload in the Yandex Games developer console)
set -e
cd "$(dirname "$0")"
SHARED_SPORT=../sport
[ -d "$SHARED_SPORT/core" ] || SHARED_SPORT=../legenda-sport
out=dist-yg
case "${1:-}" in
  '') ;;
  --preview) out=dist-yg-preview ;;
  *) echo 'Usage: ./build-yg.sh [--preview]' >&2; exit 2 ;;
esac
[ -d i18n/node_modules ] || (cd i18n && npm install --silent)
node i18n/i18n.js build i18n/index.built.html
rm -rf "$out" && mkdir -p "$out/fonts" "$out/flags"
python3 platforms/yg_assets.py i18n/index.built.html "$out" "${1:-}"
cp "$SHARED_SPORT/hub/locales.js" "$out/locales.js"
for locale in es fr ar hi it zh de; do cp "$SHARED_SPORT/hub/locales-$locale.js" "$out/"; done
for asset in choices.css geo.js choice-art.js choices.js site.js site.css countries.js names.js surface.js; do cp "$SHARED_SPORT/core/$asset" "$out/"; done
cp static/icon.svg static/icon-512.png "$out/"
cp -R static/faces "$out/"  # the update trailer (static/news) stays web-only, a new Yandex player has nothing to catch up on
if [ "$out" = dist-yg-preview ]; then
  echo 'Local preview ready. Run: python3 -m http.server 8099 --bind 127.0.0.1 --directory dist-yg-preview'
  echo 'Open http://127.0.0.1:8099/ — simulated payments only; this directory is never zipped.'
  exit 0
fi
rm -f platforms/legenda-polya-yg.zip
(cd dist-yg && zip -qr ../platforms/legenda-polya-yg.zip .)
echo "built dist-yg ($(du -sh dist-yg | cut -f1)), platforms/legenda-polya-yg.zip"

for locale in ru ar hi zh; do cp "$SHARED_SPORT/hub/names-$locale.js" "$out/"; done
