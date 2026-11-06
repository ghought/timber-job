#!/bin/sh
# Regenerates the PNGs in assets/ from assets/favicon.svg and tools/share-card.html.
# Needs Google Chrome and macOS sips.
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
shot() { # url width height out [transparent]
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$TMP/profile" \
    ${5:+--default-background-color=00000000} --virtual-time-budget=6000 \
    --window-size="$2,$3" --screenshot="$4" "$1" 2>/dev/null
}
sed 's/rx="112"/rx="0"/; s/<g id="art">/<g id="art" transform="translate(56 56) scale(.78)">/' assets/favicon.svg > "$TMP/full.svg"
cp assets/favicon.svg "$TMP/round.svg"
for n in round full; do
  printf '<!doctype html><style>html,body{margin:0;background:transparent}img{display:block}</style><img src="%s.svg" width="512" height="512">' "$n" > "$TMP/$n.html"
done
shot "file://$TMP/round.html" 512 512 "$TMP/round.png" transparent
shot "file://$TMP/full.html" 512 512 assets/icon-maskable-512.png
cp "$TMP/round.png" assets/icon-512.png
sips -z 192 192 "$TMP/round.png" --out assets/icon-192.png >/dev/null
sips -z 32 32 "$TMP/round.png" --out assets/favicon-32.png >/dev/null
sips -z 180 180 assets/icon-maskable-512.png --out assets/apple-touch-icon.png >/dev/null
shot "file://$PWD/tools/share-card.html" 1200 630 assets/share.png
rm -rf "$TMP"
