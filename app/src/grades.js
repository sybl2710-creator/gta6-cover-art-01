// Colour grades: each one is a canvas filter for the photos plus a painted
// overlay that unifies the whole poster (tint, sunset bloom, vignette).

const hex = (c, a = 1) => {
  const n = parseInt(c.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Vertical wash from one colour to another over the whole frame. */
function wash(ctx, w, h, top, bottom, alpha, blend = 'soft-light') {
  ctx.save();
  ctx.globalCompositeOperation = blend;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, hex(top, alpha));
  g.addColorStop(1, hex(bottom, alpha));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Warm glow low in the frame, where a sunset would sit. */
function bloom(ctx, w, h, color, strength, y = 0.72, r = 0.62) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(w * 0.5, h * y, 0, w * 0.5, h * y, Math.max(w, h) * r);
  g.addColorStop(0, hex(color, strength));
  g.addColorStop(0.55, hex(color, strength * 0.28));
  g.addColorStop(1, hex(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Darkened corners, the way a printed poster falls off. */
function vignette(ctx, w, h, strength) {
  if (strength <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.30, w / 2, h * 0.5, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, `rgba(${Math.round(255 * (1 - strength))},${Math.round(255 * (1 - strength * 0.8))},${Math.round(255 * (1 - strength * 0.6))},1)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    swatch: ['#ff8a3d', '#ff2f7b'],
    filter: 'saturate(1.16) contrast(1.07) brightness(1.03)',
    paint(ctx, w, h) {
      wash(ctx, w, h, '#ff9a3c', '#ff2e83', 0.30, 'soft-light');
      bloom(ctx, w, h, '#ffb15e', 0.34, 0.70, 0.66);
      vignette(ctx, w, h, 0.30);
    },
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    swatch: ['#ff2fb0', '#2ff5ff'],
    filter: 'saturate(1.34) contrast(1.13) brightness(0.96) hue-rotate(-10deg)',
    paint(ctx, w, h) {
      wash(ctx, w, h, '#3a1bff', '#00e5ff', 0.34, 'overlay');
      bloom(ctx, w, h, '#ff3fd0', 0.30, 0.42, 0.58);
      bloom(ctx, w, h, '#39e6ff', 0.22, 0.86, 0.44);
      vignette(ctx, w, h, 0.42);
    },
  },
  {
    id: 'gold-hour',
    name: 'Gold Hour',
    swatch: ['#ffd166', '#c97b2b'],
    filter: 'sepia(0.22) saturate(1.12) contrast(1.05) brightness(1.05)',
    paint(ctx, w, h) {
      wash(ctx, w, h, '#ffdf8a', '#b0642a', 0.30, 'soft-light');
      bloom(ctx, w, h, '#ffe2a8', 0.32, 0.66, 0.7);
      vignette(ctx, w, h, 0.32);
    },
  },
  {
    id: 'teal-vice',
    name: 'Teal Vice',
    swatch: ['#17d6c2', '#ff7043'],
    filter: 'saturate(1.22) contrast(1.12) brightness(0.98)',
    paint(ctx, w, h) {
      wash(ctx, w, h, '#0fd9c4', '#ff6a3d', 0.26, 'soft-light');
      wash(ctx, w, h, '#0b6f74', '#0b3a55', 0.20, 'multiply');
      bloom(ctx, w, h, '#7bffe8', 0.20, 0.35, 0.5);
      vignette(ctx, w, h, 0.34);
    },
  },
  {
    id: 'mono-noir',
    name: 'Mono Noir',
    swatch: ['#f2f2f2', '#3a3a3a'],
    filter: 'grayscale(1) contrast(1.28) brightness(1.02)',
    paint(ctx, w, h) {
      wash(ctx, w, h, '#ffffff', '#000000', 0.22, 'overlay');
      vignette(ctx, w, h, 0.44);
    },
  },
  {
    id: 'bubblegum',
    name: 'Bubblegum',
    swatch: ['#ff9ed6', '#7c5cff'],
    filter: 'saturate(1.28) contrast(1.04) brightness(1.06) hue-rotate(6deg)',
    paint(ctx, w, h) {
      wash(ctx, w, h, '#ffb3e6', '#7a5bff', 0.30, 'soft-light');
      bloom(ctx, w, h, '#ffc2ef', 0.28, 0.58, 0.6);
      vignette(ctx, w, h, 0.26);
    },
  },
];

/** Looks a grade up by id, falling back to Vice Sunset. */
export function gradeFor(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** Resolves the swatch colours for a grade, used by the editor's buttons. */
export function swatchFor(id) {
  return gradeFor(id).swatch;
}
