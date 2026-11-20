// Panel grids for the three post sizes.
//
// Every coordinate is a fraction of the poster, so one set of numbers draws the
// same design at 540px for the live preview and at 1920px for the export. Each
// panel carries the id the editor uses, its box, a cast label and the default
// photo every panel starts out showing.

/** The poster sizes the studio exports, each with its own comic-book grid. */
export const FORMATS = [
  { id: 'square', label: 'Square', width: 1080, height: 1080, note: '1080 x 1080' },
  { id: 'portrait', label: 'Portrait', width: 1080, height: 1350, note: '1080 x 1350' },
  { id: 'wide', label: 'Story', width: 1920, height: 1080, note: '1920 x 1080' },
];

const SQUARE = {
  panels: [
    { id: 'p1', role: 'THE DRIVER', box: [0.035, 0.045, 0.405, 0.445], hero: true },
    { id: 'p2', role: 'THE FIXER', box: [0.455, 0.045, 0.510, 0.212] },
    { id: 'p3', role: 'THE HEIRESS', box: [0.455, 0.272, 0.245, 0.218] },
    { id: 'p4', role: 'THE MUSCLE', box: [0.715, 0.272, 0.250, 0.218] },
    { id: 'p5', role: 'THE HUSTLER', box: [0.035, 0.505, 0.240, 0.190] },
    { id: 'p6', role: 'THE CONTACT', box: [0.290, 0.505, 0.240, 0.190] },
    { id: 'p7', role: 'THE WILD CARD', box: [0.545, 0.505, 0.420, 0.190] },
  ],
  title: { x: 0.5, y: 0.775, width: 0.94, align: 'center', size: 0.155 },
  seal: { x: 0.878, y: 0.885, r: 0.062 },
  billing: { x: 0.5, y: 0.918, width: 0.9 },
};

const PORTRAIT = {
  panels: [
    { id: 'p1', role: 'THE DRIVER', box: [0.035, 0.035, 0.430, 0.395], hero: true },
    { id: 'p2', role: 'THE FIXER', box: [0.480, 0.035, 0.485, 0.190] },
    { id: 'p3', role: 'THE HEIRESS', box: [0.480, 0.238, 0.485, 0.192] },
    { id: 'p4', role: 'THE MUSCLE', box: [0.035, 0.448, 0.300, 0.285] },
    { id: 'p5', role: 'THE HUSTLER', box: [0.350, 0.448, 0.290, 0.285] },
    { id: 'p6', role: 'THE CONTACT', box: [0.655, 0.448, 0.310, 0.285] },
  ],
  title: { x: 0.5, y: 0.808, width: 0.94, align: 'center', size: 0.148 },
  seal: { x: 0.862, y: 0.902, r: 0.058 },
  billing: { x: 0.5, y: 0.925, width: 0.9 },
};

const WIDE = {
  panels: [
    { id: 'p1', role: 'THE DRIVER', box: [0.030, 0.045, 0.250, 0.530], hero: true },
    { id: 'p2', role: 'THE FIXER', box: [0.295, 0.045, 0.180, 0.245] },
    { id: 'p3', role: 'THE HEIRESS', box: [0.490, 0.045, 0.180, 0.245] },
    { id: 'p4', role: 'THE MUSCLE', box: [0.685, 0.045, 0.285, 0.245] },
    { id: 'p5', role: 'THE HUSTLER', box: [0.295, 0.305, 0.220, 0.270] },
    { id: 'p6', role: 'THE CONTACT', box: [0.530, 0.305, 0.190, 0.270] },
    { id: 'p7', role: 'THE WILD CARD', box: [0.735, 0.305, 0.235, 0.270] },
  ],
  title: { x: 0.5, y: 0.705, width: 0.94, align: 'center', size: 0.170 },
  seal: { x: 0.888, y: 0.845, r: 0.070 },
  billing: { x: 0.5, y: 0.888, width: 0.9 },
};

const GRIDS = { square: SQUARE, portrait: PORTRAIT, wide: WIDE };

/** Returns the grid for a format id, falling back to the square poster. */
export function gridFor(formatId) {
  return GRIDS[formatId] ?? SQUARE;
}

/** Turns a normalised panel box into pixel coordinates on a canvas. */
export function boxToPixels(box, width, height) {
  return {
    x: box[0] * width,
    y: box[1] * height,
    w: box[2] * width,
    h: box[3] * height,
  };
}
