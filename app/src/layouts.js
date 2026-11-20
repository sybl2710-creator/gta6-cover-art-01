export function panelLayout(w, h) {
  const width = Math.max(0, w);
  const height = Math.max(0, h);
  const margin = Math.min(width * 0.02, height * 0.5);
  const gap = Math.min(width * 0.01, height * 0.02);
  const innerWidth = Math.max(0, width - margin * 2);
  const bottomEdge = Math.max(margin, height - margin);
  const heroBottom = Math.min(bottomEdge, Math.max(margin, height * 0.55));

  const hero = {
    x: margin,
    y: margin,
    w: innerWidth,
    h: heroBottom - margin,
  };

  const panelsTop = Math.min(bottomEdge, heroBottom + gap);
  const panelWidth = Math.max(0, (innerWidth - gap * 2) / 3);
  const panelHeight = Math.max(0, (bottomEdge - panelsTop - gap) / 2);
  const panels = [];

  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      panels.push({
        x: margin + col * (panelWidth + gap),
        y: Math.min(
          bottomEdge - panelHeight,
          panelsTop + row * (panelHeight + gap),
        ),
        w: panelWidth,
        h: panelHeight,
      });
    }
  }

  return { hero, panels };
}

export function archPath(ctx, r) {
  const archHeight = r.h * 0.35;
  const centerX = r.x + r.w / 2;
  const springY = r.y + archHeight;

  ctx.beginPath();
  ctx.moveTo(r.x, r.y + r.h);
  ctx.lineTo(r.x, springY);
  ctx.ellipse(centerX, springY, r.w / 2, archHeight, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(r.x + r.w, r.y + r.h);
  ctx.closePath();
}
