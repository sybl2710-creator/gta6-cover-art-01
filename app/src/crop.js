// Crop maths for one panel.
//
// A panel keeps a focus point (a spot on the photo the person wants to keep,
// like a face), a zoom factor and a fit/fill mode. The focus point is what the
// panel centres on, so moving it pans the photo behind the frame; the default
// sits a little above the middle, where faces usually are.

/** The crop a panel starts with: centred horizontally, upper third vertically. */
export function defaultCrop(photoIndex = 0) {
  return { photoIndex, fx: 0.5, fy: 0.36, zoom: 1, mode: 'fill' };
}

/**
 * Works out where a photo lands inside a panel.
 *
 * Returns the destination rectangle and the source rectangle, both in pixels,
 * so the caller can draw with a single drawImage call. In `fit` mode the whole
 * photo is shown and the leftovers become backdrop; in `fill` mode the photo
 * covers the panel and the focus point pins to the panel's centre.
 */
export function cropRect(crop, image, panel) {
  const iw = image?.naturalWidth || image?.width || 1;
  const ih = image?.naturalHeight || image?.height || 1;
  const zoom = Math.max(1, Math.min(3.2, crop.zoom ?? 1));
  const cover = crop.mode !== 'fit';
  const base = cover ? Math.max(panel.w / iw, panel.h / ih) : Math.min(panel.w / iw, panel.h / ih);
  const scale = base * zoom;

  const dw = iw * scale;
  const dh = ih * scale;

  // Put the focus point at the panel centre, then keep the photo inside the
  // frame so a panel never shows a gap in fill mode.
  const fx = Math.max(0, Math.min(1, crop.fx ?? 0.5));
  const fy = Math.max(0, Math.min(1, crop.fy ?? 0.5));
  let dx = panel.x + panel.w / 2 - fx * dw;
  let dy = panel.y + panel.h / 2 - fy * dh;

  if (cover) {
    if (dw >= panel.w) dx = Math.min(panel.x, Math.max(panel.x + panel.w - dw, dx));
    else dx = panel.x + (panel.w - dw) / 2;
    if (dh >= panel.h) dy = Math.min(panel.y, Math.max(panel.y + panel.h - dh, dy));
    else dy = panel.y + (panel.h - dh) / 2;
  }

  return { dx, dy, dw, dh, iw, ih };
}

/** Converts a drag in canvas pixels into a new focus point. */
export function panFocus(crop, image, panel, deltaX, deltaY) {
  const zoom = Math.max(1, Math.min(3.2, crop.zoom ?? 1));
  const cover = crop.mode !== 'fit';
  const iw = image?.naturalWidth || image?.width || 1;
  const ih = image?.naturalHeight || image?.height || 1;
  const base = cover ? Math.max(panel.w / iw, panel.h / ih) : Math.min(panel.w / iw, panel.h / ih);
  const dw = iw * base * zoom;
  const dh = ih * base * zoom;
  return {
    ...crop,
    fx: Math.max(0, Math.min(1, crop.fx - deltaX / dw)),
    fy: Math.max(0, Math.min(1, crop.fy - deltaY / dh)),
  };
}

/** Turns a canvas click into a focus point for the panel that contains it. */
export function focusFromPoint(panel, x, y) {
  return {
    x: Math.max(0, Math.min(1, (x - panel.x) / panel.w)),
    y: Math.max(0, Math.min(1, (y - panel.y) / panel.h)),
  };
}
