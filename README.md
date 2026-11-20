# Vice Pop Studio

Vice Pop Studio is an offline GTA 6-style cover art maker that runs entirely in the browser.

[![Build the best GTA 6 cover art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/sybl2710-creator/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/sybl2710-creator/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

## What it does

- Builds a seven-panel comic grid with a hero arch spanning the six lower panels.
- Pops the hero out of the arch for a layered, printed-poster look.
- Crops around detected faces so the subject stays centred in every frame.
- Lets you edit the chrome caption and subtitle without leaving the canvas.
- Adds role tags (HERO, ICON, 2026) and a footer billing block.
- Stamps a round "VICE POP - EST. 2026" seal onto the cover.
- Ships five grades: Vice Sunset, Neon Night, Palm Dusk, Chrome Heat and Mono Noir.
- Exports PNG at 1080x1080, 1080x1350 and 1920x1080.
- Uses system fonts only, with no bundled font files.

## Running it

Open `app/index.html` directly in a browser for the simplest preview. For a local
server, run `node serve.ts` and visit http://localhost:8080.

Build the hand-in bundle with:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` into the output directory and writes
`dossier.json` beside them.

## Files

- `app/` — the static web app, including the editor page and its assets.
- `app/src/layouts.js` — panel geometry for the comic grid and hero arch.
- `app/src/crop.js` — face-aware cropping and image positioning.
- `app/src/grades.js` — colour grade definitions and canvas filters.
- `app/samples/` — sample photos for trying the editor offline.
- `main.ts` — copies the app and screenshots into the output dir, then builds the dossier.
- `serve.ts` — zero-dependency static preview server for `app/` on port 8080.
- `shots.json` — dimensions and names for the four screenshot targets.
- `LICENSE` — MIT licence for the project.

## Licence

MIT. See [LICENSE](LICENSE).
