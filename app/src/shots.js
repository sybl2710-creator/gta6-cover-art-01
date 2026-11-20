const PHOTO_FILES = {
  boulevard: '../samples/boulevard.jpg',
  pier: '../samples/pier.jpg'
};

export const SHOTS = [
  {
    name: '1-cover',
    photo: 'pier',
    caption: 'Sunset Heist',
    subtitle: 'A story in seven frames',
    grade: 'vice-sunset',
    size: { w: 1080, h: 1080 }
  },
  {
    name: '2-editor',
    photo: 'boulevard',
    caption: 'Boulevard Queen',
    subtitle: 'A story in seven frames',
    grade: 'vice-sunset',
    size: { w: 1080, h: 1080 }
  },
  {
    name: '3-cover',
    photo: 'boulevard',
    caption: 'Boulevard Queen',
    subtitle: 'A story in seven frames',
    grade: 'vice-sunset',
    size: { w: 1080, h: 1080 }
  },
  {
    name: '4-cover',
    photo: 'pier',
    caption: 'Vice Pop',
    subtitle: 'A story in seven frames',
    grade: 'vice-sunset',
    size: { w: 1080, h: 1350 }
  }
];

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
      reject(new Error(`Could not load shot photo: ${src}`));
    };
    image.src = src;
  });
}

/*
 * applyShot(state) contract:
 * Reads the ?shot= query parameter. For a matching SHOTS entry it resolves the
 * sample path relative to this module, copies caption, subtitle, grade and size
 * onto state, sets state.photoSrc and document.body.dataset.shot, loads the
 * photo into state.photo, and resolves to true once the image is ready. With
 * no match it leaves state alone and resolves to false. main.js awaits this
 * before its first render.
 */
export async function applyShot(state) {
  if (!state) return false;

  const shotName = new URLSearchParams(window.location.search).get('shot');
  const shot = shotName ? SHOTS.find((item) => item.name === shotName) : null;

  if (!shot) return false;

  const photoPath = PHOTO_FILES[shot.photo];
  if (!photoPath) return false;

  const photoSrc = new URL(photoPath, import.meta.url).href;

  state.photoSrc = photoSrc;
  state.caption = shot.caption;
  state.subtitle = shot.subtitle;
  state.grade = shot.grade;
  state.size = { w: shot.size.w, h: shot.size.h };

  if (document.body) document.body.dataset.shot = shot.name;

  state.photo = await loadImage(photoSrc);
  return true;
}
