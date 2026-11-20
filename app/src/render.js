import { gradeById } from './grades.js';
import { faceAwareCrop } from './crop.js';
import { layoutByIndex } from './layouts.js';

const FONT_STACK = '"Liberation Sans", sans-serif';
const DEFAULT_CAPTION = 'Boulevard Queen';
const DEFAULT_SUBTITLE = 'A story in seven frames';
const FOOTER_TEXT = 'A VICE POP PRODUCTION - STARRING YOU - MUSIC BY THE SUNSET - (C) 2026 VICE POP';
const TAGS = ['HERO', 'ICON', '2026'];
const TILT_PATTERN = [1, -0.7, 0.55, -1, 0.8, -0.6];

// Different target aspect ratios per panel, so faceAwareCrop picks a
// genuinely different region for each of the six small frames.
const CROP_VARIANTS = [
  { ax: 1, ay: 1 },
  { ax: 1.5, ay: 0.76 },
  { ax: 0.76, ay: 1.44 },
  { ax: 1.28, ay: 0.9 },
  { ax: 0.88, ay: 1.3 },
  { ax: 1.75, ay: 0.62 },
];

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function setFont(ctx, weight, size) {
  ctx.font = `${weight} ${Math.max(1, size)}px ${FONT_STACK}`;
}

function setSpacing(ctx, px) {
  try {
    ctx.letterSpacing = `${px}px`;
  } catch (error) {
    // Older engines simply ignore letter spacing.
  }
}

function textWidth(ctx, text) {
  return ctx.measureText(text).width;
}

function roundRectPath(ctx, x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function archPath(ctx, x, y, w, h, archH) {
  const ah = clamp(archH, 1, h * 0.72);
  ctx.beginPath();
  ctx.moveTo(x, y + ah);
  ctx.ellipse(x + w / 2, y + ah, w / 2, ah, 0, Math.PI, Math.PI * 2, false);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function diamond(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
}

function hash(seed) {
  const value = Math.sin(seed * 12.9898 + 4.1414) * 43758.5453;
  return value - Math.floor(value);
}

function imageSize(img) {
  if (!img) return null;
  const width = img.naturalWidth || img.videoWidth || img.width || 0;
  const height = img.naturalHeight || img.videoHeight || img.height || 0;
  return width > 0 && height > 0 ? { width, height } : null;
}

function fallbackCrop(size, targetW, targetH) {
  const scale = Math.max(targetW / size.width, targetH / size.height);
  const sw = Math.min(size.width, targetW / scale);
  const sh = Math.min(size.height, targetH / scale);
  return {
    sx: clamp((size.width - sw) / 2, 0, Math.max(0, size.width - sw)),
    sy: clamp((size.height - sh) * 0.15, 0, Math.max(0, size.height - sh)),
    sw,
    sh,
  };
}

function drawPlaceholder(ctx, x, y, w, h, seed, grade) {
  const rand = hash(seed);
  const rand2 = hash(seed + 7.3);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const sky = ctx.createLinearGradient(x, y, x + w * 0.25, y + h);
  sky.addColorStop(0, '#220a1c');
  sky.addColorStop(0.34, '#5a1734');
  sky.addColorStop(0.66, '#a83b37');
  sky.addColorStop(1, '#e2924e');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  const sunX = x + w * (0.3 + rand * 0.4);
  const sunY = y + h * (0.32 + rand2 * 0.16);
  const sunR = Math.min(w, h) * (0.18 + rand2 * 0.1);
  const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.6);
  halo.addColorStop(0, grade.glow);
  halo.addColorStop(0.45, 'rgba(255, 150, 110, 0.35)');
  halo.addColorStop(1, 'rgba(255, 120, 90, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x, y, w, h);

  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe2b0';
  ctx.fill();

  ctx.fillStyle = 'rgba(24, 8, 22, 0.22)';
  const band = Math.max(2, h * 0.02);
  for (let i = 0; i < 5; i += 1) {
    const by = sunY + sunR * 0.25 + i * band * 2.1;
    ctx.fillRect(sunX - sunR, by, sunR * 2, band);
  }

  const ground = ctx.createLinearGradient(x, y + h * 0.7, x, y + h);
  ground.addColorStop(0, 'rgba(20, 6, 18, 0)');
  ground.addColorStop(1, 'rgba(20, 6, 18, 0.82)');
  ctx.fillStyle = ground;
  ctx.fillRect(x, y + h * 0.6, w, h * 0.4);
  ctx.restore();
}

function drawPhoto(ctx, img, x, y, w, h, targetW, targetH, seed, grade) {
  const size = imageSize(img);
  if (!size || w <= 0 || h <= 0) {
    drawPlaceholder(ctx, x, y, w, h, seed, grade);
    return;
  }

  let crop = null;
  try {
    crop = faceAwareCrop(img, targetW, targetH);
  } catch (error) {
    crop = null;
  }
  if (!crop || !(crop.sw > 0) || !(crop.sh > 0)) {
    crop = fallbackCrop(size, Math.max(1, targetW), Math.max(1, targetH));
  }

  const scale = Math.max(w / crop.sw, h / crop.sh);
  const dw = crop.sw * scale;
  const dh = crop.sh * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;

  try {
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, dx, dy, dw, dh);
  } catch (error) {
    drawPlaceholder(ctx, x, y, w, h, seed, grade);
  }
}

function layoutCaption(ctx, text, maxWidth, baseSize, minSize) {
  setFont(ctx, '900', baseSize);
  setSpacing(ctx, baseSize * 0.02);

  let size = baseSize;
  while (size > minSize && textWidth(ctx, text) > maxWidth) {
    size = Math.max(minSize, size * 0.95);
    setFont(ctx, '900', size);
    setSpacing(ctx, size * 0.02);
  }
  if (textWidth(ctx, text) <= maxWidth) {
    return { lines: [text], size };
  }

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return { lines: [text], size };
  }

  let best = null;
  const twoLineBase = Math.max(minSize * 0.9, baseSize * 0.58);
  for (let split = 1; split < words.length; split += 1) {
    const first = words.slice(0, split).join(' ');
    const second = words.slice(split).join(' ');
    let candidateSize = twoLineBase;
    setFont(ctx, '900', candidateSize);
    setSpacing(ctx, candidateSize * 0.02);
    let widest = Math.max(textWidth(ctx, first), textWidth(ctx, second));
    while (candidateSize > minSize * 0.75 && widest > maxWidth) {
      candidateSize *= 0.94;
      setFont(ctx, '900', candidateSize);
      setSpacing(ctx, candidateSize * 0.02);
      widest = Math.max(textWidth(ctx, first), textWidth(ctx, second));
    }
    if (!best || widest < best.width) {
      best = { lines: [first, second], size: candidateSize, width: widest };
    }
  }

  return best ? { lines: best.lines, size: best.size } : { lines: [text], size };
}

function drawTags(ctx, grade, hero, s) {
  let font = hero.w * 0.019;
  const spacing = Math.max(1, font * 0.08);
  const padX = font * 1.05;
  const pillGap = font * 0.62;

  const measureAll = () => {
    setFont(ctx, '800', font);
    setSpacing(ctx, spacing);
    const widths = TAGS.map((tag) => textWidth(ctx, tag) + padX * 2);
    const total = widths.reduce((sum, value) => sum + value, 0) + pillGap * (TAGS.length - 1);
    return { widths, total };
  };

  let { widths, total } = measureAll();
  while (total > hero.w * 0.84 && font > hero.w * 0.012) {
    font *= 0.94;
    ({ widths, total } = measureAll());
  }

  const pillH = font * 2.05;
  const y = hero.y + hero.h - hero.h * 0.055 - pillH;
  let x = hero.x + (hero.w - total) / 2;

  ctx.save();
  setFont(ctx, '800', font);
  setSpacing(ctx, spacing);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < TAGS.length; i += 1) {
    const w = widths[i];
    roundRectPath(ctx, x, y, w, pillH, pillH / 2);
    ctx.fillStyle = 'rgba(20, 9, 18, 0.68)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 245, 232, 0.62)';
    ctx.lineWidth = Math.max(1, s * 1.3);
    ctx.stroke();

    ctx.fillStyle = '#fff4e6';
    ctx.fillText(TAGS[i], x + w / 2, y + pillH / 2 + font * 0.04);
    x += w + pillGap;
  }
  ctx.restore();
}

function drawSeal(ctx, grade, hero, panelBottom, s) {
  const r = clamp(hero.w * 0.082, s * 30, hero.w * 0.13);
  const cx = hero.x + hero.w - r * 0.94;
  const cy = panelBottom - r * 0.9;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = r * 0.45;
  ctx.shadowOffsetY = r * 0.1;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(17, 7, 15, 0.94)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
  ctx.strokeStyle = grade.captionTop[1] || '#ffd27d';
  ctx.lineWidth = Math.max(2, r * 0.055);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.79, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 245, 230, 0.72)';
  ctx.lineWidth = Math.max(1, r * 0.016);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 245, 230, 0.34)';
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * r * 0.87, cy + Math.sin(angle) * r * 0.87, r * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }

  let titleSize = r * 0.29;
  setFont(ctx, '900', titleSize);
  setSpacing(ctx, r * 0.02);
  while (titleSize > r * 0.15 && textWidth(ctx, 'VICE POP') > r * 1.38) {
    titleSize *= 0.94;
    setFont(ctx, '900', titleSize);
    setSpacing(ctx, r * 0.02);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff4de';
  ctx.fillText('VICE POP', cx, cy - r * 0.2);

  ctx.strokeStyle = 'rgba(255, 240, 220, 0.55)';
  ctx.lineWidth = Math.max(1, r * 0.014);
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy + r * 0.05);
  ctx.lineTo(cx - r * 0.13, cy + r * 0.05);
  ctx.moveTo(cx + r * 0.13, cy + r * 0.05);
  ctx.lineTo(cx + r * 0.5, cy + r * 0.05);
  ctx.stroke();
  ctx.fillStyle = grade.captionTop[1] || '#ffd27d';
  diamond(ctx, cx, cy + r * 0.05, r * 0.045);

  setFont(ctx, '700', r * 0.175);
  setSpacing(ctx, r * 0.045);
  ctx.fillStyle = 'rgba(255, 244, 226, 0.9)';
  ctx.fillText('EST. 2026', cx, cy + r * 0.34);
  ctx.restore();
}

export function drawCover(canvas, opts = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') return;

  const options = opts || {};
  const width = Math.max(1, Math.round(num(options.width, 1000)));
  const height = Math.max(1, Math.round(num(options.height, 1500)));
  canvas.width = width;
  canvas.height = height;

  let ctx = null;
  try {
    ctx = canvas.getContext('2d');
  } catch (error) {
    ctx = null;
  }
  if (!ctx) return;

  const s = width / 1000;
  const grade = gradeById(options.grade);
  const layout = layoutByIndex(options.layoutIndex);
  const captionText = String(options.caption == null ? DEFAULT_CAPTION : options.caption).trim().toUpperCase()
    || DEFAULT_CAPTION.toUpperCase();
  const subtitleText = String(options.subtitle == null ? DEFAULT_SUBTITLE : options.subtitle).trim()
    || DEFAULT_SUBTITLE;
  const photo = options.photo || null;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setSpacing(ctx, 0);

  // Poster geometry.
  const pad = width * 0.035;
  const hero = {
    x: pad,
    y: pad,
    w: width - pad * 2,
    h: height * 0.545,
  };
  const archH = clamp(hero.h * num(layout.heroArch, 0.3), hero.h * 0.12, hero.h * 0.6);
  const footerH = height * 0.05;
  const panelTop = hero.y + hero.h + height * 0.022;
  const panelBottom = height - pad - footerH;
  const panelH = Math.max(height * 0.1, panelBottom - panelTop);
  const gap = clamp(num(layout.gap, 16) * s, width * 0.008, width * 0.03);
  const cellW = (hero.w - gap * 2) / 3;
  const cellH = (panelH - gap) / 2;

  // Background: warm dark gradient plus a low-alpha grade wash.
  const bg = ctx.createLinearGradient(0, 0, width * 0.35, height);
  bg.addColorStop(0, '#2b0f20');
  bg.addColorStop(0.5, '#1b0a16');
  bg.addColorStop(1, '#10060d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grade.overlay;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  const aura = ctx.createRadialGradient(
    hero.x + hero.w * 0.5,
    hero.y + hero.h * 0.28,
    0,
    hero.x + hero.w * 0.5,
    hero.y + hero.h * 0.28,
    hero.w * 0.85,
  );
  aura.addColorStop(0, grade.glow);
  aura.addColorStop(0.55, 'rgba(255, 120, 90, 0.08)');
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  // Hero panel: soft shadow, arch clip, photo, grade wash.
  ctx.save();
  archPath(ctx, hero.x, hero.y, hero.w, hero.h, archH);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 34 * s;
  ctx.shadowOffsetY = 12 * s;
  ctx.fillStyle = '#170a13';
  ctx.fill();
  ctx.restore();

  ctx.save();
  archPath(ctx, hero.x, hero.y, hero.w, hero.h, archH);
  ctx.clip();

  drawPhoto(ctx, photo, hero.x, hero.y, hero.w, hero.h, hero.w, hero.h, 1, grade);

  ctx.fillStyle = grade.overlay;
  ctx.fillRect(hero.x, hero.y, hero.w, hero.h);

  const heroGlow = ctx.createRadialGradient(
    hero.x + hero.w * 0.5,
    hero.y + hero.h * 0.16,
    0,
    hero.x + hero.w * 0.5,
    hero.y + hero.h * 0.16,
    hero.w * 0.72,
  );
  heroGlow.addColorStop(0, grade.glow);
  heroGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = heroGlow;
  ctx.fillRect(hero.x, hero.y, hero.w, hero.h);
  ctx.globalAlpha = 1;

  const heroShade = ctx.createLinearGradient(0, hero.y + hero.h * 0.32, 0, hero.y + hero.h);
  heroShade.addColorStop(0, 'rgba(18, 6, 16, 0)');
  heroShade.addColorStop(0.55, 'rgba(18, 6, 16, 0.22)');
  heroShade.addColorStop(1, 'rgba(18, 6, 16, 0.78)');
  ctx.fillStyle = heroShade;
  ctx.fillRect(hero.x, hero.y, hero.w, hero.h);
  ctx.restore();

  ctx.save();
  archPath(ctx, hero.x, hero.y, hero.w, hero.h, archH);
  ctx.strokeStyle = 'rgba(255, 246, 234, 0.3)';
  ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.stroke();
  ctx.restore();

  // Chrome caption.
  const cap = layoutCaption(ctx, captionText, hero.w * 0.88, width * 0.128, width * 0.05);
  const lineH = cap.size * 1.04;
  const blockH = lineH * cap.lines.length;
  const capCenterY = hero.y + hero.h * 0.455;
  const capTop = capCenterY - blockH / 2;

  const chrome = ctx.createLinearGradient(0, capTop, 0, capTop + blockH);
  const topColors = Array.isArray(grade.captionTop) ? grade.captionTop : ['#fff4dc'];
  const bottomColors = Array.isArray(grade.captionBottom) ? grade.captionBottom : ['#7a1b47'];
  const at = (list, index) => list[Math.min(index, list.length - 1)];
  chrome.addColorStop(0, at(topColors, 0));
  chrome.addColorStop(0.22, at(topColors, 1));
  chrome.addColorStop(0.4, at(topColors, 2));
  chrome.addColorStop(0.52, at(bottomColors, 0));
  chrome.addColorStop(0.63, at(bottomColors, 1));
  chrome.addColorStop(0.82, at(bottomColors, 2));
  chrome.addColorStop(1, at(bottomColors, 3));

  ctx.save();
  setFont(ctx, '900', cap.size);
  setSpacing(ctx, cap.size * 0.02);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  for (let i = 0; i < cap.lines.length; i += 1) {
    const lineY = capTop + lineH * (i + 0.5);

    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = grade.glow;
    ctx.lineWidth = Math.max(3, cap.size * 0.13);
    ctx.strokeText(cap.lines[i], hero.x + hero.w / 2, lineY);
    ctx.globalAlpha = 1;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = cap.size * 0.14;
    ctx.shadowOffsetY = cap.size * 0.02;
    ctx.strokeStyle = 'rgba(27, 9, 19, 0.94)';
    ctx.lineWidth = Math.max(2, cap.size * 0.085);
    ctx.strokeText(cap.lines[i], hero.x + hero.w / 2, lineY);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = chrome;
    ctx.fillText(cap.lines[i], hero.x + hero.w / 2, lineY);
  }
  ctx.restore();

  // Subtitle.
  let subSize = width * 0.0255;
  setFont(ctx, '700', subSize);
  setSpacing(ctx, subSize * 0.11);
  while (subSize > width * 0.013 && textWidth(ctx, subtitleText) > hero.w * 0.74) {
    subSize *= 0.94;
    setFont(ctx, '700', subSize);
    setSpacing(ctx, subSize * 0.11);
  }
  const subY = capTop + blockH + hero.h * 0.062;
  ctx.save();
  setFont(ctx, '700', subSize);
  setSpacing(ctx, subSize * 0.11);
  ctx.fillStyle = '#fff7ec';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = subSize * 0.6;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(subtitleText, hero.x + hero.w / 2, subY);
  ctx.restore();

  drawTags(ctx, grade, hero, s);

  // Six small panels.
  const offsets = Array.isArray(layout.offsets) ? layout.offsets : [];
  for (let i = 0; i < 6; i += 1) {
    const row = i < 3 ? 0 : 1;
    const col = i % 3;
    const off = offsets[i] || { dx: 0, dy: 0 };
    const baseX = hero.x + col * (cellW + gap);
    const baseY = panelTop + row * (cellH + gap);
    const cx = baseX + cellW / 2 + num(off.dx, 0) * s * 1.8;
    const cy = baseY + cellH / 2 + num(off.dy, 0) * s * 1.8;
    const angle = degToRad(num(layout.tilt, 0) * TILT_PATTERN[i]);
    const radius = Math.min(cellW, cellH) * 0.035;
    const variant = CROP_VARIANTS[i];

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20 * s;
    ctx.shadowOffsetY = 7 * s;
    roundRectPath(ctx, -cellW / 2, -cellH / 2, cellW, cellH, radius);
    ctx.fillStyle = '#150a12';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.save();
    roundRectPath(ctx, -cellW / 2, -cellH / 2, cellW, cellH, radius);
    ctx.clip();
    drawPhoto(
      ctx,
      photo,
      -cellW / 2,
      -cellH / 2,
      cellW,
      cellH,
      Math.max(1, cellW * variant.ax),
      Math.max(1, cellH * variant.ay),
      i + 3,
      grade,
    );

    ctx.fillStyle = grade.panelTint;
    ctx.fillRect(-cellW / 2, -cellH / 2, cellW, cellH);

    const shade = ctx.createLinearGradient(0, -cellH / 2, 0, cellH / 2);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0.04)');
    shade.addColorStop(0.66, 'rgba(0, 0, 0, 0.08)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.46)');
    ctx.fillStyle = shade;
    ctx.fillRect(-cellW / 2, -cellH / 2, cellW, cellH);
    ctx.restore();

    roundRectPath(ctx, -cellW / 2, -cellH / 2, cellW, cellH, radius);
    ctx.strokeStyle = 'rgba(255, 246, 234, 0.24)';
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.stroke();
    ctx.restore();
  }

  // Footer billing line.
  const footerBaseline = height - pad - footerH * 0.32;
  let footerSize = width * 0.0148;
  setFont(ctx, '700', footerSize);
  setSpacing(ctx, footerSize * 0.24);
  while (footerSize > width * 0.0085 && textWidth(ctx, FOOTER_TEXT) > hero.w * 0.9) {
    footerSize *= 0.94;
    setFont(ctx, '700', footerSize);
    setSpacing(ctx, footerSize * 0.24);
  }
  ctx.save();
  setFont(ctx, '700', footerSize);
  setSpacing(ctx, footerSize * 0.24);
  ctx.fillStyle = 'rgba(255, 241, 226, 0.82)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(FOOTER_TEXT, width / 2, footerBaseline);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 246, 234, 0.12)';
  ctx.lineWidth = Math.max(1, s);
  ctx.beginPath();
  ctx.moveTo(hero.x + hero.w * 0.06, panelBottom + footerH * 0.22);
  ctx.lineTo(hero.x + hero.w * 0.94, panelBottom + footerH * 0.22);
  ctx.stroke();
  ctx.restore();

  drawSeal(ctx, grade, hero, panelBottom, s);
}

export function drawCoverToSize(opts = {}) {
  const options = opts || {};
  const width = Math.max(1, Math.round(num(options.width, 1000)));
  const height = Math.max(1, Math.round(num(options.height, 1500)));

  let canvas = null;
  if (typeof document !== 'undefined' && document && typeof document.createElement === 'function') {
    canvas = document.createElement('canvas');
  } else if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
  }
  if (!canvas) {
    throw new Error('Canvas is not available in this environment.');
  }

  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, { ...options, width, height });
  return canvas;
}
