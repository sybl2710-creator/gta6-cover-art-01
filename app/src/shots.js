// Deep-link / screenshot support. A shot URL can preload a caption and a sample
// photo, and can collapse the editor down to just the poster canvas:
//
//   index.html?shot=cover&photo=boulevard&caption=WELCOME%20TO%20VICE%20CITY

import { defaultFocus } from './crop.js';

const SAMPLE_NAMES = new Set(['boulevard', 'pier']);
const PANEL_IDS = ['hero', 'a', 'b', 'c', 'd', 'e', 'f'];

export function applyShot(state, redraw) {
  if (!state || typeof window === 'undefined') return;

  let params;
  try {
    params = new URLSearchParams(window.location.search || '');
  } catch (err) {
    return;
  }

  // Batch every change into one repaint so the canvas never draws twice.
  const paint = oncePerFrame(redraw);

  const caption = params.get('caption');
  if (caption !== null) applyCaption(state, caption);

  const photo = normalizePhoto(params.get('photo'));
  if (photo) applyPhoto(state, photo, paint);

  const shot = params.get('shot');
  if (shot !== null) applyShotClass(shot);

  paint();
}

function normalizePhoto(raw) {
  if (raw === null) return null;
  const name = raw.trim().toLowerCase().replace(/\.jpe?g$/, '');
  return SAMPLE_NAMES.has(name) ? name : null;
}

function applyShotClass(shot) {
  const body = document.body;
  if (!body || !body.classList) return;
  if (shot === 'cover') body.classList.add('shot-cover');
  else body.classList.remove('shot-cover');
}

function applyCaption(state, caption) {
  state.caption = caption;

  const input = document.getElementById('caption-input');
  if (!input) return;

  input.value = caption;
  try {
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } catch (err) {
    // Engines without constructable Events still get the updated value.
  }
}

function applyPhoto(state, name, paint) {
  if (typeof Image === 'undefined') return;

  const img = new Image();
  img.decoding = 'async';

  img.onload = () => {
    state.photos = state.photos || {};
    putPhoto(state.photos, 'hero', img);

    // Fill only the slots that are still blank, leaving the user's own
    // photos alone when a shot URL is opened on top of an existing edit.
    for (const id of PANEL_IDS) {
      if (id === 'hero') continue;
      if (isEmptySlot(state.photos, id)) putPhoto(state.photos, id, img);
    }

    // A shot always starts from the standard framing so captures repeat.
    if (typeof defaultFocus === 'function') state.focus = defaultFocus();

    paint();
  };

  img.onerror = () => {
    // A missing sample must never break the editor.
  };

  img.src = `samples/${name}.jpg`;
}

function putPhoto(photos, id, img) {
  if (Array.isArray(photos)) photos[indexOf(id)] = img;
  else photos[id] = img;
}

function isEmptySlot(photos, id) {
  if (Array.isArray(photos)) return !photos[indexOf(id)];
  return !photos[id];
}

function indexOf(id) {
  const i = PANEL_IDS.indexOf(id);
  return i < 0 ? 0 : i;
}

// Collapse back-to-back redraw requests into a single call per animation frame.
function oncePerFrame(redraw) {
  if (typeof redraw !== 'function') return () => {};

  let queued = false;
  const schedule =
    typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (fn) => setTimeout(fn, 16);

  return () => {
    if (queued) return;
    queued = true;
    schedule(() => {
      queued = false;
      try {
        redraw();
      } catch (err) {
        // Keep a bad frame from wedging the queue.
      }
    });
  };
}
