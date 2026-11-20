// Panel geometry for the seven-panel cover. All numbers are fractions of the
// poster width/height, so the same layout works at any export size.
//
//  +--------------------------------------------------+
//  |                      hero                        |  ~52%
//  +--------------------------------------------------+
//  |    a     |     b     |     c     |
//  |    d     |     e     |     f     |
//  +--------------------------------------------------+

const GAP = 0.018;            // ~1.8% breathing room between panels
const HERO_H = 0.52;          // hero occupies the top 52%
const SIDE = 0.024;           // outer margin
const SMALL = (1 - SIDE * 2 - GAP * 2) / 3;

function smallPanel(id, column, row) {
  return {
    id,
    x: SIDE + column * (SMALL + GAP),
    y: HERO_H + GAP + row * (rowHeight() + GAP),
    w: SMALL,
    h: rowHeight(),
    arch: false,
  };
}

function rowHeight() {
  // Remaining band after hero, gap, and bottom margin, split in two rows.
  return (1 - HERO_H - GAP - GAP - SIDE) / 2;
}

export const LAYOUTS = [
  {
    id: 'seven-panel',
    name: 'Seven Panel',
    panels: [
      { id: 'hero', x: 0, y: 0, w: 1, h: HERO_H, arch: true },
      smallPanel('a', 0, 0),
      smallPanel('b', 1, 0),
      smallPanel('c', 2, 0),
      smallPanel('d', 0, 1),
      smallPanel('e', 1, 1),
      smallPanel('f', 2, 1),
    ],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) || LAYOUTS[0];
}
