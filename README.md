# Timber Job

A mobile tree-felling game with twelve jobs based on real tree work: notches and back cuts, leaning trees and wedges, wind, barber chairs, rot, and sectional takedowns by crane.

Play it at https://ghought.github.io/timber-job/

## Run it locally

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123. There is no build step or dependency.

## Layout

- `index.html`: page shell, styles, and share tags
- `game.js`: the whole game
- `assets/`: icons, share image, and web app manifest
- `tools/`: sources for the PNGs in `assets/`. Run `tools/render-art.sh` to regenerate them.
