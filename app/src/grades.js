// Color grades for the Vice Pop Studio poster.
// Each grade layers a vertical sky gradient, a flat tint, edge vignetting,
// and film grain so the same photo can read as five very different moods.

export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    skyTop: '#5d1146',
    skyMid: '#ff6f61',
    skyBot: '#ffd08a',
    tint: '#ff9158',
    tintAlpha: 0.2,
    vignette: 0.34,
    grain: 0.12,
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    skyTop: '#0a0026',
    skyMid: '#431a7a',
    skyBot: '#19e6ff',
    tint: '#ff2fd0',
    tintAlpha: 0.22,
    vignette: 0.46,
    grain: 0.16,
  },
  {
    id: 'palm-dusk',
    name: 'Palm Dusk',
    skyTop: '#0f3a42',
    skyMid: '#2c7d76',
    skyBot: '#e6b96a',
    tint: '#52d6c8',
    tintAlpha: 0.13,
    vignette: 0.3,
    grain: 0.11,
  },
  {
    id: 'chrome-heat',
    name: 'Chrome Heat',
    skyTop: '#252a31',
    skyMid: '#a9b4c2',
    skyBot: '#ff8a3d',
    tint: '#d7e2ee',
    tintAlpha: 0.12,
    vignette: 0.34,
    grain: 0.1,
  },
  {
    id: 'mono-noir',
    name: 'Mono Noir',
    skyTop: '#080808',
    skyMid: '#4c4c4c',
    skyBot: '#dcdcdc',
    tint: '#ffffff',
    tintAlpha: 0.04,
    vignette: 0.58,
    grain: 0.24,
  },
];

export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id) || GRADES[0];
}
