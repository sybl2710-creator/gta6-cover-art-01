# Vice Pop Studio

Vice Pop Studio is an offline, GTA 6-style cover art maker that runs entirely in the browser: pick a photo, let it crop to the faces, tune the grade and the chrome caption, and export a finished poster without a single network request.

[![Build the best GTA 6 cover art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/sybl2710-creator/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/sybl2710-creator/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

## What it does

- Seven-panel comic grid: a hero arch over six panels in two rows of three.
- Hero pop-out arch, where the subject breaks the frame.
- Face-aware crop that keeps the subject centred in every panel.
- Editable chrome caption, plus a subtitle line.
- Role tags (HERO, ICON, 2026) and a footer billing block.
- Round "VICE POP - EST. 2026" seal and five grades: Vice Sunset, Neon Night, Palm Dusk, Chrome Heat, Mono Noir.
- PNG export at 1080x1080, 1080x1350 and 1920x1080.

## Running it

Open `app/index.html` directly, or run `node serve.ts` and visit http://localhost:8080. To build the hand-in bundle, run `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

## Files

- `app/index.html` — the page shell and poster markup.
- `app/style.css` — the poster, panel and chrome styling.
- `app/src/main.js` — app state, controls and export wiring.
- `app/src/render.js` — draws the poster and its panels.
- `app/src/layouts.js` — the seven-panel grid and hero arch geometry.
- `app/src/crop.js` — face-aware cropping for the photos.
- `app/src/grades.js` — the five colour grades.
- `app/src/shots.js` — reads the `?shot=` query for the screenshot renders.
- `app/samples/` — the bundled pier and boulevard photos.
- `app/fonts/` — bundled Liberation Sans fonts.
- `main.ts` — copies `app/` and `screenshots/` to the output dir and writes `dossier.json`.
- `serve.ts` — a tiny static server for local previews on port 8080.
- `shots.json` — the four screenshot targets.
- `vendor/makefun-app.ts` — the kit's unchanged dossier builder.

## Licence

MIT. See [LICENSE](LICENSE).
