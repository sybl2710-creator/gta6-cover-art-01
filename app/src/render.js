// Vice Pop Studio poster renderer.
//
// drawPoster() paints the full cover onto a canvas from scratch. Everything is
// derived from the canvas size, so the same code fills the 540px preview and
// the high-resolution export. The module is pure: no DOM, no network, system
// fonts only.

import { gradeById, gradeFilter, gradeOverlay } from './grades.js';
import { panelLayout, archPath } from './layouts.js';
import { focusCrop } from './crop.js';

const INK = '#1a0f14';
const GOLD = '#ffc94a';
const FONT_STACK = 'Arial, Helvetica, sans-serif';
const TAGS = ['HERO', 'ICON', '2026'];
const FOOTER = 'A VICE POP PRODUCTION - STARRING YOU - MUSIC BY THE SUNSET - (C) 2026 VICE POP';

// Warm sunset pairs for the six panels when no photo is available.
const PANEL_SUNSETS = [
  ['#ffc06b', '#b83d68'],
  ['#ff9a5e', '#7a2b5e'],
  ['#ffd58a', '#cc5348'],
  ['#f7a072', '#8e3b61'],
  ['#ffc27a', '#b04a77'],
  ['#ff9a6b', '#66264e'],
];

/* ------------------------------------------------------------------ */
/* Small numeric and canvas helpers                                    */
/* ------------------------------------------------------------------ */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isUsablePhoto(photo) {
  if (!photo) return false;
  const w = photo.naturalWidth || photo.width;
  const h = photo.naturalHeight || photo.height;
  return w > 0 && h > 0;
}

function setFont(ctx, size, weight) {
  ctx.font = `${weight} ${Math.max(6, size)}px ${FONT_STACK}`;
}

function roundRectPath(ctx, x, y, w, h, radius) {
  const r = clamp(radius, 0, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function insetRect(rect, inset) {
  return {
    x: rect.x + inset,
    y: rect.y + inset,
    w: Math.max(1, rect.w - inset * 2),
    h: Math.max(1, rect.h - inset * 2),
  };
}

/** Draws the photo into the dest rect using a focus-point crop. */
function drawCover(ctx, photo, dx, dy, dw, dh, fx, fy) {
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const crop = focusCrop(iw, ih, dw, dh, fx, fy);
  if (crop.sw <= 0 || crop.sh <= 0) return;
  ctx.drawImage(photo, crop.sx, crop.sy, crop.sw, crop.sh, dx, dy, dw, dh);
}

function warmGradient(ctx, x, y, w, h, top, bottom, diagonal = false) {
  const gradient = diagonal
    ? ctx.createLinearGradient(x, y, x + w, y + h)
    : ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  return gradient;
}

/** Shrinks a font size until the text fits maxWidth. */
function fitFont(ctx, text, weight, baseSize, maxWidth) {
  let size = baseSize;
  setFont(ctx, size, weight);
  const width = ctx.measureText(text).width;
  if (width > maxWidth && width > 0) {
    size = Math.max(8, size * (maxWidth / width));
    setFont(ctx, size, weight);
  }
  return size;
}

/** Centre-aligned text with manual letter spacing (works everywhere). */
function drawTrackedText(ctx, text, centerX, baselineY, tracking) {
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total =
    widths.reduce((sum, w) => sum + w, 0) +
    tracking * Math.max(0, chars.length - 1);

  const previousAlign = ctx.textAlign;
  ctx.textAlign = 'center';

  let cursor = centerX - total / 2;
  chars.forEach((ch, index) => {
    ctx.fillText(ch, cursor + widths[index] / 2, baselineY);
    cursor += widths[index] + tracking;
  });

  ctx.textAlign = previousAlign;
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function drawHero(ctx, hero, photo, focus, grade, overlay) {
  ctx.save();
  archPath(ctx, hero);
  ctx.clip();
  ctx.fillStyle = '#2a1620';
  ctx.fillRect(hero.x, hero.y, hero.w, hero.h);

  if (isUsablePhoto(photo)) {
    ctx.filter = gradeFilter(grade);
    drawCover(ctx, photo, hero.x, hero.y, hero.w, hero.h, focus.x, focus.y);
    ctx.filter = 'none';
  } else {
    ctx.fillStyle = warmGradient(
      ctx,
      hero.x,
      hero.y,
      hero.w,
      hero.h,
      '#ffd27a',
      '#7d1f4a',
    );
    ctx.fillRect(hero.x, hero.y, hero.w, hero.h);
  }

  ctx.restore();

  // Grade wash, clipped to the arch only.
  ctx.save();
  archPath(ctx, hero);
  ctx.clip();
  ctx.globalAlpha = clamp(overlay.opacity, 0, 1);
  ctx.fillStyle = warmGradient(
    ctx,
    hero.x,
    hero.y,
    hero.w,
    hero.h,
    overlay.top,
    overlay.bottom,
  );
  ctx.fillRect(hero.x, hero.y, hero.w, hero.h);
  ctx.restore();
}

function strokeArch(ctx, hero, scale) {
  ctx.save();
  archPath(ctx, hero);
  ctx.strokeStyle = 'rgba(255,244,236,0.85)';
  ctx.lineWidth = Math.max(1.5, scale * 0.0028);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */

function panelFocus(index, seed) {
  // Six-step cycles so all six panels land on different framings.
  const a = (((index * 7 + seed) % 6) + 6) % 6;
  const b = (((index * 3 + seed) % 4) + 4) % 4;
  return { fx: 0.3 + (0.4 * a) / 5, fy: 0.25 + (0.3 * b) / 3 };
}

function drawPanel(ctx, panel, index, photo, grade, scale, seed) {
  const inset = Math.max(1.5, scale * 0.0035);
  const radius = Math.max(4, scale * 0.0074);
  const frame = insetRect(panel, inset);
  const focus = panelFocus(index, seed);

  ctx.save();
  roundRectPath(ctx, frame.x, frame.y, frame.w, frame.h, radius);
  ctx.clip();
  ctx.fillStyle = '#2a1620';
  ctx.fillRect(frame.x, frame.y, frame.w, frame.h);

  if (isUsablePhoto(photo)) {
    ctx.filter = gradeFilter(grade);
    drawCover(
      ctx,
      photo,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      focus.fx,
      focus.fy,
    );
    ctx.filter = 'none';
  } else {
    const [top, bottom] = PANEL_SUNSETS[index % PANEL_SUNSETS.length];
    ctx.fillStyle = warmGradient(
      ctx,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      top,
      bottom,
      index % 2 === 0,
    );
    ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
  }

  ctx.restore();

  ctx.save();
  roundRectPath(ctx, frame.x, frame.y, frame.w, frame.h, radius);
  ctx.strokeStyle = 'rgba(255,240,232,0.72)';
  ctx.lineWidth = Math.max(1, scale * 0.0018);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Chrome type, tags, seal, footer                                     */
/* ------------------------------------------------------------------ */

function drawCaption(ctx, hero, caption, scale) {
  const text = String(caption || 'VICE POP').toUpperCase();
  const baseSize = scale * 0.11;
  const size = fitFont(ctx, text, 900, baseSize, hero.w * 0.92);

  // Anchor the type block to the foot of the hero for any aspect ratio.
  const pillHeight = clamp(scale * 0.04, 16, hero.h * 0.075);
  const pillBottom = hero.y + hero.h - hero.h * 0.02;
  const pillTop = pillBottom - pillHeight;
  const subtitleSize = scale * 0.032;
  const subtitleBase = pillTop - scale * 0.022;
  const captionBase = subtitleBase - scale * 0.055;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const gold = ctx.createLinearGradient(
    hero.x,
    captionBase - size * 0.85,
    hero.x,
    captionBase + size * 0.12,
  );
  gold.addColorStop(0, '#ffcf5c');
  gold.addColorStop(0.55, '#fff3d6');
  gold.addColorStop(1, '#ffffff');

  ctx.fillStyle = gold;
  ctx.fillText(text, hero.x + hero.w / 2, captionBase);
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = INK;
  ctx.lineWidth = scale * 0.008;
  ctx.strokeText(text, hero.x + hero.w / 2, captionBase);

  ctx.restore();

  return { captionBase, subtitleBase, subtitleSize, pillTop, pillHeight };
}

function drawSubtitle(ctx, hero, subtitle, block, scale) {
  const text = String(subtitle || 'A story in seven frames').toUpperCase();
  fitFont(ctx, text, 700, block.subtitleSize, hero.w * 0.86);

  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fdf7ef';
  drawTrackedText(
    ctx,
    text,
    hero.x + hero.w / 2,
    block.subtitleBase,
    scale * 0.004,
  );
  ctx.restore();
}

function drawTags(ctx, hero, block, scale) {
  setFont(ctx, clamp(scale * 0.019, 10, 40), 700);
  const padX = scale * 0.018;
  const gap = scale * 0.012;
  const widths = TAGS.map((tag) => ctx.measureText(tag).width + padX * 2);
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (TAGS.length - 1);

  const height = block.pillHeight;
  const radius = height / 2;
  let x = hero.x + hero.w / 2 - total / 2;
  const y = block.pillTop;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(1, scale * 0.0022);

  TAGS.forEach((tag, index) => {
    const w = widths[index];
    roundRectPath(ctx, x, y, w, height, radius);
    ctx.fillStyle = 'rgba(26,15,20,0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,248,240,0.8)';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(tag, x + w / 2, y + height / 2 + height * 0.03);
    x += w + gap;
  });

  ctx.restore();
}

function drawSeal(ctx, panel, scale) {
  const radius = Math.min(scale * 0.055, panel.w * 0.42, panel.h * 0.62);
  const cx = panel.x + panel.w - radius * 0.72;
  const cy = panel.y + panel.h - radius * 0.72;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(26,15,20,0.9)';
  ctx.fill();

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1.5, scale * 0.0028);
  ctx.beginPath();
  ctx.arc(cx, cy, radius - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = Math.max(1, scale * 0.0014);
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const topSize = Math.min(scale * 0.019, radius * 0.34);
  fitFont(ctx, 'VICE POP', 700, topSize, radius * 1.28);
  ctx.fillText('VICE POP', cx, cy - radius * 0.16);

  const bottomSize = Math.min(scale * 0.014, radius * 0.27);
  fitFont(ctx, 'EST. 2026', 700, bottomSize, radius * 1.28);
  ctx.fillText('EST. 2026', cx, cy + radius * 0.22);

  ctx.restore();
}

function drawFooter(ctx, size) {
  const fontSize = size.w * 0.016;
  ctx.save();
  fitFont(ctx, FOOTER, 700, fontSize, size.w * 0.94);
  ctx.fillStyle = 'rgba(228,216,220,0.7)';
  ctx.textBaseline = 'alphabetic';
  drawTrackedText(
    ctx,
    FOOTER,
    size.w / 2,
    size.h - Math.max(4, size.w * 0.006),
    size.w * 0.0016,
  );
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function drawPoster(canvas, opts = {}) {
  const settings = opts || {};
  const size = {
    w: Math.max(1, Math.round((settings.size && settings.size.w) || 1080)),
    h: Math.max(1, Math.round((settings.size && settings.size.h) || 1080)),
  };

  canvas.width = size.w;
  canvas.height = size.h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const photo = settings.photo || null;
  const focus = {
    x: clamp(
      settings.focus && Number.isFinite(settings.focus.x) ? settings.focus.x : 0.5,
      0,
      1,
    ),
    y: clamp(
      settings.focus && Number.isFinite(settings.focus.y) ? settings.focus.y : 0.35,
      0,
      1,
    ),
  };
  const caption = typeof settings.caption === 'string' ? settings.caption : '';
  const subtitle =
    typeof settings.subtitle === 'string' ? settings.subtitle : '';
  const seed = Number.isFinite(settings.seed) ? Math.trunc(settings.seed) : 0;
  const grade = gradeById(settings.grade);
  const overlay = gradeOverlay(grade);

  const L = panelLayout(size.w, size.h);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = 'none';

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, size.w, size.h);

  // 3 + 4. Hero photo, then its grade wash.
  drawHero(ctx, L.hero, photo, focus, grade, overlay);

  // 5. Six framed panel crops of the same photo.
  L.panels.forEach((panel, index) => {
    drawPanel(ctx, panel, index, photo, grade, size.w, seed);
  });

  // 6. Frame lines.
  strokeArch(ctx, L.hero, size.w);

  // 7-9. Caption, subtitle and tags.
  const block = drawCaption(ctx, L.hero, caption, size.w);
  drawSubtitle(ctx, L.hero, subtitle, block, size.w);
  drawTags(ctx, L.hero, block, size.w);

  // 10 + 11. Seal and billing line.
  const lastPanel = L.panels[L.panels.length - 1];
  if (lastPanel) drawSeal(ctx, lastPanel, size.w);
  drawFooter(ctx, size);

  // 12. Leave the context in a predictable state.
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
