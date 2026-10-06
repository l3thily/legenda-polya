#!/usr/bin/env python3
"""Moves the inline game script of dist/index.html into dist/app.<hash>.js loaded with `defer`:
the splash paints at once instead of a black screen while ~1 MB of JS is parsed, and repeat visits take the script from cache."""
import hashlib, os, sys

path = sys.argv[1]
html = open(path, encoding="utf-8").read()
a = html.index("<script>") + len("<script>")
b = html.rindex("</script>")
js = html[a:b]
name = "app." + hashlib.sha1(js.encode()).hexdigest()[:10] + ".js"
d = os.path.dirname(path)
for f in os.listdir(d):
    if f.startswith("app.") and f.endswith(".js") and f != name:
        os.remove(os.path.join(d, f))
open(os.path.join(d, name), "w", encoding="utf-8").write(js)
html = html[: a - len("<script>")] + f'<script src="{name}" defer></script>' + html[b + len("</script>"):]
open(path, "w", encoding="utf-8").write(html)
print(f"script → {name} ({len(js) // 1024} KB)")
