#!/bin/sh
# Build, then publish to GitHub Pages (docs/) and to VPS-88.
#   https://l3thily.github.io/legenda-polya/
#   https://legendapolya.com/fb/ (the site root is the menu of all games, ~/dev/legenda-sport/hub)
set -e
cd "$(dirname "$0")"
./build.sh
rm -rf docs && cp -R dist docs && touch docs/.nojekyll
git add -A
git commit -qm "${1:-Обновление игры}" || true
git push -q origin main
COPYFILE_DISABLE=1 tar -C dist -cf - . | ssh vps2 "mkdir -p /var/www/legenda-polya/fb && tar -C /var/www/legenda-polya/fb -xf -"  # one connection: scp of many files gets cut off by the server
curl -s -o /dev/null -w "server: %{http_code}\n" https://legendapolya.com/fb/
