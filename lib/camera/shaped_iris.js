// lib/camera/shaped_iris.js: shaped irises: the frame closes down to a heart, a star, a keyhole, Clawd's silhouette (or
// a circle) around a point, holds, and shuts; the next shot opens from the same shape.
// Use: shapedIris(kind, cx, cy, r, o) paints everything OUTSIDE the shape (screen space, after camEnd()). kind:
//     'heart' | 'star' | 'keyhole' | 'clawd' | 'circle', centred on (cx, cy) (the keyhole on its round head);
//     r = the shape's half-width (for 'clawd': half the body's width, the arms stick out past it). o: col (PAL.ink), rim (ink rim weight round the hole, 1.4; 0 = none), rimCol, rot,
//     arms (for 'clawd': arm angle, .35 = a little raised).
//   shapedIris.wipe(p, o): the whole transition, p 0 → 1, fully shut at p = .5 (cut there):
//     end of shot A:   if (lt > dur - D / 2) shapedIris.wipe(seg(lt, dur - D / 2, dur + D / 2), o);
//     start of shot B: if (lt < D / 2) shapedIris.wipe(.5 + lt / D, o);                       (D ≈ 1.2–2 s)
//     Shot A's half: the shape closes in on o.a, overshoots and settles on the held size, holds, widens a hair
//     (anticipation) and snaps shut. Shot B's half: it pops open on o.b and grows until the frame is clear (with
//     o.holdB it holds the small shape first). o: kind, a / b ([x, y] screen points; b defaults to a; use toScreen()),
//     hold (held r, 170), holdB, beat (true: the hold breathes on the beat), plus shapedIris's o.
//   shapedIris.pts(kind, cx, cy, r, o): the shape's outline points (clockwise on screen), to match other marks to it.
// Expects: heartPts from clawd.js. Screen space.
// Source: made for the asset library, 2026-09-25, by painter-camera (Claude).
function shapedIris(kind, cx, cy, r, o = {}) {
  const col = o.col || PAL.ink;
  if (r < 3) { paint(rectPts(-60, -60, W + 120, H + 120), { wash: col, ink: null }); return; }
  const hole = shapedIris.pts(kind, cx, cy, r, o);
  // everything outside the hole as ONE polygon: an outer box walked anticlockwise, a bridge in to the hole, the hole
  // walked clockwise, back out. p5.brush fills by the nonzero rule, so the hole must wind against the box (same winding
  // fills it in); this works for shapes that aren't star-shaped (Clawd's legs), unlike core's irisShape
  let x0 = -120, y0 = -120, x1 = W + 120, y1 = H + 120;
  for (const [x, y] of hole) { x0 = Math.min(x0, x - 60); y0 = Math.min(y0, y - 60); x1 = Math.max(x1, x + 60); y1 = Math.max(y1, y + 60); }
  let k = 0, best = Infinity;
  hole.forEach(([x, y], i) => { const d = Math.hypot(x - x0, y - y0); if (d < best) { best = d; k = i; } });
  const ring = hole.slice(k).concat(hole.slice(0, k + 1));
  paint([[x0, y0], ...ring, [x0, y0], [x0, y1], [x1, y1], [x1, y0]], { wash: col, ink: null });
  // the rim, only while the hole is small enough to keep its outline (LESSONS: huge outlines lose their strokes)
  const rim = o.rim ?? 1.4, bw = Math.max(...hole.map(q => q[0])) - Math.min(...hole.map(q => q[0])), bh = Math.max(...hole.map(q => q[1])) - Math.min(...hole.map(q => q[1]));
  if (rim > 0 && Math.max(bw, bh) < 1700) paint(hole, { ink: o.rimCol || mixCol(col, PAL.cream, .18), sw: rim });
}
shapedIris.pts = (kind, cx, cy, r, o = {}) => {
  let P;
  if (kind === 'heart') P = heartPts(cx, cy - .16 * r, r, 44);
  else if (kind === 'star') P = starPts(cx, cy + .095 * r, r, .48, 5, -Math.PI / 2);
  else if (kind === 'keyhole') {   // a round head (centred on cx, cy: aim it at a face) over a flared slot, as one outline
    P = []; const hc = cy, hr = .55 * r, a0 = Math.atan2(.5, .23);
    for (let i = 0; i <= 30; i++) { const a = lerp(Math.PI - a0, TAU + a0, i / 30); P.push([cx + Math.cos(a) * hr, hc + Math.sin(a) * hr]); }
    P.push([cx + .38 * r, cy + 1.25 * r], [cx - .38 * r, cy + 1.25 * r]);
  } else if (kind === 'clawd') {   // Clawd's front-view silhouette (body, arm nubs, four legs), centred on (cx, cy)
    const u = r / 5, gy = cy + 4 * u, a = o.arms ?? .35, Q = (x, y) => [cx + x * u, gy + y * u];
    const arm = s => { const dx = s * Math.cos(a), dy = -Math.sin(a), nx = -dy * s, ny = dx * s, px = s * 4.9, py = -4.5;
      const e = [[px - nx * .5, py - ny * .5], [px + dx * 2.2 - nx * .5, py + dy * 2.2 - ny * .5], [px + dx * 2.2 + nx * .5, py + dy * 2.2 + ny * .5], [px + nx * .5, py + ny * .5]];
      return (s > 0 ? e : e.reverse()).map(([x, y]) => Q(x, y)); };
    P = [Q(-5, -8), Q(5, -8), Q(5, -5.1), ...arm(1), Q(5, -3.9), Q(5, -2)];
    for (const lx of [3, 1, -2, -4]) P.push(Q(lx + 1, -2), Q(lx + 1, -.15), Q(lx, -.15), Q(lx, -2));
    P.push(Q(-5, -2), Q(-5, -3.9), ...arm(-1), Q(-5, -5.1));
  } else P = ellPts(cx, cy, r, r, 48);
  if (o.rot) { const c = Math.cos(o.rot), s = Math.sin(o.rot); P = P.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); }
  let A = 0; for (let i = 0; i < P.length; i++) { const [xa, ya] = P[i], [xb, yb] = P[(i + 1) % P.length]; A += xa * yb - xb * ya; }
  return A > 0 ? P : P.reverse();   // clockwise on screen (y down)
};
shapedIris.wipe = (p, o = {}) => {
  if (p <= 0 || p >= 1) return;
  const kind = o.kind || 'circle', hold = o.hold ?? 170, [cx, cy] = p < .5 ? (o.a || [W / 2, H / 2]) : (o.b || o.a || [W / 2, H / 2]);
  // the size at which the shape clears the frame: the farthest corner over the shape's narrowest reach from its centre
  const P = shapedIris.pts(kind, 0, 0, 100, o);
  let inr = Infinity;
  for (let i = 0; i < P.length; i++) {   // nearest point of each edge to the centre
    const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length], dx = bx - ax, dy = by - ay, t = clamp(-(ax * dx + ay * dy) / (dx * dx + dy * dy || 1));
    inr = Math.min(inr, Math.hypot(ax + dx * t, ay + dy * t) / 100);
  }
  const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - cx, y - cy))), rOpen = far / Math.max(.05, inr) * 1.03;
  const logLerp = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));
  const breathe = o.beat === false ? 0 : .035 * pulse(T, 5);
  let r;
  if (p < .5) {
    const q = p * 2;
    if (q < .45) r = logLerp(rOpen, hold, backOut(seg(q, 0, .45)));
    else if (q < .8) r = hold * (1 + breathe);
    else r = hold * (1 + .12 * Math.sin(Math.PI * seg(q, .8, .87))) * (1 - easeIn(seg(q, .86, .98)));
  } else {
    const q = (p - .5) * 2;
    if (o.holdB) r = q < .2 ? hold * backOut(seg(q, 0, .2)) : q < .5 ? hold * (1 + breathe) : logLerp(hold, rOpen, ease(seg(q, .5, 1)));
    else r = q < .15 ? hold * .6 * easeOut(seg(q, 0, .15)) : logLerp(hold * .6, rOpen, ease(seg(q, .15, 1)));
  }
  if (r >= rOpen) return;
  boilSeed('shapedIris');
  shapedIris(kind, cx, cy, r, o);
};
