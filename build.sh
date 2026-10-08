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
<meta name="google-adsense-account" content="ca-pub-3786708907323389">
<link rel="canonical" href="https://legendapolya.com/">
<meta name="description" content="Симулятор футбольной карьеры: 56 лиг, еврокубки, сборные, Золотой мяч.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Легенда поля">
<meta property="og:title" content="Легенда поля">
<meta property="og:url" content="https://legendapolya.com/">
<meta property="og:description" content="Создай игрока и проведи его от академии до Золотого мяча.">
<script>
/* boot guard: if the game hasn't started in 9 s, say so on the splash and send the errors (no personal data) for diagnosis */
(function(){var errs=[];
window.addEventListener('error',function(e){errs.push(String(e.message||'error').slice(0,160)+' @'+String(e.filename||'').split('/').pop()+':'+(e.lineno||0))});
window.addEventListener('unhandledrejection',function(e){var r=e.reason;errs.push('promise: '+String(r&&r.message||r).slice(0,160))});
setTimeout(function(){var a=document.getElementById('app');if(!a||!a.querySelector('.splash'))return;
var s=a.querySelector('.splash span');if(s)s.innerHTML='Игра не запустилась · The game did not start<br><button onclick="location.reload()" style="margin:12px 0;padding:10px 18px;border-radius:12px;border:0;background:#F2C14E;font-weight:700">Перезагрузить · Reload</button><br><small style="text-transform:none;letter-spacing:0">Откройте в Chrome или Safari или отключите блокировщик рекламы для сайта</small>';
try{var x=new XMLHttpRequest();x.open('POST','/api/oops');x.setRequestHeader('Content-Type','application/json');x.send(JSON.stringify({e:errs.slice(0,5),ua:String(navigator.userAgent||'').replace(/\([^)]*\)/g,'').replace(/\s+/g,' ').slice(0,140)}))}catch(e){}
},9000)})();
</script>
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="manifest" href="manifest.webmanifest">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{-webkit-text-size-adjust:100%}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
HEAD
cat i18n/index.built.html
printf '\n</html>\n'
} > dist/index.html
cp -R static/. dist/
python3 platforms/split_js.py dist/index.html
echo "built dist/index.html ($(wc -c < dist/index.html) bytes)"
