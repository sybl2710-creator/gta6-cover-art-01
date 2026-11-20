import { drawCover, drawCoverToSize } from './render.js';
import { GRADES, DEFAULT_GRADE, gradeById } from './grades.js';
import { layoutByIndex, shuffleLayout } from './layouts.js';
import { applyShot } from './shots.js';

const PREVIEW_WIDTH = 1080;
const PREVIEW_HEIGHT = 1080;
const DEFAULT_PHOTO_SRC = new URL('../samples/boulevard.jpg', import.meta.url).href;

const state = {
  photo: null,
  photoSrc: DEFAULT_PHOTO_SRC,
  caption: 'Boulevard Queen',
  subtitle: 'A story in seven frames',
  grade: DEFAULT_GRADE,
  layoutIndex: 0,
  size: { w: 1080, h: 1080 }
};

const defaultPhoto = new Image();
defaultPhoto.decoding = 'async';
state.photo = defaultPhoto;

const defaultPhotoReady = new Promise((resolve, reject) => {
  defaultPhoto.onload = () => {
    defaultPhoto.onload = null;
    defaultPhoto.onerror = null;
    resolve(defaultPhoto);
  };
  defaultPhoto.onerror = () => {
    defaultPhoto.onload = null;
    defaultPhoto.onerror = null;
    reject(new Error(`Could not load default photo: ${DEFAULT_PHOTO_SRC}`));
  };
  defaultPhoto.src = DEFAULT_PHOTO_SRC;
});

let canvas = null;
let captionInput = null;
let subtitleInput = null;
let photoInput = null;
let shuffleButton = null;
let exportButton = null;
let gradeButtons = [];
let sizeButtons = [];
let photoLoadToken = 0;
let initialized = false;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      image.onload = null;
      image.onerror = null;
      resolve(image);
    };
    image.onerror = () => {
      image.onload = null;
      image.onerror = null;
      reject(new Error(`Could not load photo: ${src}`));
    };
    image.src = src;
  });
}

function waitForFonts() {
  if (!document.fonts) return Promise.resolve();

  const loads = [];
  if (typeof document.fonts.load === 'function') {
    loads.push(document.fonts.load('700 100px "Liberation Sans"'));
    loads.push(document.fonts.load('400 40px "Liberation Sans"'));
  }

  return Promise.allSettled(loads)
    .then(() => document.fonts.ready)
    .catch(() => undefined);
}

function render() {
  if (!canvas || !state.photo) return;

  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;
  drawCover(canvas, {
    photo: state.photo,
    caption: state.caption,
    subtitle: state.subtitle,
    grade: state.grade,
    layoutIndex: state.layoutIndex,
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT
  });
}

function normalizeGrade(value) {
  if (Object.prototype.hasOwnProperty.call(GRADES, value)) return value;

  const fallback = gradeById(value);
  return Object.keys(GRADES).find((id) => GRADES[id] === fallback) || DEFAULT_GRADE;
}

function parseSize(value) {
  const match = /^(\d+)x(\d+)$/i.exec(value || '');
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return { w: width, h: height };
}

function setActive(buttons, isActive) {
  buttons.forEach((button, index) => {
    const active = isActive(button, index);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function syncControls() {
  if (captionInput) captionInput.value = state.caption;
  if (subtitleInput) subtitleInput.value = state.subtitle;

  const activeGrade = normalizeGrade(state.grade);
  setActive(gradeButtons, (button) => button.dataset.grade === activeGrade);
  setActive(sizeButtons, (button) => {
    const size = parseSize(button.dataset.size);
    return Boolean(size && size.w === state.size.w && size.h === state.size.h);
  });
}

function applyGrade(button) {
  state.grade = normalizeGrade(button.dataset.grade);
  setActive(gradeButtons, (candidate) => candidate.dataset.grade === state.grade);
  render();
}

function applySize(button) {
  const size = parseSize(button.dataset.size);
  if (!size) return;

  state.size = size;
  setActive(sizeButtons, (candidate) => candidate === button);
}

function loadPhotoFile(file) {
  if (!file) return;

  const request = ++photoLoadToken;
  const objectUrl = URL.createObjectURL(file);

  loadImage(objectUrl)
    .then((image) => {
      if (request !== photoLoadToken) return;
      state.photo = image;
      state.photoSrc = null;
      render();
    })
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      URL.revokeObjectURL(objectUrl);
    });
}

async function exportPng() {
  if (!state.photo) return;

  const exportCanvas = drawCoverToSize({
    photo: state.photo,
    caption: state.caption,
    subtitle: state.subtitle,
    grade: state.grade,
    layoutIndex: state.layoutIndex,
    width: state.size.w,
    height: state.size.h
  });

  const blob = await new Promise((resolve) => {
    exportCanvas.toBlob(resolve, 'image/png');
  });

  if (!blob) throw new Error('Could not encode the poster as PNG.');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vice-pop-${state.size.w}x${state.size.h}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindControls() {
  canvas = document.getElementById('poster');
  captionInput = document.getElementById('captionInput');
  subtitleInput = document.getElementById('subtitleInput');
  photoInput = document.getElementById('photoInput');
  shuffleButton = document.getElementById('shuffleBtn');
  exportButton = document.getElementById('exportBtn');
  gradeButtons = Array.from(document.querySelectorAll('[data-grade]'));
  sizeButtons = Array.from(document.querySelectorAll('[data-size]'));

  if (photoInput) {
    photoInput.accept = 'image/*';
    photoInput.addEventListener('change', () => {
      const file = photoInput.files && photoInput.files[0];
      loadPhotoFile(file);
    });
  }

  if (captionInput) {
    captionInput.addEventListener('input', () => {
      state.caption = captionInput.value;
      render();
    });
  }

  if (subtitleInput) {
    subtitleInput.addEventListener('input', () => {
      state.subtitle = subtitleInput.value;
      render();
    });
  }

  gradeButtons.forEach((button) => {
    button.addEventListener('click', () => applyGrade(button));
  });

  sizeButtons.forEach((button) => {
    button.addEventListener('click', () => applySize(button));
  });

  if (shuffleButton) {
    shuffleButton.addEventListener('click', () => {
      state.layoutIndex = shuffleLayout();
      render();
    });
  }

  if (exportButton) {
    exportButton.addEventListener('click', () => {
      exportPng().catch((error) => {
        console.error(error);
      });
    });
  }
}

async function init() {
  if (initialized) return;
  initialized = true;

  bindControls();
  if (!canvas) throw new Error('Missing #poster canvas.');

  await Promise.allSettled([waitForFonts(), defaultPhotoReady]);

  try {
    await applyShot(state);
  } catch (error) {
    console.error(error);
  }

  syncControls();
  render();
  document.body.dataset.ready = 'true';
}

export function getState() {
  return state;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init().catch((error) => console.error(error));
  }, { once: true });
} else {
  init().catch((error) => console.error(error));
}
