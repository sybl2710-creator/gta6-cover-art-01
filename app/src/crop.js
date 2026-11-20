const GRID_LONG_SIDE = 56;
const MIN_GRID_SIDE = 6;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function imageSize(img) {
  if (!img) return null;
  const width = img.naturalWidth || img.videoWidth || img.width || 0;
  const height = img.naturalHeight || img.videoHeight || img.height || 0;
  return width > 0 && height > 0 ? { width, height } : null;
}

function targetSize(targetW, targetH) {
  const width = Number(targetW);
  const height = Number(targetH);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function coverSize(imageW, imageH, targetW, targetH) {
  const scale = Math.max(targetW / imageW, targetH / imageH);
  return { sw: targetW / scale, sh: targetH / scale };
}

function wholeImage(size) {
  return { sx: 0, sy: 0, sw: size.width, sh: size.height };
}

function centerTopCrop(imageW, imageH, sw, sh) {
  return {
    sx: clamp((imageW - sw) / 2, 0, Math.max(0, imageW - sw)),
    sy: clamp((imageH - sh) * 0.1, 0, Math.max(0, imageH - sh)),
    sw,
    sh,
  };
}

function createGridCanvas(width, height) {
  let canvas = null;
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    canvas = document.createElement('canvas');
  } else if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
  }
  if (!canvas) return null;
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function readGridPixels(img, gridW, gridH) {
  const canvas = createGridCanvas(gridW, gridH);
  if (!canvas) return null;

  let context = null;
  try {
    context = canvas.getContext('2d', { willReadFrequently: true });
  } catch (error) {
    context = null;
  }
  if (!context) return null;

  try {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.clearRect(0, 0, gridW, gridH);
    context.drawImage(img, 0, 0, gridW, gridH);
    return context.getImageData(0, 0, gridW, gridH);
  } catch (error) {
    return null;
  }
}

function saliencyWindow(img, imageW, imageH, cropW, cropH) {
  const aspect = imageW / imageH;
  let gridW;
  let gridH;
  if (aspect >= 1) {
    gridW = GRID_LONG_SIDE;
    gridH = clamp(Math.round(GRID_LONG_SIDE / aspect), MIN_GRID_SIDE, GRID_LONG_SIDE);
  } else {
    gridH = GRID_LONG_SIDE;
    gridW = clamp(Math.round(GRID_LONG_SIDE * aspect), MIN_GRID_SIDE, GRID_LONG_SIDE);
  }

  const imageData = readGridPixels(img, gridW, gridH);
  if (!imageData) return null;

  const pixels = imageData.data;
  const count = gridW * gridH;
  const luma = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const p = i * 4;
    luma[i] = (pixels[p] * 0.299 + pixels[p + 1] * 0.587 + pixels[p + 2] * 0.114) / 255;
  }

  const saliency = new Float32Array(count);
  for (let y = 0; y < gridH; y += 1) {
    const y0 = Math.max(0, y - 1);
    const y1 = Math.min(gridH - 1, y + 1);
    for (let x = 0; x < gridW; x += 1) {
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(gridW - 1, x + 1);
      const left = luma[y * gridW + x0];
      const right = luma[y * gridW + x1];
      const top = luma[y0 * gridW + x];
      const bottom = luma[y1 * gridW + x];
      const gx = (right - left) / Math.max(1, x1 - x0);
      const gy = (bottom - top) / Math.max(1, y1 - y0);
      const edge = Math.sqrt(gx * gx + gy * gy);

      let low = luma[y * gridW + x];
      let high = low;
      for (let ny = y0; ny <= y1; ny += 1) {
        for (let nx = x0; nx <= x1; nx += 1) {
          const value = luma[ny * gridW + nx];
          if (value < low) low = value;
          if (value > high) high = value;
        }
      }
      const contrast = high - low;

      const xn = gridW > 1 ? x / (gridW - 1) : 0.5;
      const yn = gridH > 1 ? y / (gridH - 1) : 0.5;
      const facePrior = 0.55 + 1.35 * Math.exp(-((yn - 0.30) * (yn - 0.30)) / 0.18);
      const centerPrior = 1 + 0.20 * (1 - Math.abs(xn - 0.5) * 2);
      saliency[y * gridW + x] = (edge + contrast * 0.6) * facePrior * centerPrior;
    }
  }

  const windowW = clamp(Math.round((cropW / imageW) * gridW), 1, gridW);
  const windowH = clamp(Math.round((cropH / imageH) * gridH), 1, gridH);
  const stride = gridW + 1;
  const integral = new Float64Array((gridW + 1) * (gridH + 1));
  for (let y = 0; y < gridH; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < gridW; x += 1) {
      rowSum += saliency[y * gridW + x];
      integral[(y + 1) * stride + (x + 1)] = integral[y * stride + (x + 1)] + rowSum;
    }
  }

  let bestX = 0;
  let bestY = 0;
  let bestScore = -Infinity;
  for (let y = 0; y + windowH <= gridH; y += 1) {
    for (let x = 0; x + windowW <= gridW; x += 1) {
      const right = x + windowW;
      const bottom = y + windowH;
      const sum = integral[bottom * stride + right]
        - integral[y * stride + right]
        - integral[bottom * stride + x]
        + integral[y * stride + x];
      if (sum > bestScore) {
        bestScore = sum;
        bestX = x;
        bestY = y;
      }
    }
  }

  return {
    centerX: ((bestX + windowW / 2) / gridW) * imageW,
    centerY: ((bestY + windowH / 2) / gridH) * imageH,
  };
}

export function centerCrop(img, targetW, targetH) {
  const size = imageSize(img);
  const target = targetSize(targetW, targetH);
  if (!size) return { sx: 0, sy: 0, sw: 0, sh: 0 };
  if (!target) return wholeImage(size);

  const { sw, sh } = coverSize(size.width, size.height, target.width, target.height);
  if (sw >= size.width && sh >= size.height) return wholeImage(size);

  return {
    sx: clamp((size.width - sw) / 2, 0, Math.max(0, size.width - sw)),
    sy: clamp((size.height - sh) / 2, 0, Math.max(0, size.height - sh)),
    sw,
    sh,
  };
}

export function faceAwareCrop(img, targetW, targetH) {
  const size = imageSize(img);
  const target = targetSize(targetW, targetH);
  if (!size) return { sx: 0, sy: 0, sw: 0, sh: 0 };
  if (!target) return wholeImage(size);

  const { sw, sh } = coverSize(size.width, size.height, target.width, target.height);
  if (sw >= size.width && sh >= size.height) return wholeImage(size);

  const window = saliencyWindow(img, size.width, size.height, sw, sh);
  if (!window) return centerTopCrop(size.width, size.height, sw, sh);

  return {
    sx: clamp(window.centerX - sw / 2, 0, Math.max(0, size.width - sw)),
    sy: clamp(window.centerY - sh / 2, 0, Math.max(0, size.height - sh)),
    sw,
    sh,
  };
}
