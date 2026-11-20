// Object-fit: cover math. Given a source image and a panel size, work out the
// rectangle of the image to draw so the panel is fully covered, then slide that
// rectangle so the chosen focus point sits as near the panel center as allowed.

export function defaultFocus() {
  return { x: 0.5, y: 0.35 };
}

export function coverRect(imgW, imgH, pw, ph, fx, fy) {
  const width = Math.max(1, Number(imgW) || 1);
  const height = Math.max(1, Number(imgH) || 1);
  const panelW = Math.max(1, Number(pw) || 1);
  const panelH = Math.max(1, Number(ph) || 1);

  const focusX = clamp01(fx, 0.5);
  const focusY = clamp01(fy, 0.5);

  // Smallest scale that still fills the panel on both axes.
  const scale = Math.max(panelW / width, panelH / height);

  // Source rectangle size that maps to exactly the panel after scaling.
  const sw = Math.min(width, panelW / scale);
  const sh = Math.min(height, panelH / scale);

  // Place the focus point at the panel center, then clamp into the image.
  const sx = clamp(focusX * width - sw / 2, 0, width - sw);
  const sy = clamp(focusY * height - sh / 2, 0, height - sh);

  return { sx, sy, sw, sh };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}
