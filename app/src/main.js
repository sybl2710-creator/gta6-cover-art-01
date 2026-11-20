// Vice Pop Studio — the editor.
//
// One state object drives everything: photos, per-panel crops, caption, grade.
// Any change calls render(), which repaints the canvas; the export buttons draw
// the same poster into an offscreen canvas at full size and save it as a PNG.

import { drawPoster, BILLING_LINES } from './render.js';
import { FORMATS, gridFor, boxToPixels } from './layouts.js';
import { GRADES, gradeFor } from './grades.js';
import { defaultCrop, panFocus, focusFromPoint } from './crop.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('poster');
const $ = (id) => document.getElementById(id);
const statusEl = $('status');

/** The whole poster, in one place. Panels are keyed by their grid id. */
const state = {
  formatId: 'square',
  caption: 'SUNSET LEDGER',
  titleScale: 1,
  titleOffsetY: 0,
  gradeId: 'vice-sunset',
  heroId: 'p1',
  sealOn: true,
  billing: BILLING_LINES,
  activePanel: 'p1',
  activePhoto: 0,
  panels: {},
  roles: {},
};

/** Loaded HTMLImageElements, in the order the person added them. */
const photos = [];

function syncPanelDefaults() {
  const grid = gridFor(state.formatId);
  for (const spec of grid.panels) {
    if (!state.panels[spec.id]) {
      state.panels[spec.id] = { crop: defaultCrop(0) };
    }
    if (state.roles[spec.id] === undefined) state.roles[spec.id] = spec.role;
  }
  if (!grid.panels.some((p) => p.id === state.heroId)) state.heroId = grid.panels[0].id;
}

function render() {
  if (document.fonts?.status !== 'loaded') {
    // Redraw once the OFL face is in, so the caption is measured correctly.
    document.fonts.ready.then(() => drawPoster(canvas, state, photos));
  }
  drawPoster(canvas, state, photos);
  $('status').textContent = statusLine();
}

function statusLine() {
  const f = FORMATS.find((x) => x.id === state.formatId);
  const grid = gridFor(state.formatId);
  return `${f.width} × ${f.height} · ${grid.panels.length} panels · ${photos.length} photo${photos.length === 1 ? '' : 's'}`;
}

// ---------------------------------------------------------------- photos

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not read ${url}`));
    img.src = url;
  });
}

async function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  for (const file of files) {
    const url = URL.createObjectURL(file);
    try {
      photos.push(await loadImage(url));
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  // A new photo fills every panel that still shows the old last photo.
  if (photos.length === 1) assignAll(0);
  drawThumbs();
  refreshPhotoSelect();
  render();
  $('status').textContent = `Added ${files.length} photo${files.length === 1 ? '' : 's'} — now in ${state.activePanel.toUpperCase()}`;
}

function drawThumbs() {
  const wrap = $('thumbs');
  wrap.innerHTML = '';
  photos.forEach((img, i) => {
    const t = document.createElement('img');
    t.className = `thumb${i === state.activePhoto ? ' is-on' : ''}`;
    t.src = img.currentSrc || img.src;
    t.alt = `Photo ${i + 1}`;
    t.title = `Photo ${i + 1} — click to put it in ${state.activePanel.toUpperCase()}`;
    t.addEventListener('click', () => assignPhoto(state.activePanel, i));
    wrap.appendChild(t);
  });
  $('photo-hint').textContent = photos.length
    ? `${photos.length} photo${photos.length === 1 ? '' : 's'} loaded. Click a thumbnail to drop it into the selected panel.`
    : 'No photos yet — the poster shows placeholder art.';
}

/** Assigns a photo to one panel, keeping its existing focus and zoom. */
function assignPhoto(panelId, photoIndex) {
  const slot = state.panels[panelId];
  state.panels[panelId] = {
    crop: { ...(slot?.crop ?? defaultCrop(0)), photoIndex },
  };
  state.activePhoto = photoIndex;
  drawThumbs();
  refreshPanelControls();
  render();
}

/** Puts one photo in every panel of the current layout. */
function assignAll(photoIndex) {
  const grid = gridFor(state.formatId);
  for (const spec of grid.panels) {
    state.panels[spec.id] = { crop: { ...(state.panels[spec.id]?.crop ?? defaultCrop(0)), photoIndex } };
  }
  state.activePhoto = photoIndex;
  refreshPanelControls();
  render();
}

/** Deals the loaded photos out round-robin, one per panel. */
function spreadPhotos() {
  if (!photos.length) return;
  const grid = gridFor(state.formatId);
  grid.panels.forEach((spec, i) => {
    state.panels[spec.id] = {
      crop: { ...(state.panels[spec.id]?.crop ?? defaultCrop(0)), photoIndex: i % photos.length },
    };
  });
  refreshPanelControls();
  render();
  $('status').textContent = `Spread ${photos.length} photo${photos.length === 1 ? '' : 's'} across ${grid.panels.length} panels`;
}

// ---------------------------------------------------------------- controls

function refreshPhotoSelect() {
  const sel = $('panel-photo');
  sel.innerHTML = '';
  if (!photos.length) {
    sel.appendChild(new Option('No photos loaded', ''));
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  photos.forEach((_, i) => sel.appendChild(new Option(`Photo ${i + 1}`, String(i))));
  sel.value = String(state.panels[state.activePanel]?.crop.photoIndex ?? 0);
}

function refreshPanelControls() {
  const slot = state.panels[state.activePanel];
  const crop = slot?.crop ?? defaultCrop(0);
  $('zoom').value = String(crop.zoom ?? 1);
  $('zoom-out').textContent = `${(crop.zoom ?? 1).toFixed(2)}×`;
  document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('is-on', b.dataset.mode === crop.mode));
  $('panel-pick').value = state.activePanel;
  $('hero-pick').value = state.heroId;
  refreshPhotoSelect();
}

function buildPanelPicker() {
  const grid = gridFor(state.formatId);
  const sel = $('panel-pick');
  sel.innerHTML = '';
  for (const spec of grid.panels) {
    const tag = state.roles[spec.id] ?? spec.role;
    sel.appendChild(new Option(`${spec.id.toUpperCase()} — ${tag}`, spec.id));
  }
  sel.value = state.heroId === state.activePanel ? state.activePanel : (state.panels[state.activePanel] ? state.activePanel : grid.panels[0].id);
  if (!grid.panels.some((p) => p.id === state.activePanel)) state.activePanel = grid.panels[0].id;
  sel.value = state.activePanel;

  const hero = $('hero-pick');
  hero.innerHTML = '';
  for (const spec of grid.panels) hero.appendChild(new Option(`${spec.id.toUpperCase()} — ${state.roles[spec.id] ?? spec.role}`, spec.id));
  hero.value = state.heroId;
}

function buildRoleInputs() {
  const grid = gridFor(state.formatId);
  const wrap = $('roles');
  wrap.innerHTML = '';
  for (const spec of grid.panels) {
    const row = document.createElement('label');
    row.className = 'role-row';
    const tag = document.createElement('b');
    tag.textContent = spec.id.toUpperCase();
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 22;
    input.value = state.roles[spec.id] ?? spec.role;
    input.addEventListener('input', () => {
      state.roles[spec.id] = input.value.toUpperCase();
      const opt = $('panel-pick').querySelector(`option[value="${spec.id}"]`);
      if (opt) opt.textContent = `${spec.id.toUpperCase()} — ${input.value.toUpperCase()}`;
      render();
    });
    row.append(tag, input);
    wrap.appendChild(row);
  }
}

function buildGrades() {
  const wrap = $('grades');
  wrap.innerHTML = '';
  for (const grade of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `grade${grade.id === state.gradeId ? ' is-on' : ''}`;
    b.dataset.grade = grade.id;
    const dot = document.createElement('i');
    dot.style.background = `linear-gradient(150deg, ${grade.swatch[0]}, ${grade.swatch[1]})`;
    const label = document.createElement('span');
    label.textContent = grade.name;
    b.append(dot, label);
    b.addEventListener('click', () => {
      state.gradeId = grade.id;
      wrap.querySelectorAll('.grade').forEach((el) => el.classList.toggle('is-on', el.dataset.grade === grade.id));
      render();
    });
    wrap.appendChild(b);
  }
}

function applyFormat(formatId) {
  state.formatId = formatId;
  const format = FORMATS.find((f) => f.id === formatId) ?? FORMATS[0];
  document.documentElement.style.setProperty('--ratio-w', String(format.width));
  document.documentElement.style.setProperty('--ratio-h', String(format.height));
  document.querySelectorAll('.size').forEach((b) => b.classList.toggle('is-on', b.dataset.format === formatId));
  $('format-label').textContent = `${format.width} × ${format.height} · ${gridFor(formatId).panels.length} panels`;
  syncPanelDefaults();
  buildPanelPicker();
  buildRoleInputs();
  refreshPanelControls();
  render();
}

// ---------------------------------------------------------------- pointer crop

let drag = null;

function panelAt(x, y) {
  const grid = gridFor(state.formatId);
  const W = canvas.width;
  const H = canvas.height;
  for (const spec of grid.panels) {
    const box = boxToPixels(spec.box, W, H);
    if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) return { spec, box };
  }
  return null;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function beginPointer(event) {
  const p = canvasPoint(event);
  const hit = panelAt(p.x, p.y);
  if (!hit) return;
  const slot = state.panels[hit.spec.id] ?? { crop: defaultCrop(0) };
  state.panels[hit.spec.id] = slot;
  state.activePanel = hit.spec.id;
  state.activePhoto = slot.crop.photoIndex ?? 0;
  refreshPanelControls();
  buildPanelPicker();

  if (event.shiftKey) {
    // Shift-click drops the focus point exactly where the person pressed.
    const f = focusFromPoint(hit.box, p.x, p.y);
    slot.crop = { ...slot.crop, fx: f.x, fy: f.y };
    render();
    return;
  }
  drag = { panelId: hit.spec.id, box: hit.box, last: p };
  canvas.setPointerCapture?.(event.pointerId);
}

function movePointer(event) {
  if (!drag) return;
  const p = canvasPoint(event);
  const dx = p.x - drag.last.x;
  const dy = p.y - drag.last.y;
  drag.last = p;
  const slot = state.panels[drag.panelId];
  const image = photos[slot.crop.photoIndex ?? 0] ?? null;
  slot.crop = panFocus(slot.crop, image, drag.box, dx, dy);
  render();
}

function endPointer(event) {
  if (!drag) return;
  canvas.releasePointerCapture?.(event.pointerId);
  drag = null;
}

// ---------------------------------------------------------------- export

function makePosterCanvas(format) {
  const target = document.createElement('canvas');
  target.width = format.width;
  target.height = format.height;
  const snapshot = { ...state, formatId: format.id, canvasH: format.height, canvasW: format.width };
  drawPoster(target, snapshot, photos);
  return target;
}

function downloadCanvas(target, name) {
  return new Promise((resolve) => {
    target.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      resolve(true);
    }, 'image/png');
  });
}

async function exportOne(format) {
  const target = makePosterCanvas(format);
  const ok = await downloadCanvas(target, `vice-pop-${format.width}x${format.height}.png`);
  $('status').textContent = ok
    ? `Saved vice-pop-${format.width}x${format.height}.png`
    : 'Export failed — the canvas was empty';
}

// ---------------------------------------------------------------- wiring

$('photos').addEventListener('change', (e) => addFiles(e.target.files));
$('caption').addEventListener('input', (e) => {
  state.caption = e.target.value;
  render();
});
$('title-size').addEventListener('input', (e) => {
  state.titleScale = Number(e.target.value);
  $('title-out').textContent = `${Math.round(state.titleScale * 100)}%`;
  render();
});
$('title-y').addEventListener('input', (e) => {
  state.titleOffsetY = Number(e.target.value);
  $('title-y-out').textContent = (state.titleOffsetY * 100).toFixed(1);
  render();
});
$('zoom').addEventListener('input', (e) => {
  const slot = state.panels[state.activePanel];
  if (!slot) return;
  slot.crop = { ...slot.crop, zoom: Number(e.target.value) };
  $('zoom-out').textContent = `${Number(e.target.value).toFixed(2)}×`;
  render();
});
document.querySelectorAll('.seg button').forEach((b) => {
  b.addEventListener('click', () => {
    const slot = state.panels[state.activePanel];
    if (!slot) return;
    slot.crop = { ...slot.crop, mode: b.dataset.mode };
    document.querySelectorAll('.seg button').forEach((el) => el.classList.toggle('is-on', el === b));
    render();
  });
});
$('panel-pick').addEventListener('change', (e) => {
  state.activePanel = e.target.value;
  state.activePhoto = state.panels[state.activePanel]?.crop.photoIndex ?? 0;
  refreshPanelControls();
  drawThumbs();
  buildPanelPicker();
});
$('panel-photo').addEventListener('change', (e) => assignPhoto(state.activePanel, Number(e.target.value)));
$('hero-pick').addEventListener('change', (e) => {
  state.heroId = e.target.value;
  render();
});
$('fill-all').addEventListener('click', () => assignAll(state.panels[state.activePanel]?.crop.photoIndex ?? 0));
$('spread-all').addEventListener('click', spreadPhotos);
$('reset-crop').addEventListener('click', () => {
  const slot = state.panels[state.activePanel];
  if (!slot) return;
  slot.crop = defaultCrop(slot.crop.photoIndex ?? 0);
  refreshPanelControls();
  render();
  $('status').textContent = `Reset the crop on ${state.activePanel.toUpperCase()}`;
});
$('seal-toggle').addEventListener('change', (e) => {
  state.sealOn = e.target.checked;
  render();
});
document.querySelectorAll('.size').forEach((b) => {
  b.addEventListener('click', () => applyFormat(b.dataset.format));
});
$('export').addEventListener('click', () => {
  const format = FORMATS.find((f) => f.id === state.formatId) ?? FORMATS[0];
  exportOne(format);
});
$('export-all').addEventListener('click', async () => {
  for (const format of FORMATS) {
    await exportOne(format);
    await new Promise((r) => setTimeout(r, 220));
  }
  $('status').textContent = 'Saved all three sizes: 1080×1080, 1080×1350, 1920×1080';
});

canvas.addEventListener('pointerdown', beginPointer);
canvas.addEventListener('pointermove', movePointer);
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

// ---------------------------------------------------------------- boot

applyFormat('square');
drawThumbs();

window.__verifyExport = () => FORMATS.map(f => {
  const c = makePosterCanvas(f);
  return { id: f.id, width: c.width, height: c.height };
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), { state, photos, render, applyFormat, assignPhoto, syncPanelDefaults, buildPanelPicker, buildRoleInputs, refreshPanelControls, drawThumbs }).catch((err) => {
    console.error('Shot setup failed', err);
    window.__shotReady = true;
  });
} else {
  render();
}
window.addEventListener('resize', () => render());
