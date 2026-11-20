import { drawPoster } from './render.js';
import { GRADES, gradeById } from './grades.js';
import { SHOTS, shotFromQuery } from './shots.js';

const PREVIEW_SIZE = { w: 1080, h: 1080 };
const PREVIEW_DISPLAY_WIDTH = '540px';
const DEFAULT_PHOTO = 'samples/pier.jpg';
const EXPORT_NAME = 'vice-pop-cover.png';

const state = {
  photo: null,
  focus: { x: 0.5, y: 0.35 },
  caption: 'Sunset Heist',
  subtitle: 'A story in seven frames',
  grade: 'vice-sunset',
  size: '1080x1080',
  seed: 1,
};

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

function render() {
  const canvas = document.querySelector('#poster');
  if (!canvas) return;

  if (canvas.width !== PREVIEW_SIZE.w || canvas.height !== PREVIEW_SIZE.h) {
    canvas.width = PREVIEW_SIZE.w;
    canvas.height = PREVIEW_SIZE.h;
  }
  canvas.style.width = '100%';
  canvas.style.maxWidth = PREVIEW_DISPLAY_WIDTH;
  canvas.style.height = 'auto';

  drawPoster(canvas, {
    photo: state.photo,
    focus: state.focus,
    caption: state.caption,
    subtitle: state.subtitle,
    grade: state.grade,
    seed: state.seed,
    size: PREVIEW_SIZE,
  });
}

function loadPhoto(src) {
  if (typeof Image !== 'function') {
    render();
    return;
  }

  const image = new Image();
  image.onload = () => {
    state.photo = image;
    render();
  };
  image.onerror = () => {
    render();
  };
  image.src = src;
}

function readPhotoFile(file) {
  if (!file || typeof FileReader !== 'function') return;

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string' && reader.result) {
      loadPhoto(reader.result);
    }
  };
  reader.onerror = () => {
    render();
  };
  reader.readAsDataURL(file);
}

function applyShot(shot) {
  if (!shot || !Object.values(SHOTS).includes(shot)) return;

  if (typeof shot.caption === 'string') state.caption = shot.caption;

  if (shot.grade && GRADES.some((grade) => grade.id === shot.grade)) {
    state.grade = gradeById(shot.grade).id;
  }

  if (Array.isArray(shot.size) && shot.size.length >= 2) {
    const w = Number(shot.size[0]);
    const h = Number(shot.size[1]);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      state.size = `${Math.round(w)}x${Math.round(h)}`;
    }
  }
}

function photoPath(shot) {
  return shot && shot.photo ? `samples/${shot.photo}.jpg` : DEFAULT_PHOTO;
}

function syncGradeButtons() {
  const current = gradeById(state.grade).id;
  document.querySelectorAll('[data-grade]').forEach((button) => {
    const active = button.dataset.grade === current;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function syncSizeButtons() {
  document.querySelectorAll('[data-size]').forEach((button) => {
    const active = button.dataset.size === state.size;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function syncTextInputs() {
  const captionInput =
    document.querySelector('input#caption') || document.querySelector('#caption-input');
  if (captionInput) captionInput.value = state.caption;

  const subtitleInput =
    document.querySelector('input#subtitle') || document.querySelector('#subtitle-input');
  if (subtitleInput) subtitleInput.value = state.subtitle;
}

function parseSize(value) {
  const match = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(String(value || ''));
  if (!match) return { w: 1080, h: 1080 };
  return {
    w: Math.max(1, Number(match[1])),
    h: Math.max(1, Number(match[2])),
  };
}

function nudgeFocus() {
  const angle = (state.seed * 2.399963229728653) % (Math.PI * 2);
  const radius = 0.025 + ((state.seed * 37) % 53) / 1400;
  state.focus = {
    x: clamp(state.focus.x + Math.cos(angle) * radius, 0.08, 0.92),
    y: clamp(state.focus.y + Math.sin(angle) * radius, 0.08, 0.92),
  };
}

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = EXPORT_NAME;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportPng() {
  const { w, h } = parseSize(state.size);
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;

  drawPoster(offscreen, {
    photo: state.photo,
    focus: state.focus,
    caption: state.caption,
    subtitle: state.subtitle,
    grade: state.grade,
    seed: state.seed,
    size: { w, h },
  });

  if (typeof offscreen.toBlob !== 'function') return;
  offscreen.toBlob((blob) => {
    if (blob) downloadBlob(blob);
  }, 'image/png');
}

function findButton(selectors, labels) {
  for (const selector of selectors) {
    const match = document.querySelector(selector);
    if (match) return match;
  }

  const wanted = labels.map((label) => label.toUpperCase());
  return (
    Array.from(document.querySelectorAll('button')).find((button) => {
      const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();
      return wanted.some((label) => text === label || text.includes(label));
    }) || null
  );
}

function wireControls() {
  const photoInput =
    document.querySelector('input[type="file"][accept*="image"]') ||
    document.querySelector('#photo-input') ||
    document.querySelector('input[type="file"]');
  if (photoInput) {
    photoInput.addEventListener('change', () => {
      const file = photoInput.files && photoInput.files[0];
      if (file) readPhotoFile(file);
    });
  }

  const captionInput =
    document.querySelector('input#caption') || document.querySelector('#caption-input');
  if (captionInput) {
    captionInput.addEventListener('input', () => {
      state.caption = captionInput.value;
      render();
    });
  }

  const subtitleInput =
    document.querySelector('input#subtitle') || document.querySelector('#subtitle-input');
  if (subtitleInput) {
    subtitleInput.addEventListener('input', () => {
      state.subtitle = subtitleInput.value;
      render();
    });
  }

  document.querySelectorAll('[data-grade]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const grade = button.dataset.grade;
      if (!grade) return;
      state.grade = grade;
      syncGradeButtons();
      render();
    });
  });

  document.querySelectorAll('[data-size]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const size = button.dataset.size;
      if (!size) return;
      state.size = size;
      syncSizeButtons();
      render();
    });
  });

  const shuffleButton = findButton(
    ['#shuffle-button', '#shuffle', '#shuffle-layout', '[data-action="shuffle"]', '[data-shuffle]'],
    ['SHUFFLE LAYOUT', 'SHUFFLE'],
  );
  if (shuffleButton) {
    shuffleButton.addEventListener('click', (event) => {
      event.preventDefault();
      state.seed += 1;
      nudgeFocus();
      render();
    });
  }

  const exportButton = findButton(
    ['#export-button', '#export-png', '#export', '[data-action="export"]', '[data-export]'],
    ['EXPORT PNG', 'DOWNLOAD PNG'],
  );
  if (exportButton) {
    exportButton.addEventListener('click', (event) => {
      event.preventDefault();
      exportPng();
    });
  }
}

function boot() {
  const shot = shotFromQuery();
  applyShot(shot);
  syncTextInputs();
  syncGradeButtons();
  syncSizeButtons();
  wireControls();
  render();
  loadPhoto(photoPath(shot));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
