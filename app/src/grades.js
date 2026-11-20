export const DEFAULT_GRADE = 'vice-sunset';

export const GRADES = {
  'vice-sunset': {
    label: 'Vice Sunset',
    overlay: 'rgba(255, 106, 64, 0.30)',
    captionTop: ['#fff4dc', '#ffd27d', '#ff9a5c', '#ff645e'],
    captionBottom: ['#7a1b47', '#e8437a', '#ff9a5c', '#fff3da'],
    panelTint: 'rgba(255, 132, 96, 0.10)',
    glow: 'rgba(255, 154, 92, 0.88)',
  },
  'neon-night': {
    label: 'Neon Night',
    overlay: 'rgba(78, 42, 168, 0.34)',
    captionTop: ['#eaf7ff', '#8fd8ff', '#b06bff', '#ff4fd8'],
    captionBottom: ['#170a3a', '#4d23d8', '#b45cff', '#eaf7ff'],
    panelTint: 'rgba(126, 86, 255, 0.12)',
    glow: 'rgba(172, 112, 255, 0.90)',
  },
  'palm-dusk': {
    label: 'Palm Dusk',
    overlay: 'rgba(22, 118, 118, 0.28)',
    captionTop: ['#eafff6', '#9ff0d8', '#4fc7b0', '#ffb27a'],
    captionBottom: ['#063a39', '#0f7f74', '#54c9ad', '#e9fff7'],
    panelTint: 'rgba(70, 190, 170, 0.10)',
    glow: 'rgba(110, 230, 205, 0.82)',
  },
  'chrome-heat': {
    label: 'Chrome Heat',
    overlay: 'rgba(228, 44, 30, 0.32)',
    captionTop: ['#fff0e6', '#ffb08a', '#ff5a3c', '#ffd7a1'],
    captionBottom: ['#450505', '#b3150f', '#ff5a2e', '#ffe3c4'],
    panelTint: 'rgba(255, 84, 52, 0.11)',
    glow: 'rgba(255, 120, 70, 0.92)',
  },
  'mono-noir': {
    label: 'Mono Noir',
    overlay: 'rgba(18, 18, 22, 0.36)',
    captionTop: ['#ffffff', '#d8d8dc', '#9a9aa2', '#f2f2f5'],
    captionBottom: ['#09090b', '#2a2a30', '#6c6c76', '#e6e6ea'],
    panelTint: 'rgba(220, 220, 230, 0.06)',
    glow: 'rgba(235, 235, 245, 0.78)',
  },
};

export function gradeById(id) {
  return Object.prototype.hasOwnProperty.call(GRADES, id) ? GRADES[id] : GRADES[DEFAULT_GRADE];
}
