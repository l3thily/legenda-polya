#!/usr/bin/env python3
"""Makes the Yandex Games page: local copies of Google Fonts and flag-icons, SDK in <head>."""
import os, re, sys, time, urllib.request

src, out = sys.argv[1], sys.argv[2]
page = open(src, encoding="utf-8").read()
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
cache = os.path.join(os.path.dirname(__file__), ".cache")
os.makedirs(cache, exist_ok=True)


def fetch(url):
    name = os.path.join(cache, re.sub(r"[^A-Za-z0-9._-]", "_", url)[-180:])
    for attempt in range(5):  # the CDN drops TLS now and then
        if os.path.exists(name):
            break
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                data = r.read()
            open(name, "wb").write(data)
        except OSError:
            if attempt == 4:
                raise
            time.sleep(1 + attempt)
    return open(name, "rb").read()


# fonts: the stylesheet link → fonts/fonts.css with local woff2 files
m = re.search(r'<link href="(https://fonts\.googleapis\.com/css2[^"]+)" rel="stylesheet">', page)
css = fetch(m.group(1).replace("&amp;", "&")).decode()
for i, url in enumerate(sorted(set(re.findall(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", css)))):
    fn = f"f{i}.woff2"
    open(os.path.join(out, "fonts", fn), "wb").write(fetch(url))
    css = css.replace(url, fn)
open(os.path.join(out, "fonts", "fonts.css"), "w").write(css)
page = page.replace(m.group(0), '<link href="fonts/fonts.css" rel="stylesheet">')
page = re.sub(r'<link rel="preconnect" href="https://fonts\.[^"]+"( crossorigin)?>\n?', "", page)

# flags: every ISO code the game knows
iso = re.search(r"const FLAG_ISO=new Map\('([^']+)'", page).group(1)
codes = sorted({kv.split(":")[1] for kv in iso.split("|") if ":" in kv})
for c in codes:
    open(os.path.join(out, "flags", c + ".svg"), "wb").write(fetch(f"https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/{c}.svg"))

head = """<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#070D12">
<script>window.__PLATFORM='yg'</script>
<script src="/sdk.js"></script>
<link rel="icon" href="icon.svg" type="image/svg+xml">
<style>html{-webkit-text-size-adjust:100%}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
"""
open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(head + page + "\n</html>\n")
left = re.findall(r"https://[a-z0-9.-]+", page)
print("flags:", len(codes), "| external hosts left:", sorted(set(left)))
