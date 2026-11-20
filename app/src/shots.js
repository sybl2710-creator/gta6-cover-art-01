// Screenshot scenes driven by the query string.
//
// ?shot=cover  — the poster alone, filled with sample photos, for the feed shot
// ?shot=editor — the full editor with photos loaded and a caption filled in
// Both accept `caption`, `grade`, `format` and an optional comma-separated
// `photos` list of sample names. window.__shotReady flips once the paint is done.

const SAMPLE_NAMES = ['boulevard', 'pier', 'marina', 'skyline', 'nightclub'];

function loadSample(name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`sample ${name} missing`));
    img.src = `samples/${name}.jpg`;
  });
}

/** Prepares a scene and paints it, returning a promise that settles after paint. */
export async function runShot(shot, query, ui) {
  const names = (query.get('photos') || 'boulevard,pier,marina,skyline,nightclub').split(',');
  const samples = [];
  for (const name of names) {
    try {
      samples.push(await loadSample(name.trim()));
    } catch (err) {
      console.warn(err.message);
    }
  }

  ui.applyFormat(query.get('format') || (shot === 'wide' ? 'wide' : 'square'));
  ui.state.caption = query.get('caption') || 'SUNSET LEDGER';
  ui.state.gradeId = query.get('grade') || 'vice-sunset';

  if (samples.length) {
    ui.photos.length = 0;
    samples.forEach((img) => ui.photos.push(img));
    const grid = ui.state.panels;
    const ids = Object.keys(grid);
    ids.forEach((id, i) => {
      const photoIndex = i % samples.length;
      grid[id] = { crop: { ...grid[id].crop, photoIndex } };
    });
    ui.state.activePhoto = 0;
  }
  if (query.get('hero')) ui.state.heroId = query.get('hero');
  if (query.get('captionY')) ui.state.titleOffsetY = Number(query.get('captionY'));
  if (query.get('captionSize')) ui.state.titleScale = Number(query.get('captionSize'));

  ui.buildPanelPicker();
  ui.buildRoleInputs();
  ui.refreshPanelControls();
  ui.drawThumbs();

  // Two frames after the font promise resolves: a reliable "painted" point.
  await (document.fonts?.ready ?? Promise.resolve());
  ui.render();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
