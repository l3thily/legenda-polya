#!/bin/sh
# Build, then publish to GitHub Pages (docs/) and to VPS-88.
#   https://l3thily.github.io/legenda-polya/
#   https://legenda-polya.88-218-121-40.sslip.io
set -e
cd "$(dirname "$0")"
./build.sh
rm -rf docs && cp -R dist docs && touch docs/.nojekyll
git add -A
git commit -qm "${1:-Обновление игры}" || true
git push -q origin main
scp -q dist/* vps2:/var/www/legenda-polya/
curl -s -o /dev/null -w "server: %{http_code}\n" https://legenda-polya.88-218-121-40.sslip.io/
