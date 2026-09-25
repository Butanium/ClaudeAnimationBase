// lib/camera/blot_wipe.js: a paint-blot wipe: splats of wet paint land one after another until they cover the frame,
// the cut hides under them, then the paint runs off down the screen (or soaks away) and uncovers the next shot.
// Use: blotWipe(p, o) after camEnd(), in screen space; p 0 → .5 covers (full cover from p ≈ .44), cut at .5, .5 → 1 clears:
//     end of shot A:   if (lt > dur - D / 2) blotWipe(seg(lt, dur - D / 2, dur + D / 2), o);
//     start of shot B: if (lt < D / 2) blotWipe(.5 + lt / D, o);                     (D ≈ .7–1 s, same o in both)
//   o: x, y (screen point where the first, biggest splat lands, e.g. toScreen() of what threw it; default the centre),
//      cols (paint colours, e.g. [PAL.violet, PAL.indigo, PAL.rose]), clear 'run' (the wet paint slides down the
//      screen, top first, default) | 'soak' (the blots shrink away, nearest the first splat first, so shot B opens from there),
//      drops (satellite droplets, true), seed.
// Expects: nothing beyond core. Screen space (call it outside a camera).
// Source: made for the asset library, 2026-09-25, by painter-camera (Claude).
function blotWipe(p, o = {}) {
  if (p <= 0 || p >= 1) return;
  const cols = o.cols || [PAL.violet, PAL.indigo, PAL.rose], seed = o.seed || 0, run = o.clear !== 'soak';
  const x0 = o.x ?? W / 2, y0 = o.y ?? H / 2, h = i => hash(seed * 13.7 + i);
  // the blots: the first splat at (x0, y0), then a jittered 4 × 3 grid, each big enough to cover its cell even at its
  // narrowest (the lobes dip at most ~11%), landing in order of distance from the first
  const B = [{ x: x0, y: y0, R: 520, t: 0, d: 0 }], cw = W / 4, ch = H / 3;
  for (let j = 0; j < 12; j++) {
    const x = (j % 4 + .5) * cw + (h(j * 3.1) - .5) * cw * .24, y = (Math.floor(j / 4) + .5) * ch + (h(j * 5.3) - .5) * ch * .24;
    B.push({ x, y, R: 430 + 70 * h(j * 7.7), d: Math.hypot(x - x0, y - y0) });
  }
  const dmax = Math.max(...B.slice(1).map(b => b.d));
  B.forEach((b, j) => {   // landings spread over p ≈ 0–.38, so the frame fills steadily and is whole just before the cut
    b.i = j; b.col = cols[Math.floor(h(j * 9.1 + 1) * cols.length) % cols.length];
    if (j) { b.d /= dmax; b.t = .04 + .31 * b.d + .03 * h(j * 2.9); } else b.d = 0;
  });
  boilSeed('blotWipe');
  for (const b of B) {
    const j = b.i, grow = backOut(seg(p, b.t, b.t + .09));
    if (grow <= .01) continue;
    // clearing: 'run' slides each blot down (staggered, top first, so the cover tears as it goes) and stretches it;
    // 'soak' shrinks it, nearest the first splat first
    let fall = 0, shrink = 1;
    if (run) { const st = .5 + .03 * h(j * 4.4) + .12 * b.y / H; fall = seg(p, st, st + .36) ** 1.2; }   // top first, from the cut on
    else shrink = 1 - easeIn(seg(p, .52 + .3 * b.d + .04 * h(j * 4.4), .7 + .28 * b.d));
    if (shrink <= .01) continue;
    // a running blot drops just far enough to leave the frame; it loses its splash fingers and stretches downward
    const r = b.R * grow * shrink, sy = 1 + .4 * fall, cx = b.x, cy = b.y + fall * (H - b.y + b.R * 1.25 + 40);
    boilSeed('blot' + j);
    // one outline: a lumpy disc (lobes dip at most ~11%) with splash fingers that pull in as it runs
    const nf = 5 + Math.floor(4 * h(j * 13)), fingers = [];
    for (let k = 0; k < nf; k++) fingers.push([(k + .6 * h(j * 11 + k)) / nf * TAU, .16 + .42 * h(j * 17 + k) ** 2, .045 + .035 * h(j * 41 + k)]);
    const pts = [];
    for (let k = 0; k < 110; k++) {
      const a = k / 110 * TAU;
      let f = 1 + .055 * Math.sin(2 * a + h(j) * 9) + .035 * Math.sin(3 * a + h(j + 1) * 9) + .02 * Math.sin(7 * a + h(j + 2) * 9);
      for (const [fa, fl, fw] of fingers) { const da = Math.atan2(Math.sin(a - fa), Math.cos(a - fa)); f += fl * Math.exp(-((da / fw) ** 2)) * grow * (1 - fall); }
      pts.push([cx + Math.cos(a) * r * f + jit(1.5), cy + Math.sin(a) * r * f * (a < Math.PI ? sy : 1) + jit(1.5)]);
    }
    const rim = mixCol(b.col, PAL.ink, .3);
    // no curv: a curv shape over ~1500 px tall vanishes (p5.brush 2.2.3); 110 points are smooth enough
    paint(pts, { wash: rim, ink: null });                                                // pooled pigment at the edge
    paint(pts.map(([x, y]) => [lerp(cx, x, .955), lerp(cy, y, .955)]), { wash: b.col, ink: null });
    // wet sheen: a thin crescent inside the upper-left edge
    const a0 = -2.5 + .4 * h(j * 43), cr = [];
    for (let k = 0; k <= 10; k++) { const a = a0 + k / 10 * 1.1; cr.push([cx + Math.cos(a) * r * .8, cy + Math.sin(a) * r * .8]); }
    for (let k = 10; k >= 0; k--) { const a = a0 + k / 10 * 1.1, w = r * .055 * Math.sin(Math.PI * k / 10); cr.push([cx + Math.cos(a) * (r * .8 - w), cy + Math.sin(a) * (r * .8 - w)]); }
    paint(cr, { wash: mixCol(b.col, PAL.cream, .35), ink: null });
    // satellite droplets flung off the finger tips as it lands; they run or soak with their blot
    if (o.drops !== false) fingers.forEach(([fa, fl], k) => {
      const out = seg(p, b.t + .03, b.t + .11); if (out <= 0 || k % 2 || fall > .98) return;
      const d = r * (1 + fl) * lerp(1, 1.15 + .2 * h(j * 29 + k), easeOut(out)), dr = b.R * (.03 + .03 * h(j * 31 + k)) * shrink * backOut(out) * (1 - fall);
      const dx = cx + Math.cos(fa) * d, y1 = b.y + Math.sin(fa) * d, dy = y1 + fall * (H + 60 + 3 * b.R * .06 - y1);
      paint(ellPts(dx, dy, dr, dr * (1 + 1.5 * fall), 12, .5), { wash: rim, ink: null });
    });
  }
}
