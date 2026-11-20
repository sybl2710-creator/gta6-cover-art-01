export function focusCrop(imgW, imgH, targetW, targetH, fx = 0.5, fy = 0.35) {
  const targetAspect = targetW / targetH;
  const imageAspect = imgW / imgH;

  let sw = imgW;
  let sh = imgH;

  if (imageAspect > targetAspect) {
    sw = imgH * targetAspect;
  } else {
    sh = imgW / targetAspect;
  }

  const focusX = Math.min(1, Math.max(0, fx)) * imgW;
  const focusY = Math.min(1, Math.max(0, fy)) * imgH;
  const sx = Math.min(Math.max(0, focusX - sw / 2), imgW - sw);
  const sy = Math.min(Math.max(0, focusY - sh / 2), imgH - sh);

  return { sx, sy, sw, sh };
}
