// lib/sky/sea.js: open water to the horizon (sea or lake) tinted by the time of day, with swell marks and glints in
// perspective (small and packed near the horizon, bigger near you), a glitter path under the sun or moon, and a beach
// whose waves run up the sand and slide back once a bar.
// Use: Sea.draw(t, o) paints the water from the horizon down (after the sky and anything beyond the water);
//      Sea.shore(t, o) paints the beach from the waterline down, with the lapping wave (skip it and paint your own
//        near bank instead, e.g. a Landscape meadow layer, for a lake).
//      o: tod (with lib/sky/daysky.js loaded: reads its light and puts the sun / moon glitter under DaySky's sun and
//        moon; pass the same sky options as sky: {depth, arc, horizon}) or light (DaySky.light(tod)) + glare
//        ([{x, y, col, k}] world points to reflect); horizon (the far edge, y, default 700), farDepth (its parallax
//        depth: .08 for the sea's horizon, ~.6 for a lake's far shore at a Landscape forest), shore (the waterline, y,
//        default 880), kind ('sea' | 'lake': calmer, fewer and smaller marks), col / deep (water colours), marks
//        (swell mark density, default 1), glitter (path strength, default 1), reflect ({col, h}: a lake's far-shore
//        reflection, a band h px deep), seed.
//      Sea.shore: sand (colour), lap (run-up in px, default 38), beat (bars per lap, default 1), plus the options above.
//      Sea.waterAt(g, o) → the water colour at depth g (0 = horizon, 1 = waterline), for matching props.
// Expects: lib/sky/parallax.js; optional lib/sky/daysky.js (for o.tod). World space under camBegin, or no camera.
// Source: made for the asset library, 2026-09-25, by painter-skies (Claude). The flat tropical beach set (palm,
//   parasol, sun with a face) is lib/imported/bianbianzhu/beach.js.
const Sea = (() => {
  const NIGHT = '#141A44';
  function opts(o) {
    const lake = o.kind === 'lake', hz = o.horizon ?? 700, shore = o.shore ?? 880;
    let L = o.light, glare = o.glare || [];
    if (o.tod != null && typeof DaySky !== 'undefined') {
      L = L || DaySky.light(o.tod);
      const so = o.sky || {}, d = so.depth ?? .08;
      if (!o.glare) {
        const [sx, sy, sup] = DaySky.sunAt(o.tod, so), [mx, my, mup] = DaySky.moonAt(o.tod, so);
        if (sup > -.02 && so.sun !== false) glare.push({ x: Parallax.map(d, sx, sy)[0], col: L.sun, k: clamp(.7 + sup * 3) * (1 - .5 * clamp((sup - .4) * 2)), low: 1 - clamp(sup * 2.5) });
        if (mup > 0 && so.moon !== false) glare.push({ x: Parallax.map(d, mx, my)[0], col: '#F4EAD0', k: clamp(mup * 4) * (1 - L.dayK) * .8, low: 1 - clamp(mup * 2) });
      }
    }
    L = L || { zen: '#6CA6DA', mid: '#9FCBE8', hor: '#E3EEE2', dim: 0, dayK: 1, sun: '#FFE7A4' };
    return { L, glare, hz, shore, lake, farD: o.farDepth ?? .08, col: o.col ?? (lake ? '#3F8F8C' : '#2E8CA3'), deep: o.deep ?? (lake ? '#2A6660' : '#1D5878'),
      marks: (o.marks ?? 1) * (lake ? .55 : 1), glitter: o.glitter ?? 1, seed: o.seed ?? 0, reflect: o.reflect };
  }
  // water colour at depth g (0 = far edge, 1 = waterline): the sky's colour mirrored near the horizon, the water's own
  // colour nearer, all darkened by night
  function waterAt(g, o = {}) {
    const O = o.L ? o : opts(o), L = O.L;
    const sky = mixCol(L.hor, L.mid, .35), c = mixCol(mixCol(sky, O.col, .38 + .45 * g), O.deep, .3 * g * g);
    return mixCol(c, L.zen === undefined ? NIGHT : L.zen, .45 * (L.dim ?? 0));
  }
  const dOf = (g, O) => lerp(O.farD, 1, g);           // parallax depth of the water at g
  const yOf = (g, O) => lerp(O.hz, O.shore, g);         // its height at rest

  // a band of water from depth g down past the bottom of the frame, its top edge in the band's own parallax layer
  function band(g, col, amp, key, O) {
    const d = dOf(g, O), V = Parallax.view(d), st = 90, a = Math.floor(V.x0 / st) - 1, b = Math.ceil(V.x1 / st) + 1, y = yOf(g, O), P = [];
    boilSeed(key);
    for (let i = a; i <= b; i++) { const x = i * st; P.push(Parallax.map(d, x, y + amp * Math.sin(x / 140 + g * 40) + (amp ? jit(amp * .2) : 0))); }
    const W1 = Parallax.view(1), bot = Math.max(W1.y1, O.shore) + 200;
    paint(P.concat([[P[P.length - 1][0], bot], [P[0][0], bot]]), { wash: col, ink: null });
  }
  // a short curved mark on the water (a swell's lit or shaded side, or a glint), as a thin wash (LESSONS: light over dark)
  function mark(x, y, len, w, col, bend) {
    paint(ribbon([[x - len / 2, y], [x, y - bend], [x + len / 2, y]], w, w * .5), { wash: col, ink: null });
  }

  function draw(t, o = {}) {
    const O = opts(o), L = O.L, s = O.seed;
    // the water: bands, denser near the horizon
    const NB = 7;
    for (let k = 0; k < NB; k++) { const g = Math.pow(k / NB, 1.4); band(g, waterAt(g, O), k ? 1.5 + 5 * g : 0, 'seaband' + k, O); }
    // a lake's far shore mirrored: a darker band under the far edge, breaking into streaks
    if (O.reflect) {
      const d = O.farD, V = Parallax.begin(d), h = O.reflect.h ?? 40, col = mixCol(mixCol(O.reflect.col, O.deep, .3), waterAt(.05, O), .3), P = [];
      for (let x = Math.floor(V.x0 / 30) * 30 - 30; x <= V.x1 + 30; x += 30) P.push([x, O.hz + h * (.6 + .4 * Math.sin(x / 55 + s) * Math.sin(x / 23))]);
      boilSeed('reflect');
      paint([[P[0][0], O.hz - 2]].concat(P, [[P[P.length - 1][0], O.hz - 2]]), { wash: col, ink: null });
      for (let i = 0; i < 14; i++) {
        const x = lerp(V.x0, V.x1, (i + hash(i + s)) / 14), y = O.hz + h * (1 + .5 * hash(i * 3 + s));
        boilSeed('reflect streak' + i);
        mark(x, y, 40 + 60 * hash(i * 5 + s), 3, col, 0);
      }
      Parallax.end();
    }
    // the far edge: a fine line
    {
      const V = Parallax.begin(O.farD), sw = Math.min(1, 1.6 / V.zd), col = mixCol(waterAt(0, O), PAL.ink, .35);
      boilSeed('horizon line');
      for (let x = Math.floor(V.x0 / 700) * 700; x < V.x1; x += 700) inkLine([[x - 20, O.hz], [x + 350, O.hz + .5], [x + 720, O.hz]], .55 * sw, col, 'inkfine', .3);
      Parallax.end();
    }
    // swell marks: rows at increasing depth, each in its own parallax layer; each mark swells and fades on its own
    // clock, bobbing a little on the beat
    const rows = Math.round(16 * Math.min(1.5, O.marks));
    for (let r = 0; r < rows; r++) {
      const g = Math.pow((r + .5) / rows, 1.25), d = dOf(g, O), V = Parallax.begin(d), sw = Math.min(1, 1.6 / V.zd), y0 = yOf(g, O);
      const S = lerp(90, 420, g) / Math.max(.2, O.marks), base = waterAt(g, O);
      const lit = mixCol(base, mixCol(L.hor, '#FFF4DE', .5), .45 + .2 * (L.dayK ?? 1)), dark = mixCol(base, O.deep, .45);
      for (let i = Math.floor(V.x0 / S) - 1; i * S < V.x1 + S; i++) {
        const id = r * 1000 + i + s * 77, per = 2.2 + 2 * hash(id * 1.3), k = Math.sin(frac(t / per + hash(id * 2.1)) * Math.PI);
        if (k < .08) continue;
        const ph = frac(t / per + hash(id * 2.1)), x = i * S + hash(id * 3.7) * S + lerp(4, 18, g) * per * ph * (hash(id) - .5);   // drifts within its life, so it never leaves its slot
        const y = y0 + (hash(id * 4.3) - .5) * (O.shore - O.hz) / rows * .8 + Math.sin(bpOf(t) * Math.PI + id) * g * 2.5;
        const len = lerp(10, 110, g) * (.5 + .5 * hash(id * 5.9)) * (.35 + .65 * k), w = lerp(1.1, 4.6, g) * (.5 + .5 * k);
        boilSeed('swell' + id);
        mark(x, y, len, w * sw, hash(id * 6.7) < .6 ? lit : dark, len * .08);
      }
      Parallax.end();
    }
    // glitter paths under the sun / moon: broken bright streaks packed near the horizon, spreading toward you,
    // flickering on eighth notes
    const nG = Math.round(64 * O.glitter);
    for (const G of O.glare) {
      if (G.k <= .02) continue;
      const hot = mixCol(G.col, '#FFF6E2', .35), zoom = CAM ? CAM.zoom : 1;
      const hz = Parallax.map(O.farD, 0, O.hz)[1];
      glow(G.x, hz + 6, 140 + 260 * G.low, G.col, (.25 + .6 * G.low) * G.k);
      for (let i = 0; i < nG; i++) {
        const id = i * 3.1 + s * 13, g = Math.pow(hash(id * 1.7), 1.6) * .95 + .02, d = dOf(g, O);
        const [, wy] = Parallax.map(d, 0, yOf(g, O)), spread = lerp(10, 260, g) * (.6 + .6 * G.low);
        const x = G.x + (hash(id * 2.3) - .5) * 2 * spread * (.3 + .7 * hash(id * 9.1)), fl = frac(bpOf(t) * 2 + hash(id * 4.4));
        const k = G.k * (fl < .5 ? 1 - fl * 1.2 : .4) * (hash(Math.floor(bpOf(t) * 2) * 3.3 + id) < .75 ? 1 : 0);
        if (k < .05) continue;
        const z = Parallax.view(d).zd / zoom, len = lerp(6, 90, g) * z * (.5 + .7 * hash(id * 5.5)) * (.5 + .5 * k);
        boilSeed('glitter' + i);
        mark(x, wy, len, lerp(1.4, 5, g) * z * (.5 + .5 * k), mixCol(waterAt(g, O), hot, .7 + .3 * k), len * .05);
        if (k > .8 && hash(id * 7.7) > .8) glow(x, wy, len * 1.3, G.col, .5 * k * G.k);
      }
    }
    boilSeed('after sea');
  }

  // The beach: sand from the waterline down, the wet band the waves reach, and the wave itself: a thin sheet of water
  // that runs up the sand fast and slides back slowly once a bar, its foam front a light wash, rolling in along the
  // shore from one side.
  function shore(t, o = {}) {
    const O = opts(o), L = O.L, s = O.seed, V = Parallax.view(1), y0 = O.shore, lapA = o.lap ?? 38, bars = o.beat ?? 1;
    const sand = mixCol(mixCol(o.sand ?? '#E9CE9A', L.hor, .15), L.zen ?? NIGHT, .55 * (L.dim ?? 0)), wet = mixCol(sand, mixCol(O.deep, '#6B5A48', .5), .32);
    const st = 40, a = Math.floor(V.x0 / st) - 1, b = Math.ceil(V.x1 / st) + 1, bot = V.y1 + 80;
    const line = x => y0 + 10 * Math.sin(x / 380 + s) + 5 * Math.sin(x / 130 + s * 2);   // the waterline at rest
    const runOf = x => {   // 0..1 how far up the sand the wave is at x
      const p = frac(bpOf(t) / (4 * bars) - x / 2600 + s * .1);
      return p < .3 ? easeOut(p / .3) : 1 - ease((p - .3) / .6);
    };
    const xs = []; for (let i = a; i <= b; i++) xs.push(i * st);
    boilSeed('sand');
    paint(xs.map(x => [x, line(x) - 6]).concat([[b * st, bot], [a * st, bot]]), { wash: sand, ink: null });
    boilSeed('wet sand');
    const wetEdge = xs.map(x => [x, line(x) + lapA * (1.05 + .1 * Math.sin(x / 90 + s))]);
    paint(xs.map(x => [x, line(x) - 6]).concat(wetEdge.slice().reverse()), { wash: wet, ink: null });
    // a few pebbles and shell flecks on the dry sand
    for (let i = a; i <= b; i += 3) {
      const x = i * st + hash(i * 1.9 + s) * st * 3, y = line(x) + lapA * 1.6 + hash(i * 2.7 + s) * (bot - y0 - lapA * 1.6);
      if (y > V.y1 + 10) continue;
      boilSeed('pebble' + i);
      const r = 3 + 3 * hash(i * 3.3 + s) + (y - y0) * .012;
      paint(ellPts(x, y, r * 1.5, r, 10, .5), { wash: mixCol(sand, hash(i * 5.1) < .5 ? '#9C8466' : '#F6E8D0', .45), ink: null });
    }
    // the sheet of water, its front and foam
    const front = xs.map(x => [x, line(x) + lapA * runOf(x)]);
    boilSeed('wave sheet');
    paint(xs.map(x => [x, line(x) - 12]).concat(front.slice().reverse()), { wash: mixCol(waterAt(1, O), sand, .28), ink: null });
    const foam = mixCol('#FFF4E0', L.zen ?? NIGHT, .45 * (L.dim ?? 0));
    boilSeed('foam');
    for (let i = 0; i + 6 < front.length; i += 6) paint(ribbon(front.slice(i, i + 7), 7, 5), { wash: foam, ink: null });
    boilSeed('foam line 2');
    const back = xs.map(x => [x, line(x) + lapA * runOf(x + 300) * .55 - 4]);
    for (let i = 0; i + 6 < back.length; i += 6) paint(ribbon(back.slice(i, i + 7), 3, 2), { wash: mixCol(foam, waterAt(1, O), .25), ink: null });
    for (let i = 0; i < front.length; i += 2) {   // foam bubbles riding the front
      const [x, y] = front[i], id = i + a * 7;
      if (hash(id * 1.3) < .45) continue;
      boilSeed('bubble' + id);
      paint(ellPts(x + hash(id) * st, y - 4 - 8 * hash(id * 2.2), 3 + 3 * hash(id * 3.1), 2 + 2 * hash(id * 4), 8), { wash: foam, ink: null });
    }
    boilSeed('after shore');
  }

  return { draw, shore, waterAt };
})();
