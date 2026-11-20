# Vice Pop Studio

[![bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/sybl2710-creator/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/sybl2710-creator/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

A fully offline, desktop browser-ready web studio that transforms user photos and captions into stunning GTA 6-style multi-panel poster cover art, exported as high-resolution PNGs. Built for the make.fun **"Make GTA 6 Cover Art"** bounty (`gta6-cover-art-01`).

## Features

1. **Multi-Panel Comic Poster Layout**: Dynamic 5-panel comic book poster grid layout with varied panel proportions.
2. **Hero Pop-Out Cut-Out**: A featured hero panel that breaks out of its border with a thick outline, accent border, and dramatic drop shadow.
3. **Photo Upload & Crop/Zoom**: Upload multiple photos, assign them to panels, and adjust zoom, pan X, and pan Y.
4. **Face-Aware Focus**: Default upper-third framing with per-panel focus positioning.
5. **Retro Chrome Display Caption**: Editable caption rendered with a retro multi-stop gradient chrome effect and horizontal striping.
6. **Role & Cast Tags**: Customizable role labels on panels (e.g., THE DRIVER, THE FIXER, THE HEIRESS).
7. **Movie Billing Block**: Bottom film credit block with professional typography and fictional credits.
8. **Circular Seal Stamp**: Drawn-in-code badge stamp ("VICE POP - EST. 2026").
9. **Color Grades**: 5 switchable cinematic grades (Vice Sunset, Neon Night, Gold Hour, Teal Vice, Mono Noir).
10. **Multi-Resolution PNG Export**: Instant export in 1080x1080, 1080x1350, and 1920x1080.
11. **100% Original Artwork**: Zero external game assets or copyrighted logos; all graphics, typography, and silhouettes are procedurally rendered in canvas code using Liberation Sans Bold (SIL OFL 1.1).

## Usage & Verification

Serve locally offline:
```bash
node serve.ts
```
Build and generate dossier:
```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
