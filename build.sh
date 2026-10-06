#!/bin/sh
# Translates the page (i18n/i18n.js: Russian source + English via EN?…:…) and wraps it into a standalone document for the server.
set -e
cd "$(dirname "$0")"
mkdir -p dist
[ -d i18n/node_modules ] || (cd i18n && npm install --silent)
node i18n/i18n.js build i18n/index.built.html
{
cat <<'HEAD'
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#070D12">
<meta name="rating" content="12+">
<meta name="description" content="Симулятор футбольной карьеры: 30 лиг, еврокубки, сборные, Золотой мяч.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Легенда поля">
<meta property="og:title" content="Легенда поля">
<meta property="og:description" content="Создай игрока и проведи его от академии до Золотого мяча.">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="manifest" href="manifest.webmanifest">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{-webkit-text-size-adjust:100%}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
HEAD
cat i18n/index.built.html
printf '\n</html>\n'
} > dist/index.html
cp static/* dist/ 2>/dev/null || true
echo "built dist/index.html ($(wc -c < dist/index.html) bytes)"
