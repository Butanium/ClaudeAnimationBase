// lib/weather/snow.js: snow in depth: flakes drifting down on swaying arcs (far ones small and slow, near ones big, some
// six-pointed), landing on the ground or any surface and melting into it; plus the snow that has settled, as a cover.
// Use: snow(t, o) paints the flakes; call it twice around your characters, o.layer 'far' before them and 'near' after.
//      snow.cover(x0, x1, y, depth, o) paints settled snow lying on the line x0..x1 at height y, depth px thick (a
//        lumpy mound that rounds over the ends). Works in any space: in a clawd() draw hook, snow.cover(-5 * u, 5 * u,
//        -8 * u, d) is a cap that squashes and turns with the head. Grow depth with time, e.g. Math.min(30, 8 * (t - t0)).
//   snow o: intensity 0..1 or s => 0..1 (read at each flake's spawn; flakes take seconds to fall, so a change shows
//      from the top down), wind (dx per px fallen, or t => it), ground (world
//      y where flakes settle; pass the top of the cover), band (depth of the ground strip, 60·size), surfaces
//      [[ax, ay, bx, by], ...] near flakes land on, stay (s a settled flake lasts, .9 on the ground, .3 on surfaces),
//      night (flakes for dark skies: no outline), size, speed (px/s, 120·size), density (flakes per 1920 px, 160),
//      col / colFar / ink, x0 / x1 / top, seed.
//   cover o: col, shade (its blue underside), ink (null: none), sw, key.
// Expects: world space for snow() (under a camera or not; the field is periodic in world x, so it stays put when the
//   camera pans). 1 paint per flake (2 for outlined near ones by day): ~150–220 at intensity 1. A cover is 3 paints.
// Source: made for the asset library, 2026-09-25, by painter-weather (Claude).
const snow = (() => {
  const TILE = 1920;
  const DAY = { col: '#F4F6F9', colFar: '#DCE2EB', ink: '#8C9DBA' }, NIGHT = { col: '#EDF1F8', colFar: '#8E9AC0', ink: null };
  const val = (v, t, d) => typeof v === 'function' ? v(t) : v ?? d;

  function view() {
    if (!CAM) return [0, 0, W, H];
    const c = Math.cos(CAM.rot), s = Math.sin(CAM.rot), xs = [], ys = [];
    for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
      const dx = (sx - W / 2) / CAM.zoom, dy = (sy - H / 2) / CAM.zoom;
      xs.push(CAM.cx + dx * c + dy * s); ys.push(CAM.cy - dx * s + dy * c);
    }
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }

  function snow(t, o = {}) {
    const size = o.size ?? 1, seed = o.seed ?? 0, P0 = o.night ? NIGHT : DAY;
    const col = o.col ?? P0.col, colFar = o.colFar ?? P0.colFar, ink = o.ink === undefined ? P0.ink : o.ink;
    const I = typeof o.intensity === 'function' ? o.intensity : () => o.intensity ?? .7, wind = val(o.wind, t, .08);
    const [vx0, vy0, vx1, vy1] = view(), X0 = o.x0 ?? -Infinity, X1 = o.x1 ?? Infinity, top = o.top ?? vy0 - 40 * size;
    const ground = o.ground, band = o.band ?? 60 * size, bottom = ground != null ? ground + band / 2 : vy1 + 40 * size;
    const speed = o.speed ?? 120 * size, density = o.density ?? 160, fall = bottom - top;
    const zMin = o.layer === 'near' ? .5 : 0, zMax = o.layer === 'far' ? .5 : 1.0001, surfaces = o.surfaces || [];
    const zf = CAM ? Math.min(1, 1.6 / CAM.zoom) : 1;
    if (fall <= 0) return;
    const drift = Math.abs(wind) * fall + 80 * size, m0 = Math.floor((vx0 - drift) / TILE), m1 = Math.floor((vx1 + drift) / TILE);
    boilSeed('snow ' + seed + ' ' + (o.layer || 'all'));
    for (let m = m0; m <= m1; m++) for (let i = 0; i < density; i++) {
      const id = seed * 7919 + m * 1009 + i, z = hash(id * .731 + .5);
      if (z < zMin || z >= zMax) continue;
      const v = speed * lerp(.55, 1.15, z), A = size * lerp(8, 34, z) * (.6 + .4 * hash(id * 4.4)), w = lerp(1.1, 2.4, hash(id * 5.7)), ph = TAU * hash(id * 6.1);
      const r = size * lerp(2.2, 7.5, z) * (.75 + .5 * hash(id * 8.3)), c = mixCol(colFar, col, z);
      const stayG = o.stay ?? .9, stayS = o.stay ?? .3;
      const P = fall / v + stayG + .2 + .6 * hash(id * 1.93), cph = hash(id * 2.3 + 1.7), u = t / P + cph, n = Math.floor(u), ts = (n - cph) * P;
      if (hash(id * 3.3 + n * 1.91) >= clamp(I(ts))) continue;
      const xs = m * TILE + hash(id * 1.37 + n * 7.13) * TILE - wind * fall * .5;
      // x as it falls: a sway (the arc of a falling flake) plus the wind
      const X = y => xs + wind * (y - top) + A * Math.sin(w * (y - top) / v * TAU * .5 + ph);
      let yl = ground != null ? ground + (z - .5) * band : Infinity, onSurf = false;
      if (z >= .5) for (const [ax, ay, bx, by] of surfaces) {
        let y = (ay + by) / 2;
        for (let k = 0; k < 3; k++) { const q = (X(y) - ax) / ((bx - ax) || 1e-6); y = ay + (by - ay) * clamp(q); }
        const q = (X(y) - ax) / ((bx - ax) || 1e-6);
        if (q >= 0 && q <= 1 && y > top && y < yl) { yl = y; onSurf = true; }
      }
      const age = t - ts, yNow = top + age * v, stay = onSurf ? stayS : stayG, a = age - (yl - top) / v;
      let x, y, rr = r, rot = age * (w - 1.7) * 2;
      if (yNow < yl) { y = yNow; x = X(y); }
      else if (a < stay) { y = yl - r * .4; x = X(yl); rr = r * (1 - ease(a / stay)) * lerp(1, .7, z); rot = 0; }   // settled, melting in
      else continue;
      if (rr < .6 || x < Math.max(vx0, X0) - 20 || x > Math.min(vx1, X1) + 20 || y < vy0 - 20 || y > vy1 + 20) continue;
      const star = z > .82 && yNow < yl, pts = star ? starPts(x, y, rr * 1.35, .45, 6, rot) : ellPts(x, y, rr, rr * .92, 8, 0, rot);
      paint(pts, { wash: c, ink: ink && z > .7 ? ink : null, sw: .35 * zf });
    }
  }

  // Settled snow on the line (x0, y)–(x1, y): a lumpy mound `depth` thick that bulges over both ends, with a pale blue
  // underside and a soft outline.
  snow.cover = (x0, x1, y, depth, o = {}) => {
    if (!(depth > .5)) return;
    const col = o.col ?? '#F4F6F9', shade = o.shade ?? '#D5DEEB', ink = o.ink === undefined ? '#7F8FAE' : o.ink;
    const n = Math.max(8, Math.round((x1 - x0) / (depth * 1.2))), over = Math.min(depth * .45, (x1 - x0) * .08), top = [], seedK = x0 * .013 + x1 * .007;
    for (let i = 0; i <= n; i++) {
      const k = i / n, x = lerp(x0 - over, x1 + over, k), end = Math.pow(Math.sin(Math.PI * k), .35);
      top.push([x, y - depth * end * (.82 + .18 * hash(seedK + i * 1.7)) + jit(depth * .03)]);
    }
    const under = [[x1 + over, y + depth * .15], [x1 - over, y + depth * .08], [x0 + over, y + depth * .08], [x0 - over, y + depth * .15]];
    boilSeed(o.key ?? 'snow cover ' + x0 + ' ' + y);
    paint([...top, ...under], { wash: col, ink: null });
    paint([...top.map(([px, py]) => [px, lerp(py, y, .55)]), ...under], { wash: shade, ink: null });
    paint([...top, ...under], { ink, sw: o.sw ?? clamp(depth / 30, .35, .8) * (CAM ? Math.min(1, 1.6 / CAM.zoom) : 1) });
  };
  return snow;
})();
