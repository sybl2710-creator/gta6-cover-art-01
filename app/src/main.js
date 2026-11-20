import { drawCover } from './render.js';
import { GRADES, gradeById } from './grades.js';
import { LAYOUTS, layoutById } from './layouts.js';
import { coverRect, defaultFocus } from './crop.js';
import { applyShot } from './shots.js';

const SEAL_TEXT = 'VICE POP - EST. 2026';
const SAMPLE_PHOTOS = ['samples/pier.jpg', 'samples/boulevard.jpg'];
const TAG_COUNT = 3;

// Everything the editor needs in order to paint a poster lives here.
const state = {
  photos: {},
  caption: 'VICE POP',
  subtitle: 'A story in seven frames',
  tags: ['HERO', 'ICON', '2026'],
  billing: 'A VICE POP PRODUCTION - STARRING YOU - MUSIC BY THE SUNSET - (C) 2026 VICE POP',
  gradeId: 'vice-sunset',
  layoutId: LAYOUTS[0].id,
  focus: {},
  size: '1080x1080',
};

let canvas = null;
let ctx = null;
let dragging = null;
let frameQueued = false;

/* ------------------------------------------------------------------ */
/* Tiny DOM helpers                                                    */
/* ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function setActive(buttons, chosen) {
  buttons.forEach((btn) => btn.classList.toggle('is-active', btn === chosen));
}

function clamp01(value) {
  if (Number.isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

/* ------------------------------------------------------------------ */
/* Layout and focus bookkeeping                                        */
/* ------------------------------------------------------------------ */

function currentLayout() {
  return layoutById(state.layoutId) || LAYOUTS[0];
}

function panelIds() {
  return currentLayout().panels.map((panel) => panel.id);
}

function ensureTags() {
  for (let i = 0; i < TAG_COUNT; i += 1) {
    if (typeof state.tags[i] !== 'string') state.tags[i] = '';
  }
  state.tags.length = TAG_COUNT;
}

// Keep photo/focus slots in step with whatever layout is active.
function syncPanels() {
  const ids = panelIds();
  const known = new Set(ids);

  ids.forEach((id) => {
    if (!(id in state.photos)) state.photos[id] = null;
    if (!state.focus[id]) state.focus[id] = defaultFocus(id);
  });

  Object.keys(state.photos).forEach((id) => {
    if (!known.has(id)) delete state.photos[id];
  });
  Object.keys(state.focus).forEach((id) => {
    if (!known.has(id)) delete state.focus[id];
  });

  ensureTags();
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function paint(targetCanvas) {
  syncPanels();
  drawCover(targetCanvas, {
    ...state,
    layout: currentLayout(),
    grade: gradeById(state.gradeId) || GRADES[0],
    seal: SEAL_TEXT,
  });
}

function redraw() {
  if (!canvas) return;
  paint(canvas);
}

// Typing and dragging fire fast; collapse bursts into one paint per frame.
function requestRedraw() {
  if (frameQueued) return;
  frameQueued = true;
  requestAnimationFrame(() => {
    frameQueued = false;
    redraw();
  });
}

function renderOffscreen(width, height, done) {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  paint(offscreen);
  done(offscreen);
}

/* ------------------------------------------------------------------ */
/* Image loading                                                       */
/* ------------------------------------------------------------------ */

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function loadFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = String(reader.result);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Hero gets the first photo, remaining panels take the next ones in order,
// and any leftovers repeat the final image so no panel is ever empty.
function assignPhotos(images) {
  const usable = images.filter(Boolean);
  if (!usable.length) return;

  panelIds().forEach((id, index) => {
    state.photos[id] = usable[Math.min(index, usable.length - 1)];
    state.focus[id] = defaultFocus(id);
  });
}

async function loadSamples() {
  const [pier, boulevard] = await Promise.all(SAMPLE_PHOTOS.map(loadImage));
  const fallback = pier || boulevard;
  const hero = panelIds()[0];

  panelIds().forEach((id) => {
    const source = id === hero ? (pier || fallback) : (boulevard || fallback);
    state.photos[id] = source || null;
    state.focus[id] = defaultFocus(id);
  });
}

/* ------------------------------------------------------------------ */
/* Pointer dragging: nudge the crop inside one panel                   */
/* ------------------------------------------------------------------ */

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width ? canvas.width / rect.width : 1;
  const scaleY = rect.height ? canvas.height / rect.height : 1;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function panelAt(point) {
  for (const panel of currentLayout().panels) {
    const area = coverRect(panel, canvas.width, canvas.height);
    if (
      point.x >= area.x && point.x <= area.x + area.w &&
      point.y >= area.y && point.y <= area.y + area.h
    ) {
      return { panel, area };
    }
  }
  return null;
}

function applyDragFocus(event) {
  if (!dragging) return;
  const point = canvasPoint(event);
  const { area, panelId } = dragging;
  state.focus[panelId] = {
    x: clamp01((point.x - area.x) / area.w),
    y: clamp01((point.y - area.y) / area.h),
  };
  requestRedraw();
}

function startDrag(event) {
  if (event.button !== 0) return;
  const hit = panelAt(canvasPoint(event));
  if (!hit || !state.photos[hit.panel.id]) return;

  event.preventDefault();
  dragging = { panelId: hit.panel.id, area: hit.area };
  canvas.setPointerCapture?.(event.pointerId);
  canvas.classList.add('is-dragging');
  applyDragFocus(event);
}

function moveDrag(event) {
  if (!dragging) return;
  applyDragFocus(event);
}

function endDrag() {
  if (!dragging) return;
  dragging = null;
  canvas.classList.remove('is-dragging');
  redraw();
}

function resetPanelFocus(event) {
  const hit = panelAt(canvasPoint(event));
  if (!hit) return;
  state.focus[hit.panel.id] = defaultFocus(hit.panel.id);
  redraw();
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function parseSize(value) {
  const [width, height] = String(value).split('x').map(Number);
  const ok = (n) => Number.isFinite(n) && n > 0;
  return {
    width: ok(width) ? width : 1080,
    height: ok(height) ? height : 1080,
  };
}

function download() {
  const { width, height } = parseSize(state.size);
  renderOffscreen(width, height, (offscreen) => {
    offscreen.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vice-pop-${width}x${height}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }, 'image/png');
  });
}

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

function bindText(id, apply) {
  const el = $(id);
  if (!el) return;
  el.addEventListener('input', () => {
    apply(el.value);
    requestRedraw();
  });
}

function bindTextInputs() {
  bindText('caption-input', (value) => { state.caption = value; });
  bindText('subtitle-input', (value) => { state.subtitle = value; });
  bindText('billing-input', (value) => { state.billing = value; });

  for (let i = 0; i < TAG_COUNT; i += 1) {
    bindText(`tag-input-${i + 1}`, (value) => { state.tags[i] = value; });
  }
}

function gradeButtons() {
  return $$('.grade-button').filter((btn) => btn.dataset.grade);
}

function sizeButtons() {
  return $$('.export-button').filter((btn) => btn.dataset.size);
}

function bindGrades() {
  const buttons = gradeButtons();
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.gradeId = btn.dataset.grade;
      setActive(buttons, btn);
      redraw();
    });
  });
}

function bindSizes() {
  const buttons = sizeButtons();
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.size = btn.dataset.size;
      setActive(buttons, btn);
    });
  });

  $('export-button')?.addEventListener('click', download);
}

function bindPhotoInput() {
  const input = $('photo-input');
  if (!input) return;

  input.addEventListener('change', async () => {
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const images = await Promise.all(files.map(loadFile));
    assignPhotos(images);
    redraw();
    input.value = '';
  });
}

function bindCanvas() {
  canvas.addEventListener('pointerdown', startDrag);
  canvas.addEventListener('pointermove', moveDrag);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('lostpointercapture', endDrag);
  canvas.addEventListener('dblclick', resetPanelFocus);
}

// Reflect state back into the controls, e.g. after a screenshot URL
// overrides the grade, size, caption, or tags.
function syncControls() {
  const grades = gradeButtons();
  setActive(grades, grades.find((btn) => btn.dataset.grade === state.gradeId));

  const sizes = sizeButtons();
  setActive(sizes, sizes.find((btn) => btn.dataset.size === state.size));

  const fields = [
    ['caption-input', state.caption],
    ['subtitle-input', state.subtitle],
    ['billing-input', state.billing],
    ['tag-input-1', state.tags[0]],
    ['tag-input-2', state.tags[1]],
    ['tag-input-3', state.tags[2]],
  ];
  fields.forEach(([id, value]) => {
    const el = $(id);
    if (el && typeof value === 'string' && value !== el.value) el.value = value;
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function boot() {
  canvas = $('poster');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  if (!ctx) return;

  syncPanels();
  bindTextInputs();
  bindGrades();
  bindSizes();
  bindPhotoInput();
  bindCanvas();

  await loadSamples();
  redraw();

  applyShot(state, redraw);
  syncControls();
  redraw();
}

boot();
