export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    filter: 'brightness(1.06) contrast(1.12) saturate(1.3)',
    overlayTop: '#ff8a3d',
    overlayBottom: '#ff4894',
    overlayOpacity: 0.38,
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    filter: 'brightness(0.92) contrast(1.28) saturate(1.35)',
    overlayTop: '#5c37ff',
    overlayBottom: '#18b5ff',
    overlayOpacity: 0.4,
  },
  {
    id: 'palm-dusk',
    name: 'Palm Dusk',
    filter: 'brightness(1.04) contrast(0.98) saturate(0.88) sepia(0.12)',
    overlayTop: '#ffc478',
    overlayBottom: '#c47a60',
    overlayOpacity: 0.3,
  },
  {
    id: 'chrome-heat',
    name: 'Chrome Heat',
    filter: 'brightness(1.1) contrast(1.4) saturate(1.45)',
    overlayTop: '#ff52b0',
    overlayBottom: '#ff762a',
    overlayOpacity: 0.36,
  },
  {
    id: 'mono-noir',
    name: 'Mono Noir',
    filter: 'grayscale(1) brightness(1.02) contrast(1.18)',
    overlayTop: '#d2d2d2',
    overlayBottom: '#505050',
    overlayOpacity: 0.14,
  },
];

export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id) || GRADES[0];
}

export function gradeFilter(grade) {
  return grade.filter;
}

export function gradeOverlay(grade) {
  return {
    top: grade.overlayTop,
    bottom: grade.overlayBottom,
    opacity: grade.overlayOpacity,
  };
}
