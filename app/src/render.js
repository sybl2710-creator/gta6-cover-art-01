// The poster painter.
//
// drawPoster() takes the canvas, the poster state and the loaded photos, and
// paints everything from scratch: grid, crops, borders, the hero cut-out, the
// chrome title, cast tags, the seal and the billing block. Every shape is drawn
// in code, at whatever pixel size the canvas happens to be, so the same call
// produces the 540px preview and the 1920px export.

import { FORMATS, gridFor, boxToPixels } from './layouts.js';
import { cropRect } from './crop.js';
import { gradeFor } from './grades.js';

const INK = '#14101c';
const CREAM = '#f7f1e3';
const HOT = '#ff2f7b';
const GOLD = '#ffc94a';

/** Payload text for the bottom credit block: invented names, no real people. */
export const BILLING_LINES = [
  'VICE POP PICTURES PRESENTS  A SILVER COAST PRODUCTION  "SUNSET LEDGER"',
  'STARRING  ROOK DELANEY   MIRA VOSS   TINO "TWO-TIME" BARLOW   JUNIE OHARA   CASE KOVAC',
  'CASTING BY PALOMA REYES   COSTUMES BY DENI MARCHETTI   MUSIC BY THE LOW TIDE ORCHESTRA',
  'DIRECTED BY ALEXIO FERRANT   WRITTEN BY ALEXIO FERRANT AND NORA BLIGHT   A VICE POP RELEASE',
];

function font(size, weight = 'bold') {
  return `${weight} ${Math.max(6, size)}px "Poster Bold", "Liberation Sans", Arial, sans-serif`;
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/** Arch-topped frame for the hero: rounded at the top, square at the foot. */
function archPath(ctx, x, y, w, h) {
  const r = Math.min(w * 0.34, h * 0.42);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

/** Small tiled texture for the poster board behind the panels. */
function boardTexture(w, h) {
  const tile = document.createElement('canvas');
  tile.width = 48;
  tile.height = 48;
  const t = tile.getContext('2d');
  t.fillStyle = '#1b1327';
  t.fillRect(0, 0, 48, 48);
  t.fillStyle = 'rgba(255,255,255,0.035)';
  for (let i = -48; i < 96; i += 12) {
    t.save();
    t.translate(i, 0);
    t.rotate(Math.PI / 4);
    t.fillRect(0, -40, 3, 140);
    t.restore();
  }
  t.fillStyle = 'rgba(255,47,123,0.16)';
  t.beginPath();
  t.arc(12, 12, 1.6, 0, Math.PI * 2);
  t.fill();
  return tile;
}

/** Paints the photographic part of one panel, honouring its crop. */
function paintPhoto(ctx, panel, crop, image, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
  ctx.fillStyle = '#241a33';
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);

  if (image) {
    const r = cropRect(crop, image, panel);
    if (crop.mode === 'fit') {
      // Fill the letterbox with a soft, blurred enlargement of the same photo.
      ctx.save();
      ctx.filter = `blur(${Math.round(panel.w * 0.09)}px) saturate(1.1) brightness(0.55)`;
      const cover = cropRect({ ...crop, mode: 'fill' }, image, panel);
      ctx.drawImage(image, cover.dx, cover.dy, cover.dw, cover.dh);
      ctx.restore();
    }
    ctx.filter = grade.filter;
    ctx.drawImage(image, r.dx, r.dy, r.dw, r.dh);
    ctx.filter = 'none';
  }

  // A soft shade at the head and foot of the frame, so tags stay readable.
  const shade = ctx.createLinearGradient(panel.x, panel.y, panel.x, panel.y + panel.h);
  shade.addColorStop(0, 'rgba(20,10,30,0.18)');
  shade.addColorStop(0.55, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(24,8,28,0.46)');
  ctx.fillStyle = shade;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.restore();
}

/** Draws the gutter border that makes a panel read as a comic frame. */
function framePanel(ctx, panel, scale) {
  const line = Math.max(2, scale * 0.0085);
  ctx.save();
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = line;
  ctx.strokeRect(panel.x + line / 2, panel.y + line / 2, panel.w - line, panel.h - line);
  ctx.strokeStyle = 'rgba(8,4,12,0.9)';
  ctx.lineWidth = Math.max(1, line * 0.26);
  ctx.strokeRect(panel.x + line + 1, panel.y + line + 1, panel.w - line * 2 - 2, panel.h - line * 2 - 2);
  ctx.restore();
}

/** A cast chip in the corner of a panel. */
function castTag(ctx, panel, label, scale) {
  const text = (label || '').trim().toUpperCase();
  if (!text) return;
  const size = Math.max(8, scale * 0.0165);
  ctx.save();
  ctx.font = font(size);
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.1)}px`;
  const padX = size * 0.62;
  const padY = size * 0.5;
  let tw = ctx.measureText(text).width;
  const maxW = panel.w * 0.92;
  if (tw + padX * 2 > maxW) {
    const fit = Math.max(0.4, (maxW - padX * 2) / tw);
    ctx.font = font(size * fit);
    tw = ctx.measureText(text).width;
  }
  const bh = size + padY * 2;
  const bx = panel.x + panel.w * 0.04;
  const by = panel.y + panel.h - bh - panel.h * 0.05;
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = 'rgba(12,7,18,0.86)';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + tw + padX * 2 + size * 0.5, by);
  ctx.lineTo(bx + tw + padX * 2, by + bh);
  ctx.lineTo(bx, by + bh);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = GOLD;
  ctx.fillRect(bx, by, Math.max(2, size * 0.18), bh);
  ctx.fillStyle = CREAM;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + padX + size * 0.24, by + bh / 2 + size * 0.03);
  ctx.restore();
}

/**
 * Draws text into its own transparent canvas so it can be shaded like metal:
 * a silver gradient, then diagonal banding pressed into the letters.
 */
function chromeText(text, size, fillTop, fillMid, fillLow) {
  const pad = Math.ceil(size * 0.55);
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font(size);
  if ('letterSpacing' in probe) probe.letterSpacing = `${Math.round(size * 0.02)}px`;
  const tw = Math.ceil(probe.measureText(text).width);
  const th = Math.ceil(size * 1.18);
  const c = document.createElement('canvas');
  c.width = Math.max(2, tw + pad * 2);
  c.height = Math.max(2, th + pad * 2);
  const x = c.getContext('2d');
  x.font = font(size);
  if ('letterSpacing' in x) x.letterSpacing = `${Math.round(size * 0.02)}px`;
  x.textBaseline = 'middle';
  x.textAlign = 'left';
  x.fillStyle = '#ffffff';
  x.fillText(text, pad, c.height / 2);

  // Silver ramp pressed into the glyphs.
  const ramp = x.createLinearGradient(0, pad, 0, c.height - pad);
  ramp.addColorStop(0, fillTop);
  ramp.addColorStop(0.34, '#ffffff');
  ramp.addColorStop(0.52, fillMid);
  ramp.addColorStop(0.74, fillLow);
  ramp.addColorStop(1, fillMid);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = ramp;
  x.fillRect(0, 0, c.width, c.height);

  // Banding: thin dark strokes every few pixels, tilted.
  x.globalCompositeOperation = 'source-atop';
  for (let y = -c.height; y < c.height * 2; y += Math.max(5, size * 0.085)) {
    x.strokeStyle = 'rgba(18,10,26,0.30)';
    x.lineWidth = Math.max(1, size * 0.022);
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(c.width, y - c.width * 0.42);
    x.stroke();
  }
  x.strokeStyle = 'rgba(255,255,255,0.42)';
  x.lineWidth = Math.max(1, size * 0.018);
  for (let y = -c.height; y < c.height * 2; y += Math.max(5, size * 0.085)) {
    x.beginPath();
    x.moveTo(0, y + size * 0.045);
    x.lineTo(c.width, y + size * 0.045 - c.width * 0.42);
    x.stroke();
  }
  return c;
}

/** Breaks a caption into at most two balanced lines that fit the width. */
function wrapCaption(ctx, text, size, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [text];
  ctx.font = font(size);
  const fits = (line) => ctx.measureText(line).width <= maxWidth;
  const whole = words.join(' ');
  if (fits(whole) || words.length === 1) return [whole];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const score = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (!best || score < best.score) best = { lines: [a, b], score };
  }
  return best.lines;
}

/** The big striped chrome caption, two lines at most, auto-fitted. */
function drawTitle(ctx, state, grid, W, H) {
  const raw = (state.caption || '').trim().toUpperCase();
  if (!raw) return;
  const spec = grid.title;
  const maxW = spec.width * W;
  let size = spec.size * W * (state.titleScale ?? 1);
  let lines = wrapCaption(ctx, raw, size, maxW);
  let guard = 0;
  while (guard++ < 90) {
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest <= maxW) break;
    size *= 0.955;
    lines = wrapCaption(ctx, raw, size, maxW);
  }

  const lineH = size * 0.94;
  const cx = spec.x * W;
  const cy = (spec.y + (state.titleOffsetY ?? 0)) * H;
  let y = cy - ((lines.length - 1) * lineH) / 2;

  for (const line of lines) {
    const art = chromeText(line, size, '#fdfdff', '#c9d3e4', '#5a6480');
    const dx = cx - art.width / 2;
    const dy = y - art.height / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(size);
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.02)}px`;

    // Ink shadow, hot-pink kick, fat ink keyline, cream inner keyline.
    ctx.fillStyle = 'rgba(10,4,16,0.6)';
    ctx.fillText(line, cx + size * 0.04, y + size * 0.085);
    ctx.fillStyle = HOT;
    ctx.fillText(line, cx + size * 0.022, y + size * 0.044);

    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(line, cx, y);
    ctx.strokeStyle = 'rgba(247,241,227,0.9)';
    ctx.lineWidth = size * 0.05;
    ctx.strokeText(line, cx, y);

    ctx.drawImage(art, dx, dy);
    ctx.restore();
    y += lineH;
  }
}

/** A circular badge: double ring, curved lettering, star at the centre. */
function drawSeal(ctx, grid, W, H) {
  const spec = grid.seal;
  const cx = spec.x * W;
  const cy = spec.y * H;
  const r = spec.r * Math.min(W, H * 1.12);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);

  ctx.fillStyle = 'rgba(12,6,18,0.55)';
  ctx.beginPath();
  ctx.arc(r * 0.05, r * 0.08, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f6ecd8';
  ctx.fill();
  ctx.strokeStyle = '#b3241f';
  ctx.lineWidth = Math.max(1.5, r * 0.055);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, r * 0.028);
  ctx.stroke();

  // Ring lettering.
  const ring = 'VICE POP  \u2022  EST. 2026  \u2022  COVER ART  \u2022  ';
  const chars = [...ring];
  const step = (Math.PI * 2) / chars.length;
  ctx.fillStyle = '#8f1d1a';
  ctx.font = font(r * 0.205);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  chars.forEach((ch, i) => {
    const a = -Math.PI / 2 + i * step;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -r * 0.66);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  // Centre mark.
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.46, 0, Math.PI * 2);
  ctx.fillStyle = '#b3241f';
  ctx.fill();
  ctx.fillStyle = '#f6ecd8';
  ctx.font = font(r * 0.44);
  ctx.fillText('VP', 0, r * 0.02);
  ctx.font = font(r * 0.135);
  ctx.fillText('ORIGINAL', 0, r * 0.42);
  ctx.restore();
}

/** The small print along the foot of the poster. */
function drawBilling(ctx, grid, W, H, lines) {
  const spec = grid.billing;
  const cx = spec.x * W;
  const maxW = spec.width * W;
  const size = Math.max(7, W * 0.0105);
  const gap = size * 1.75;
  let y = spec.y * H;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    let s = size;
    ctx.font = font(s, 'normal');
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(s * 0.06)}px`;
    while (ctx.measureText(line).width > maxW && s > 5) {
      s *= 0.96;
      ctx.font = font(s, 'normal');
    }
    ctx.fillStyle = i === 0 ? 'rgba(247,241,227,0.92)' : 'rgba(247,241,227,0.6)';
    ctx.fillText(line, cx, y);
    y += gap;
  });
  ctx.restore();
}

/** The hero, enlarged in an arch that spills over the neighbouring frames. */
function drawHero(ctx, panel, crop, image, grade, W) {
  const grow = { x: panel.w * 0.19, y: panel.h * 0.085 };
  const box = {
    x: panel.x - panel.w * 0.05,
    y: panel.y - grow.y,
    w: panel.w * 1.24,
    h: panel.h * 1.10 + grow.y,
  };

  ctx.save();
  archPath(ctx, box.x, box.y, box.w, box.h);
  ctx.shadowColor = 'rgba(6,2,12,0.72)';
  ctx.shadowBlur = W * 0.028;
  ctx.shadowOffsetX = W * 0.006;
  ctx.shadowOffsetY = W * 0.012;
  ctx.fillStyle = '#1a1226';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.clip();
  if (image) {
    const r = cropRect(crop, image, box);
    ctx.filter = grade.filter;
    ctx.drawImage(image, r.dx, r.dy, r.dw, r.dh);
    ctx.filter = 'none';
  }
  const g = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  g.addColorStop(0, 'rgba(18,8,26,0.10)');
  g.addColorStop(0.6, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(16,6,22,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();

  // Thick cream ring with an ink keyline: the "cut-out" reading.
  ctx.save();
  archPath(ctx, box.x, box.y, box.w, box.h);
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = Math.max(3, W * 0.016);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, W * 0.005);
  archPath(ctx, box.x - W * 0.0085, box.y - W * 0.0085, box.w + W * 0.017, box.h + W * 0.0085);
  ctx.stroke();
  ctx.restore();
}

/** Paints the whole poster. */
export function drawPoster(canvas, state, photos) {
  const format = FORMATS.find((f) => f.id === state.formatId) ?? FORMATS[0];
  const W = format.width;
  const H = format.height;
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext('2d');
  const grid = gridFor(format.id);
  state.canvasH = H;
  state.canvasW = W;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#150e20';
  ctx.fillRect(0, 0, W, H);
  const pattern = ctx.createPattern(boardTexture(W, H), 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
  }

  const grade = gradeFor(state.gradeId);
  const heroId = state.heroId ?? 'p1';

  // Panels first, hero last so its arch sits on top of the neighbours.
  const ordered = [...grid.panels].sort((a, b) => (a.id === heroId ? 1 : 0) - (b.id === heroId ? 1 : 0));
  for (const spec of ordered) {
    if (spec.id === heroId) continue;
    const box = boxToPixels(spec.box, W, H);
    const slot = state.panels[spec.id] ?? {};
    const image = photos[slot.photoIndex ?? 0] ?? null;
    paintPhoto(ctx, box, slot.crop ?? { fx: 0.5, fy: 0.36, zoom: 1, mode: 'fill' }, image, grade);
    framePanel(ctx, box, W);
    castTag(ctx, box, state.roles?.[spec.id] ?? spec.role, W);
  }

  const heroSpec = grid.panels.find((p) => p.id === heroId) ?? grid.panels[0];
  const heroBox = boxToPixels(heroSpec.box, W, H);
  const heroSlot = state.panels[heroSpec.id] ?? {};
  const heroImage = photos[heroSlot.photoIndex ?? 0] ?? null;
  const heroCrop = heroSlot.crop ?? { fx: 0.5, fy: 0.36, zoom: 1, mode: 'fill' };
  paintPhoto(ctx, heroBox, heroCrop, heroImage, grade);
  framePanel(ctx, heroBox, W);
  drawHero(ctx, heroBox, heroCrop, heroImage, grade, W);
  castTag(ctx, heroBox, state.roles?.[heroSpec.id] ?? heroSpec.role, W);

  // Sunset wash across the board behind the lettering.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.86, 0, W * 0.5, H * 0.86, W * 0.7);
  glow.addColorStop(0, 'rgba(255,110,80,0.20)');
  glow.addColorStop(1, 'rgba(255,110,80,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  if (state.sealOn !== false) drawSeal(ctx, grid, W, H);
  drawTitle(ctx, state, grid, W, H);
  drawBilling(ctx, grid, W, H, state.billing ?? BILLING_LINES);

  ctx.save();
  ctx.strokeStyle = 'rgba(247,241,227,0.55)';
  ctx.lineWidth = Math.max(2, W * 0.006);
  ctx.strokeRect(W * 0.012, W * 0.012, W - W * 0.024, H - W * 0.024);
  ctx.restore();
  return canvas;
}
