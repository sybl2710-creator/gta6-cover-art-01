# Vice Pop Studio

An offline, GTA 6-style cover art maker that runs entirely in your browser.

[![Build the best GTA 6 cover art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/sybl2710-creator/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/sybl2710-creator/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

## What it does

Vice Pop Studio turns a photo and a caption into a loud, sun-bleached cover. Every piece is drawn live in the page, so nothing is uploaded or fetched.

- Seven-panel comic grid: a custom collage of tilted frames that you can shuffle until the rhythm feels right.
- Hero pop-out arch: the subject steps out of a pastel arch and breaks the frame line.
- Face-aware crop: the photo is centered on the most interesting region instead of always cropping from the middle.
- Editable chrome caption: a glossy, outlined title you can retype, restyle, and reposition.
- Role tags and billing block: small-caps credits and a studio block pin the poster together.
- Seal and five grades: a round authenticity stamp plus five colour treatments, from raw to full neon.
- Three PNG export sizes: square, widescreen, and portrait, all rendered locally and saved as downloads.

## Running it

Open `app/index.html` directly in a browser, or serve it locally:

```sh
node serve.ts
```

Then visit `http://localhost:8080`. To build the hand-in bundle:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Files

- `main.ts` — copies the app and screenshots into the output folder and writes `dossier.json`.
- `shots.json` — the four screenshot targets used for the listing.
- `serve.ts` — a tiny static server for local previews.
- `app/index.html` — the whole studio: markup, styles, and rendering logic.
- `app/style.css` — the layout and chrome around the artwork.
- `app/src/` — the cover renderer, fonts, and sample photos.
- `app/fonts/OFL.txt` — the licence covering the bundled Liberation Sans fonts.

## Licence

MIT.
