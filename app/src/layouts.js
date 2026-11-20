export const LAYOUTS = [
  {
    name: 'Classic Grid',
    heroArch: 0.30,
    tilt: 1.2,
    gap: 18,
    offsets: [
      { dx: 0, dy: 0 },
      { dx: 2, dy: -1 },
      { dx: -2, dy: 1 },
      { dx: 1, dy: 2 },
      { dx: -1, dy: -2 },
      { dx: 0, dy: 0 },
    ],
  },
  {
    name: 'Hand Placed',
    heroArch: 0.42,
    tilt: 2.6,
    gap: 22,
    offsets: [
      { dx: -4, dy: 3 },
      { dx: 5, dy: -2 },
      { dx: -3, dy: -4 },
      { dx: 4, dy: 4 },
      { dx: -5, dy: 1 },
      { dx: 2, dy: -3 },
    ],
  },
  {
    name: 'Postcard Scatter',
    heroArch: 0.24,
    tilt: 3.4,
    gap: 26,
    offsets: [
      { dx: 6, dy: -3 },
      { dx: -5, dy: 4 },
      { dx: 3, dy: 5 },
      { dx: -6, dy: -2 },
      { dx: 4, dy: -5 },
      { dx: -2, dy: 3 },
    ],
  },
  {
    name: 'Magazine Drift',
    heroArch: 0.50,
    tilt: 1.8,
    gap: 14,
    offsets: [
      { dx: 3, dy: 2 },
      { dx: -2, dy: 3 },
      { dx: 1, dy: -2 },
      { dx: -3, dy: -3 },
      { dx: 2, dy: 1 },
      { dx: 0, dy: 0 },
    ],
  },
  {
    name: 'Neon Bounce',
    heroArch: 0.36,
    tilt: 2.2,
    gap: 20,
    offsets: [
      { dx: -2, dy: -4 },
      { dx: 4, dy: 2 },
      { dx: -3, dy: 3 },
      { dx: 2, dy: -3 },
      { dx: -4, dy: 4 },
      { dx: 3, dy: 1 },
    ],
  },
  {
    name: 'Tight Stack',
    heroArch: 0.18,
    tilt: 0.9,
    gap: 10,
    offsets: [
      { dx: 0, dy: 0 },
      { dx: 1, dy: 1 },
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 0, dy: 0 },
    ],
  },
];

export function layoutByIndex(i) {
  const count = LAYOUTS.length;
  let index = Number(i);
  if (!Number.isFinite(index)) index = 0;
  index = ((Math.trunc(index) % count) + count) % count;
  return LAYOUTS[index];
}

export function shuffleLayout() {
  return Math.floor(Math.random() * LAYOUTS.length);
}
