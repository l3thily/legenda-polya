#!/bin/sh
# Portraits from ~/dev/legenda-faces/out (Codex, PNG 1122x1402 with alpha) -> static/faces/*.webp for the game.
# Re-run when Codex adds more ages; the game falls back to the 27-year-old portrait when an age is missing.
set -e
cd "$(dirname "$0")/.."
SRC="${1:-$HOME/dev/legenda-faces/out}"
mkdir -p static/faces
for f in "$SRC"/f[0-9][0-9]_[0-9][0-9].png; do
  b=$(basename "$f" .png); o="static/faces/$b.webp"
  [ -f "$o" ] && [ "$o" -nt "$f" ] && continue
  cwebp -quiet -q 80 -alpha_q 85 -resize 320 0 "$f" -o "$o"
done
ls static/faces/*.webp | wc -l | xargs echo "faces:"
du -sh static/faces | cut -f1 | xargs echo "size:"
