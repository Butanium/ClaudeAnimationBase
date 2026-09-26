// lib/sky/landscape.js: an endless outdoor landscape in depth layers (mountains, hills, a forest edge, the meadow,
// foreground grass) that slide by parallax when the camera moves; farther = paler, bluer, smaller.
// Use: Landscape.draw(t, o) paints everything behind the characters; Landscape.front(t, o) paints the foreground
//        grass that passes in front of them (call it after the characters, before camEnd()).
//      Landscape.groundY(x, o) → the meadow's top at world x: stand characters there (clawd(x, Landscape.groundY(x), u)).
//      o: light (DaySky.light(tod): tints every layer for the time of day) or haze / dim / night directly (the colour
//        far layers fade into, 0..1 darkening, the colour it darkens toward); horizon (default 700: layers sit
//        relative to it), wind (tuft sway, default 1), tufts / flowers (density, default 1), front (false to skip the
//        foreground), layers (replace the default list: [{kind: 'mountains'|'hills'|'forest'|'meadow', d, y, amp,
//        col, seed, firs (forest: share of firs, 0..1, default .35)}], d = parallax depth, 1 = the world), seed.
// Expects: lib/sky/parallax.js. Works under camBegin (each layer has its own parallax and zoom: d = .2 barely moves,
//        d = 1 is the world) or with no camera. The meadow (d = 1) is in world space; groundY matches it exactly.
// Source: made for the asset library, 2026-09-25, by painter-skies (Claude).
const Landscape = (() => {
  // smooth 1D value noise in 0..1
  const vn = x => { const i = Math.floor(x), f = x - i; return lerp(hash(i), hash(i + 1), f * f * (3 - 2 * f)); };
  const fbm = (x, s) => .65 * vn(x + s * 17.3) + .35 * vn(x * 2.3 + s * 5.1);

  const DEFAULT = [
    { kind: 'mountains', d: .16, y: -10, amp: 330, col: '#7F8CB8', seed: 1 },
    { kind: 'hills', d: .36, y: 40, amp: 120, col: '#86A879', seed: 2 },
    { kind: 'forest', d: .6, y: 95, amp: 50, col: '#3E6B58', seed: 3 },
    { kind: 'meadow', d: 1, y: 140, amp: 46, col: PAL.sap, seed: 4 },
  ];
  const opts = o => {
    const L = o.light || {};
    return { hz: o.horizon ?? 700, haze: o.haze ?? L.hor ?? '#DDEDE8', dim: o.dim ?? L.dim ?? 0, night: o.night ?? L.zen ?? PAL.night,
      wind: o.wind ?? 1, tufts: o.tufts ?? 1, flowers: o.flowers ?? 1, layers: o.layers || DEFAULT, seed: o.seed ?? 0 };
  };
  // a layer's colour: darkened for night, then faded into the haze by distance
  const tone = (col, d, O, extra = 0) => mixCol(mixCol(col, O.night, .62 * O.dim), O.haze, clamp(.7 * Math.pow(1 - Math.min(d, 1), .8) + extra));
  const inkOf = (col, d, O) => mixCol(tone(col, d, O), PAL.ink, lerp(.28, .85, clamp(d)));

  // top edge of a smooth layer at x
  const edge = (Ly, O, x) => O.hz + Ly.y + Ly.amp * (fbm(x / (Ly.kind === 'meadow' ? 900 : 560), Ly.seed + O.seed) - .5) * 2;
  function groundY(x, o = {}) {
    const O = opts(o), Ly = O.layers.find(l => l.kind === 'meadow') || DEFAULT[3];
    return edge(Ly, O, x);
  }
  // Ink a long edge in pieces no wider than ~800 px (LESSONS: strokes on shapes bigger than the canvas get lost).
  function inkEdge(P, sw, col) {
    const step = Math.max(2, Math.floor(P.length / Math.ceil((P[P.length - 1][0] - P[0][0]) / 800)));
    for (let i = 0; i < P.length - 1; i += step) inkLine(P.slice(i, Math.min(P.length, i + step + 1)), sw, col, 'ink', .3);
  }
  // Close a top edge down to y1 as a wash.
  const body = (P, y1) => P.concat([[P[P.length - 1][0], y1], [P[0][0], y1]]);

  function mountains(t, Ly, O, V, sw) {
    const S = 430, s = Ly.seed + O.seed, base = O.hz + Ly.y, col = tone(Ly.col, Ly.d, O), P = [], caps = [];
    const peak = i => [i * S + (hash(i * 1.3 + s) - .5) * S * .45, base - Ly.amp * (.4 + .6 * hash(i * 2.7 + s))];
    const jag = (a, b, k, j) => [lerp(a[0], b[0], k) + (hash(j * 5.1 + s) - .5) * 24, lerp(a[1], b[1], k) + (hash(j * 6.3 + s) - .5) * 26];
    for (let i = Math.floor(V.x0 / S) - 1; i <= Math.ceil(V.x1 / S) + 1; i++) {
      const pk = peak(i), nx = peak(i + 1), v = [lerp(pk[0], nx[0], .4 + .2 * hash(i * 3.1 + s)), base - Ly.amp * (.08 + .22 * hash(i * 4.7 + s))];
      const tall = pk[1] < base - Ly.amp * .66, before = P[P.length - 1];
      P.push(pk);
      const after = jag(pk, v, .3, i * 4);
      P.push(after, jag(pk, v, .66, i * 4 + 1), v, jag(v, nx, .4, i * 4 + 2), jag(v, nx, .76, i * 4 + 3));
      if (tall && before) caps.push([before, pk, after]);
    }
    boilSeed('mount' + s);
    paint(body(P, V.y1 + 60), { wash: col, ink: null });
    // snow caps: their sides are the silhouette's own vertices, their lower edge ragged and inside the mountain
    caps.forEach(([l, pk, r], j) => {
      const C = [l, pk, r];
      for (let k = 1; k < 6; k++) { const q = [lerp(r[0], l[0], k / 6), lerp(r[1], l[1], k / 6)]; C.push([q[0], q[1] + (k % 2 ? 16 : -3)]); }
      boilSeed('cap' + s + ' ' + j);
      paint(C, { wash: tone('#F4F1EA', Ly.d, O, -.25), ink: null });
    });
    boilSeed('mount ink' + s);
    inkEdge(P, .55 * sw, inkOf(Ly.col, Ly.d, O));
  }

  function hills(t, Ly, O, V, sw) {
    const P = [], s = Ly.seed + O.seed;
    for (let x = Math.floor(V.x0 / 40) * 40 - 40; x <= V.x1 + 40; x += 40) P.push([x, edge(Ly, O, x)]);
    boilSeed('hills' + s);
    paint(body(P, V.y1 + 60), { wash: tone(Ly.col, Ly.d, O), ink: null });
    // soft darker patches down in the folds
    for (let i = Math.floor(V.x0 / 700); i * 700 < V.x1; i++) {
      const x = i * 700 + hash(i * 2.1 + s) * 700;
      boilSeed('hillpatch' + s + ' ' + i);
      paint(ellPts(x, edge(Ly, O, x) + 90, 260, 50, 16, 5), { fill: tone(mixCol(Ly.col, PAL.teal, .4), Ly.d, O), fillOp: 70, bleed: .15, tex: .6, ink: null });
    }
    boilSeed('hills ink' + s);
    inkEdge(P, .7 * sw, inkOf(Ly.col, Ly.d, O));
  }

  // Silhouette of a row of trees: the height of the tallest crown at x. A tree is {x, top, g, r, fir}: round crowns
  // are circles of radius r whose top is at `top`; firs are tiered triangles r wide, from `top` down to g.
  function crownY(trees, x, lean = () => 0) {
    let y = Infinity;
    for (const tr of trees) {
      const dx = Math.abs(x - tr.x - lean(tr.x));
      if (dx >= tr.r) continue;
      if (tr.fir) {
        const Ht = tr.g - tr.top;
        for (let f = 0; f <= 1; f += 1 / 32) if (tr.r * f * (.72 + .28 * frac(f * 3 - .001)) >= dx) { y = Math.min(y, tr.top + f * Ht); break; }
      } else y = Math.min(y, tr.top + tr.r - Math.sqrt(tr.r * tr.r - dx * dx));
    }
    return y;
  }

  // The forest edge: one silhouette along the tops of a row of round crowns and tiered firs.
  function forest(t, Ly, O, V, sw) {
    const s = Ly.seed + O.seed, S = 52, trees = [];
    for (let i = Math.floor(V.x0 / S) - 2; i <= Math.ceil(V.x1 / S) + 2; i++) {
      const x = i * S + (hash(i * 1.7 + s) - .5) * S * .6, fir = vn(i * .19 + s * 7.7) < (Ly.firs ?? .35), g = edge(Ly, O, x);   // firs come in stands
      const r = 32 + 30 * hash(i * 2.9 + s), lift = 20 * hash(i * 5.3 + s);
      trees.push(fir ? { x, fir, r: r * 1.1, top: g - r * 2.5 - lift, g: g - 10 } : { x, fir, r, top: g - r * 1.35 - lift, g });
    }
    // sway: a slow wave through the row, nudged on the beat
    const sway = x => O.wind * 2 * Math.sin(t * 1.3 - x / 300) * (.6 + .4 * pulse(t, 3));
    const P = [];
    for (let x = Math.floor(V.x0 / 6) * 6 - 60; x <= V.x1 + 60; x += 6) P.push([x, Math.min(crownY(trees, x, sway), edge(Ly, O, x) - 26)]);   // never a gap down to the ground
    boilSeed('forest' + s);
    const col = tone(Ly.col, Ly.d, O);
    paint(body(P, V.y1 + 60), { wash: col, ink: null });
    // the shade under the canopy
    const Q = []; for (let x = Math.floor(V.x0 / 60) * 60 - 60; x <= V.x1 + 120; x += 60) Q.push([x, edge(Ly, O, x) + 30 + 10 * Math.sin(x / 70 + s)]);
    boilSeed('forest shade' + s);
    paint(body(Q, V.y1 + 60), { wash: mixCol(col, O.night, .3), ink: null });
    boilSeed('forest ink' + s);
    inkEdge(P, .7 * sw, inkOf(Ly.col, Ly.d, O));
  }

  // A tuft: one outline with three blades, bent by the wind at its x.
  function tuft(x, y, h, lean, col, key) {
    boilSeed(key);
    const w = h * .5, P = [[x - w * .5, y]];
    [[-.32, .75], [0, 1], [.34, .82]].forEach(([dx, k], j) => {
      const bx = x + dx * w, tipx = bx + dx * w * .8 + lean * h * k, tipy = y - h * k;
      if (j) P.push([x + (dx - .17) * w, y - h * .22]);
      P.push([tipx, tipy]);
    });
    P.push([x + w * .5, y]);
    paint(P, { wash: col, ink: null });
  }
  const leanAt = (t, x, O) => O.wind * (.22 * Math.sin(t * 1.6 - x / 260) + .1 * Math.sin(t * 3.1 - x / 90 + 1) + .12 * pulse(t, 4) * Math.sin(x / 400 + beatN(t)));

  function meadow(t, Ly, O, V, sw) {
    const s = Ly.seed + O.seed, P = [];
    for (let x = Math.floor(V.x0 / 30) * 30 - 30; x <= V.x1 + 30; x += 30) P.push([x, edge(Ly, O, x)]);
    const col = tone(Ly.col, Ly.d, O), dk = mixCol(col, mixCol(PAL.teal, PAL.ink, .5), .3);
    boilSeed('meadow' + s);
    paint(body(P, V.y1 + 60), { wash: col, ink: null });
    // soft mottling
    for (let i = Math.floor(V.x0 / 500); i * 500 < V.x1; i++) {
      const x = i * 500 + hash(i * 1.9 + s) * 500, y = edge(Ly, O, x) + 90 + 160 * hash(i * 2.2 + s);
      boilSeed('mottle' + s + ' ' + i);
      paint(ellPts(x, y, 150 + 90 * hash(i), 34, 14, 5), { fill: dk, fillOp: 85, bleed: .12, tex: .6, ink: null });
    }
    // tufts along the brow, and a few further down (nearer, so bigger)
    if (O.tufts > 0) {
      const S = 52 / O.tufts;
      for (let i = Math.floor(V.x0 / S) - 1; i * S < V.x1 + S; i++) {
        const x = i * S + hash(i * 1.1 + s) * S * .8, h = 18 + 20 * hash(i * 2.3 + s);
        tuft(x, edge(Ly, O, x) + 5, h, leanAt(t, x, O), dk, 'tuft' + s + ' ' + i);
      }
      const S2 = 150 / O.tufts;
      for (let i = Math.floor(V.x0 / S2) - 1; i * S2 < V.x1 + S2; i++) {
        const x = i * S2 + hash(i * 4.1 + s) * S2, dy = 60 + 260 * hash(i * 3.7 + s), y = edge(Ly, O, x) + dy;
        if (y > V.y1 + 40) continue;
        tuft(x, y, 16 + dy * .08, leanAt(t, x, O), mixCol(dk, col, .3), 'tuft2 ' + s + ' ' + i);
      }
    }
    // flowers: little five-dot blossoms that nod
    if (O.flowers > 0) {
      const S = 190 / O.flowers, FC = ['#FFF1D6', '#F2A7B8', '#F4C35A'];
      for (let i = Math.floor(V.x0 / S) - 1; i * S < V.x1 + S; i++) {
        const x = i * S + hash(i * 6.1 + s) * S, dy = 20 + 240 * hash(i * 5.7 + s), y = edge(Ly, O, x) + dy;
        if (y > V.y1 + 20) continue;
        const r = 4.5 + dy * .014, fc = tone(FC[Math.floor(hash(i * 7.9 + s) * 3)], 1, O), nod = leanAt(t, x, O) * 10;
        boilSeed('flower' + s + ' ' + i);
        inkLine([[x, y + 3], [x + nod * .5, y - r * 2], [x + nod, y - r * 4]], .45 * sw, dk, 'inkfine', .5);
        paint(ellPts(x + nod, y - r * 4, r * 1.6, r * 1.3, 10, .4), { wash: fc, ink: null });
        paint(ellPts(x + nod, y - r * 4, r * .55, r * .55, 8), { wash: tone('#E0A33A', 1, O), ink: null });
      }
    }
    boilSeed('meadow ink' + s);
    inkEdge(P, 1 * sw, PAL.ink);
  }

  const KINDS = { mountains, hills, forest, meadow };
  function draw(t, o = {}) {
    const O = opts(o);
    for (const Ly of O.layers) {
      const V = Parallax.begin(Ly.d), sw = Math.min(1, 1.6 / V.zd);
      KINDS[Ly.kind](t, Ly, O, V, sw);
      Parallax.end();
    }
    boilSeed('after landscape');
  }

  // Foreground: grass clumps and round bushes at depth 1.4 along the bottom of the frame, sliding past faster than
  // the world. Sparse by default, so they frame the shot without covering the characters.
  function front(t, o = {}) {
    const O = opts(o);
    if (o.front === false) return;
    const d = o.frontDepth ?? 1.4, V = Parallax.begin(d), sw = Math.min(1, 1.6 / V.zd), S = 640, s = O.seed + 9;
    const col = mixCol(mixCol(mixCol(PAL.sap, PAL.teal, .3), PAL.ink, .22), O.night, .6 * O.dim), yb = V.y1 + 24;
    for (let i = Math.floor(V.x0 / S) - 1; i * S < V.x1 + S; i++) {
      const x = i * S + hash(i * 2.7 + s) * S * .7, k = 'front' + i;
      if (hash(i * 3.9 + s) < .4) {   // a bush: three to four round puffs, one outline, leaning with the wind
        const n = 3 + Math.floor(hash(i * 4.4 + s) * 2), lean = leanAt(t, x, O) * 22, B = [];
        for (let j = 0; j < n; j++) { const u = j / (n - 1), r = 52 + 30 * (1 - Math.abs(u - .5) * 2) + 14 * hash(i * 6 + j); B.push({ x: x + (u - .5) * 150, top: yb - r * (1.3 + .5 * (1 - Math.abs(u - .5) * 2)), r }); }
        const P = []; for (let bx = x - 150; bx <= x + 150; bx += 6) { const y = crownY(B, bx, () => lean); if (y < yb) P.push([bx, y]); }
        if (P.length < 3) continue;
        boilSeed(k);
        paint(body(P, yb + 40), { wash: col, ink: null });
        inkLine(P, .9 * sw, PAL.ink, 'ink', .3);
      } else {                          // a clump of broad blades
        const n = 4, h0 = 70 + 60 * hash(i * 5.1 + s);
        for (let j = 0; j < n; j++) {
          const bx = x + (j - 1.5) * 22 + 10 * hash(i * 7 + j), h = h0 * (.7 + .5 * hash(i * 8.3 + j)), side = j - 1.5;
          const lean = leanAt(t, bx, O) * 1.2 + side * .16, w = 20 + 8 * hash(i * 9 + j);
          const P = [[bx - w * .5, yb], [bx - w * .2 + lean * h * .5, yb - h * .55], [bx + lean * h, yb - h], [bx + w * .15 + lean * h * .5, yb - h * .5], [bx + w * .5, yb]];
          boilSeed(k + ' ' + j);
          paint(P, { wash: mixCol(col, PAL.ink, j % 2 ? .12 : 0), ink: PAL.ink, sw: .75 * sw, curv: .5 });
        }
      }
    }
    Parallax.end();
    boilSeed('after front');
  }

  return { draw, front, groundY, crownY, tone, DEFAULT };
})();
