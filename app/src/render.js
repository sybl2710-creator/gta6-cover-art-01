// Vice Pop Studio - canvas poster renderer.
// Every coordinate is expressed as a fraction of the canvas and converted to
// pixels here, so the small preview and the big PNG export stay identical.
// Drawing helpers take finished pixel rectangles and never depend on layout ids.

import { coverRect, defaultFocus } from './crop.js';

const CAPTION_FONT = "'Liberation Sans', 'Arial Black', sans-serif";
const UI_FONT = "'Liberation Sans', Arial, sans-serif";

const BACKING = '#0a0812';
const CREAM = 'rgba(249, 243, 226, 0.92)';
const DARK_INK = 'rgba(12, 8, 20, 0.9)';

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

// ---------------------------------------------------------------------------
// Geometry and text utilities
// ---------------------------------------------------------------------------

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

// Full-width base, then an elliptical cap that bulges upward from the panel.
function archPath(ctx, rect) {
  const capH = Math.min(rect.h * 0.32, rect.w * 0.36, rect.h * 0.9);
  const cx = rect.x + rect.w / 2;
  ctx.beginPath();
  ctx.moveTo(rect.x, rect.y + rect.h);
  ctx.lineTo(rect.x, rect.y + capH);
  ctx.ellipse(cx, rect.y + capH, rect.w / 2, capH, 0, Math.PI, Math.PI * 2, false);
  ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
  ctx.closePath();
}

function fitFontSize(ctx, text, weight, family, maxWidth, start, min) {
  let size = start;
  for (let i = 0; i < 48 && size > min; i += 1) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size *= 0.94;
  }
  size = Math.max(size, min);
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

// Warm up the webfont so the first measured draw is not stuck on fallback
// metrics. drawCover stays synchronous, so a later redraw benefits.
function primeFonts(width) {
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return;
  const base = Math.max(14, Math.round(width * 0.1));
  document.fonts.load(`900 ${base}px 'Liberation Sans'`).catch(() => {});
  document.fonts.load(`700 ${Math.round(base * 0.25)}px 'Liberation Sans'`).catch(() => {});
}

function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Photo panels
// ---------------------------------------------------------------------------

function panelRect(panel, width, height) {
  return {
    x: clamp(num(panel.x, 0), 0, 1) * width,
    y: clamp(num(panel.y, 0), 0, 1) * height,
    w: clamp(num(panel.w, 0), 0, 1) * width,
    h: clamp(num(panel.h, 0), 0, 1) * height,
  };
}

// crop.js may expose a focus object as {fx, fy}, {x, y}, an array, or a
// getter. Normalize all of those into two safe fractions.
function resolveFocus() {
  let focus = defaultFocus;
  if (typeof focus === 'function') {
    try {
      focus = focus();
    } catch (err) {
      focus = null;
    }
  }
  if (Array.isArray(focus)) focus = { fx: focus[0], fy: focus[1] };

  const source = focus && typeof focus === 'object' ? focus : {};
  const rawX = source.fx != null ? source.fx : source.x;
  const rawY = source.fy != null ? source.fy : source.y;
  return {
    fx: clamp(num(rawX, 0.5), 0, 1),
    fy: clamp(num(rawY, 0.42), 0, 1),
  };
}

function drawPlaceholder(ctx, rect) {
  const base = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  base.addColorStop(0, '#241b3d');
  base.addColorStop(0.55, '#151027');
  base.addColorStop(1, '#090711');
  ctx.fillStyle = base;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h * 0.4;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rect.w, rect.h) * 0.65);
  glow.addColorStop(0, 'rgba(255, 116, 172, 0.14)');
  glow.addColorStop(1, 'rgba(255, 116, 172, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = Math.max(1, rect.w * 0.002);
  const step = Math.max(9, rect.w * 0.07);
  for (let d = -rect.h; d < rect.w; d += step) {
    ctx.beginPath();
    ctx.moveTo(rect.x + d, rect.y);
    ctx.lineTo(rect.x + d + rect.h, rect.y + rect.h);
    ctx.stroke();
  }
}

function centerCrop(iw, ih, pw, ph) {
  const scale = Math.max(pw / iw, ph / ih);
  return {
    sx: (iw - pw / scale) / 2,
    sy: (ih - ph / scale) / 2,
    sw: pw / scale,
    sh: ph / scale,
  };
}

function drawPhoto(ctx, img, rect) {
  const iw = img.naturalWidth || img.width || 0;
  const ih = img.naturalHeight || img.height || 0;
  if (!iw || !ih) {
    drawPlaceholder(ctx, rect);
    return;
  }

  const focus = resolveFocus();
  let crop = null;
  try {
    crop = coverRect(iw, ih, rect.w, rect.h, focus.fx, focus.fy);
  } catch (err) {
    crop = null;
  }
  if (!crop || !(crop.sw > 0) || !(crop.sh > 0)) {
    crop = centerCrop(iw, ih, rect.w, rect.h);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  try {
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, rect.x, rect.y, rect.w, rect.h);
  } catch (err) {
    drawPlaceholder(ctx, rect);
  }
}

function drawPanel(ctx, panel, img, width, height) {
  const rect = panelRect(panel, width, height);
  rect.arch = Boolean(panel.arch);
  rect.panelId = panel.id;
  if (rect.w < 1 || rect.h < 1) return rect;

  ctx.save();
  if (rect.arch) archPath(ctx, rect);
  else {
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.clip();

  if (img) drawPhoto(ctx, img, rect);
  else drawPlaceholder(ctx, rect);
  ctx.restore();

  if (rect.arch) {
    archPath(ctx, rect);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 241, 203, 0.96)';
    ctx.lineWidth = Math.max(2, width * 0.0032);
    ctx.shadowColor = 'rgba(255, 205, 120, 0.55)';
    ctx.shadowBlur = width * 0.014;
    ctx.stroke();
    ctx.restore();
  }

  return rect;
}

function drawPanelBorders(ctx, rects, width) {
  ctx.save();
  ctx.strokeStyle = 'rgba(247, 241, 224, 0.4)';
  ctx.lineWidth = Math.max(1, width * 0.0016);
  for (const rect of rects) {
    // The hero already has a bright arch contour; a rectangle here would
    // slice straight across the curved top.
    if (rect.arch || rect.w < 1 || rect.h < 1) continue;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Grade: sky wash, tint, vignette, grain
// ---------------------------------------------------------------------------

function drawGrade(ctx, width, height, grade) {
  const g = grade || {};
  const skyH = height * 0.52;

  const sky = ctx.createLinearGradient(0, 0, 0, skyH);
  sky.addColorStop(0, g.skyTop || '#2a1954');
  sky.addColorStop(0.58, g.skyMid || '#a84a78');
  sky.addColorStop(1, g.skyBot || '#ffb069');
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, skyH);
  ctx.restore();

  const tintAlpha = clamp(num(g.tintAlpha, 0.16), 0, 1);
  if (tintAlpha > 0.001) {
    ctx.save();
    ctx.globalAlpha = tintAlpha;
    ctx.fillStyle = g.tint || '#ff5e8a';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  const vignette = clamp(num(g.vignette, 0.5), 0, 1);
  if (vignette > 0.001) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    ctx.translate(width / 2, height / 2);
    ctx.scale(width / 2, height / 2);
    const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(1, `rgba(0, 0, 0, ${0.78 * vignette})`);
    ctx.fillStyle = shade;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  const grain = clamp(num(g.grain, 0.3), 0, 1);
  if (grain > 0.005) {
    const random = seededRandom(0x5eed1a);
    const count = Math.round(260 + grain * 840);
    const maxDot = Math.max(1, width * 0.0026);
    ctx.save();
    for (let i = 0; i < count; i += 1) {
      const x = random() * width;
      const y = random() * height;
      const size = (0.6 + random() * 1.6) * maxDot;
      const light = random() > 0.45;
      ctx.globalAlpha = (light ? 0.16 : 0.12) * grain * (0.45 + random() * 0.55);
      ctx.fillStyle = light ? '#ffffff' : '#000000';
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Chrome caption
// ---------------------------------------------------------------------------

function drawChromeCaption(ctx, text, centerX, centerY, size, maxWidth) {
  const font = `900 ${size}px ${CAPTION_FONT}`;
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const measured = ctx.measureText(text).width;
  // At the minimum size a very long caption can still be too wide; squeeze
  // the finished lettering horizontally instead of shrinking it further.
  const squeeze = measured > maxWidth ? maxWidth / measured : 1;

  let plate = null;
  const canOffscreen =
    typeof document !== 'undefined' && typeof document.createElement === 'function';
  if (canOffscreen) {
    const pad = Math.ceil(size * 0.2);
    plate = document.createElement('canvas');
    plate.width = Math.max(4, Math.ceil(measured) + pad * 2);
    plate.height = Math.max(4, Math.ceil(size * 1.52));
    const pctx = plate.getContext('2d');
    if (pctx) {
      const pw = plate.width;
      const ph = plate.height;
      pctx.font = font;
      pctx.textAlign = 'center';
      pctx.textBaseline = 'middle';

      // Brushed metal: cool silver, warm gold core, polished silver again.
      const metal = pctx.createLinearGradient(0, ph * 0.16, 0, ph * 0.88);
      metal.addColorStop(0, '#fdfdff');
      metal.addColorStop(0.18, '#e3e9f7');
      metal.addColorStop(0.38, '#fff8e6');
      metal.addColorStop(0.5, '#e7bf72');
      metal.addColorStop(0.58, '#c7953f');
      metal.addColorStop(0.66, '#f4d9a2');
      metal.addColorStop(0.8, '#ffffff');
      metal.addColorStop(1, '#dbe2f0');
      pctx.fillStyle = metal;
      pctx.fillText(text, pw / 2, ph / 2);

      // Shine banding, masked to the glyph pixels only.
      pctx.globalCompositeOperation = 'source-atop';
      pctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      const stripeH = Math.max(1, size * 0.022);
      for (let y = ph * 0.2; y < ph * 0.88; y += size * 0.13) {
        pctx.fillRect(0, y, pw, stripeH);
      }
      const depth = pctx.createLinearGradient(0, ph * 0.4, 0, ph);
      depth.addColorStop(0, 'rgba(0, 0, 0, 0)');
      depth.addColorStop(1, 'rgba(52, 27, 8, 0.36)');
      pctx.fillStyle = depth;
      pctx.fillRect(0, 0, pw, ph);
    } else {
      plate = null;
    }
  }

  ctx.save();
  ctx.translate(centerX, centerY);
  if (squeeze < 1) ctx.scale(squeeze, 1);

  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = DARK_INK;
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeText(text, 0, 0);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.62)';
  ctx.shadowBlur = size * 0.34;
  ctx.shadowOffsetY = size * 0.055;
  if (plate) {
    ctx.drawImage(plate, -plate.width / 2, -plate.height / 2);
  } else {
    ctx.fillStyle = '#f2e4c0';
    ctx.fillText(text, 0, 0);
  }
  ctx.restore();
  ctx.restore();
}

function drawSubtitle(ctx, text, centerX, centerY, size, width) {
  ctx.save();
  ctx.font = `600 ${size}px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CREAM;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
  ctx.shadowBlur = size * 0.6;
  ctx.shadowOffsetY = size * 0.12;
  const trimmed = text.length > 86 ? `${text.slice(0, 83)}...` : text;
  ctx.fillText(trimmed, centerX, centerY);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Role pills, billing, seal
// ---------------------------------------------------------------------------

function wrapTags(ctx, texts, size, maxWidth) {
  const padX = size * 0.82;
  const gap = size * 0.55;
  ctx.font = `700 ${size}px ${UI_FONT}`;
  const rows = [];
  let row = [];
  let rowWidth = 0;

  for (const raw of texts) {
    const label = String(raw == null ? '' : raw).trim();
    if (!label) continue;
    const pillWidth = ctx.measureText(label).width + padX * 2;
    if (row.length && rowWidth + gap + pillWidth > maxWidth) {
      rows.push({ items: row, width: rowWidth });
      row = [];
      rowWidth = 0;
    }
    if (row.length) rowWidth += gap;
    row.push({ label, width: pillWidth });
    rowWidth += pillWidth;
  }
  if (row.length) rows.push({ items: row, width: rowWidth });
  return { rows, padX, gap, pillH: size * 1.72 };
}

function drawTags(ctx, tags, centerX, anchorBottom, maxWidth, width) {
  if (!Array.isArray(tags) || !tags.length) return;

  let size = width * 0.021;
  const floor = width * 0.0105;
  let layout = wrapTags(ctx, tags, size, maxWidth);
  while (size > floor && layout.rows.some((row) => row.width > maxWidth + 0.5)) {
    size *= 0.92;
    layout = wrapTags(ctx, tags, size, maxWidth);
  }
  if (!layout.rows.length) return;

  const gapY = size * 0.45;
  const totalH = layout.rows.length * layout.pillH + (layout.rows.length - 1) * gapY;
  const top = anchorBottom - totalH;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${size}px ${UI_FONT}`;
  ctx.lineWidth = Math.max(1, size * 0.1);

  layout.rows.forEach((row, rowIndex) => {
    let x = centerX - row.width / 2;
    const y = top + rowIndex * (layout.pillH + gapY);
    for (const pill of row.items) {
      roundRectPath(ctx, x, y, pill.width, layout.pillH, layout.pillH / 2);
      ctx.fillStyle = 'rgba(10, 8, 19, 0.74)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 235, 187, 0.92)';
      ctx.stroke();
      ctx.fillStyle = '#fdf6e5';
      ctx.fillText(pill.label, x + pill.width / 2, y + layout.pillH / 2 + size * 0.02);
      x += pill.width + layout.gap;
    }
  });
  ctx.restore();
}

function drawBilling(ctx, text, width, height, size, maxWidth) {
  if (!text) return;
  ctx.save();
  const fontOf = (s) => `500 ${s}px ${UI_FONT}`;
  ctx.font = fontOf(size);
  let measured = ctx.measureText(text).width;
  while (size > 8 && measured > maxWidth) {
    size *= 0.93;
    ctx.font = fontOf(size);
    measured = ctx.measureText(text).width;
  }
  const squeeze = measured > maxWidth ? maxWidth / measured : 1;

  ctx.translate(width / 2, height - Math.max(height * 0.016, size * 1.2));
  if (squeeze < 1) ctx.scale(squeeze, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = fontOf(size);
  ctx.fillStyle = 'rgba(232, 229, 221, 0.62)';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function sealTopLabel(seal) {
  const raw = typeof seal === 'string' ? seal.trim() : '';
  if (!raw || /^(true|yes|on|seal|stamp)$/i.test(raw)) return 'VICE POP';
  return raw.toUpperCase().slice(0, 16);
}

// Place characters around a circle. `flip` walks the bottom arc in reverse so
// the lower text stays upright to the viewer.
function arcText(ctx, text, radius, centerAngle, fontSize, flip) {
  if (!text) return;
  ctx.save();
  ctx.font = `700 ${fontSize}px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const tracking = fontSize * 0.13;
  const total = widths.reduce((sum, w) => sum + w, 0) + tracking * Math.max(0, chars.length - 1);
  const totalAngle = total / radius;
  const dir = flip ? -1 : 1;
  let angle = centerAngle - (dir * totalAngle) / 2;

  chars.forEach((ch, i) => {
    const half = widths[i] / radius / 2;
    angle += dir * half;
    ctx.save();
    ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.rotate(angle + (flip ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += dir * (half + tracking / radius);
  });
  ctx.restore();
}

function drawSeal(ctx, seal, width, height) {
  const radius = Math.min(width * 0.056, height * 0.05);
  if (radius < 8) return;
  const margin = Math.max(width * 0.028, 8);
  const cx = width - radius - margin;
  const cy = height - radius - Math.max(margin * 1.6, height * 0.028);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.1);

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.98, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(9, 7, 15, 0.42)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(247, 226, 180, 0.9)';
  ctx.lineWidth = Math.max(1.5, radius * 0.06);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(247, 226, 180, 0.66)';
  ctx.lineWidth = Math.max(1, radius * 0.035);
  ctx.stroke();

  const ink = 'rgba(250, 235, 202, 0.94)';
  ctx.fillStyle = ink;
  arcText(ctx, sealTopLabel(seal), radius * 0.83, -Math.PI / 2, Math.max(6, radius * 0.17), false);
  arcText(ctx, 'EST. 2026', radius * 0.82, Math.PI / 2, Math.max(5, radius * 0.13), true);

  // Two small stamps at the sides separate the top and bottom arcs.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.rotate(side * Math.PI * 0.5);
    ctx.beginPath();
    ctx.arc(0, radius * 0.8, Math.max(1, radius * 0.03), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function drawCover(canvas, opts) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  if (!width || !height) return;

  const options = opts || {};
  const photos = options.photos || {};
  const layout = options.layout || {};
  const grade = options.grade || {};
  const caption = String(options.caption == null ? '' : options.caption);
  const subtitle = String(options.subtitle == null ? '' : options.subtitle);
  const billing = String(options.billing == null ? '' : options.billing);
  const seal = options.seal;
  const tags = Array.isArray(options.tags) ? options.tags : [];

  primeFonts(width);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.filter = 'none';

  // 1. Opaque backing; exported PNGs never show transparency.
  ctx.fillStyle = BACKING;
  ctx.fillRect(0, 0, width, height);

  // 2. Panels, in layout order, with photos cropped to fill each frame.
  const panels = Array.isArray(layout.panels) ? layout.panels : [];
  const rects = [];
  for (const panel of panels) {
    if (!panel || typeof panel !== 'object') continue;
    rects.push(drawPanel(ctx, panel, photos[panel.id] || null, width, height));
  }

  // 3. Thin separation lines; the arched hero keeps only its bright contour.
  drawPanelBorders(ctx, rects, width);

  // 4. Shared grade over the whole poster.
  drawGrade(ctx, width, height, grade);

  // 5. Caption, then 6. subtitle, both centered.
  let cursorY = height * 0.055;
  let captionSize = 0;
  if (caption.trim()) {
    captionSize = fitFontSize(
      ctx,
      caption,
      900,
      CAPTION_FONT,
      width * 0.88,
      width * 0.135,
      width * 0.038,
    );
    const capY = cursorY + captionSize * 0.56;
    drawChromeCaption(ctx, caption, width / 2, capY, captionSize, width * 0.88);
    cursorY = capY + captionSize * 0.64;
  }

  if (subtitle.trim()) {
    const preferred = captionSize
      ? Math.min(width * 0.03, Math.max(width * 0.012, captionSize * 0.36))
      : width * 0.024;
    const subSize = fitFontSize(ctx, subtitle, 600, UI_FONT, width * 0.82, preferred, width * 0.009);
    drawSubtitle(ctx, subtitle, width / 2, cursorY + subSize * 0.9, subSize, width);
  }

  // 7. Role pills, anchored near the bottom of the hero panel.
  const hero = rects.find((rect) => rect.arch) || rects[rects.length - 1] || null;
  if (tags.length) {
    const billingSize = Math.max(8, width * 0.0098);
    const anchorX = hero ? hero.x + hero.w / 2 : width / 2;
    let anchorBottom = hero ? hero.y + hero.h - hero.h * 0.075 : height * 0.86;
    anchorBottom = Math.min(anchorBottom, height - billingSize * 3.6);
    anchorBottom = Math.max(anchorBottom, height * 0.5);
    const maxWidth = Math.min(width * 0.9, hero ? Math.max(hero.w * 0.94, width * 0.5) : width * 0.9);
    drawTags(ctx, tags, anchorX, anchorBottom, maxWidth, width);
  }

  // 8. Billing, kept clear of the seal on the right.
  drawBilling(
    ctx,
    billing,
    width,
    height,
    Math.max(8, width * 0.0098),
    width * 0.68,
  );

  // 9. Bottom-right stamp.
  drawSeal(ctx, seal, width, height);

  ctx.restore();
}
