export const SHOTS = {
  '1-cover': {
    photo: 'pier',
    caption: 'Sunset Heist',
    grade: 'vice-sunset',
    size: [1080, 1080],
  },
  '2-editor': {
    photo: 'boulevard',
    caption: 'Boulevard Queen',
    grade: 'vice-sunset',
    size: [1080, 1080],
  },
  '3-cover': {
    photo: 'pier',
    caption: 'Welcome to Vice',
    grade: 'neon-night',
    size: [1080, 1080],
  },
  '4-cover': {
    photo: 'pier',
    caption: 'Vice Pop',
    grade: 'vice-sunset',
    size: [1024, 1280],
  },
};

export function shotFromQuery() {
  const search = typeof globalThis !== 'undefined' && globalThis.location
    ? globalThis.location.search
    : '';

  let key = null;
  try {
    key = new URLSearchParams(search || '').get('shot');
  } catch (err) {
    return null;
  }

  if (!key) return null;
  return Object.prototype.hasOwnProperty.call(SHOTS, key) ? SHOTS[key] : null;
}
