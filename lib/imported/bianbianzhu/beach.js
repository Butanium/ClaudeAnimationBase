// lib/imported/bianbianzhu/beach.js: a beach set: palm, sea band, shoreline, parasol, volleyball, gull, a sun with a face.
// Use: BEACH.palm(x, y, s, sway, key, lean): trunk base (x, y), height s, sway -1..1 stirs the fronds.
//   BEACH.sea(t, x0, x1, y0, y1, key, cols): a band of sea with glints. BEACH.shoreline(t, x0, x1, y, key, amp): foam edge
//   that laps up and back once a bar (paint the sand first, then this over it). BEACH.parasol(x, y, s, open 0..1, tilt, key)
//   (pole foot at (x, y)). BEACH.vball(x, y, r, rot, key). BEACH.gull(x, y, s, flap in turns, key, col).
//   BEACH.sun(x, y, r, t, face 'happy' | 'wink' | 'sleep' | null, { glow, rays, beat, key, col, rim }). Colours: BEACH.C.
// Expects: core only; world or screen space (inside a camera or not). The palm's fronds stir with the global frame time T.
// Source: imported from https://github.com/bianbianzhu/ClaudeAnimationBase@feb20e9 (src/scenes/beach/common.js), MIT,
//   by bianbianzhu; Copyright (c) 2026 bianbianzhu, MIT. Changed: split out of the film's BCH namespace; no longer sets
//   PAL.foam; the glints and the shoreline's second foam line are thin washes instead of cream ink lines (LESSONS: light
//   over dark).
const BEACH = (() => {
  const C = {
    sand: '#F0D5A2', sandDk: '#D8AE74', sea: '#3FB1B8', seaDk: '#2B7F9A', seaLt: '#9ADFD6', foam: '#FFF5E2',
    ballA: '#4C7FC0', ballB: '#F2C53D', leaf: '#5E9F5A', leafDk: '#3E6F48', trunk: '#9A6A45', canopy: '#E2476E',
  };
  const streak = (x0, x1, y, w, col) => paint(ribbon([[x0, y], [(x0 + x1) / 2, y - w * .2], [x1, y]], w, w * .4), { wash: col, washOp: 235, ink: null });

  // The sun: rays, a painted disc and an optional face ('sleep' | 'happy' | 'wink' | null).
  function sun(x, y, r, t, face = null, o = {}) {
    const core = o.col || '#FAD46C', rim = o.rim || '#F4B444';
    if (o.glow !== 0) glow(x, y, r * (o.glowR ?? 2.4), o.glowCol || '#FFD97A', o.glow ?? 1);
    if (o.rays !== false) { boilSeed('sunrays' + (o.key || '')); paint(starPts(x, y, r * (1.42 + .1 * (o.beat ?? 0)), .74, 12, t * .12), { wash: rim, fill: PAL.ochre, fillOp: 60, ink: PAL.ink, sw: .8 }); }
    boilSeed('sun' + (o.key || ''));
    paint(ellPts(x, y, r, r, 36, 1.2), { wash: core, fill: rim, fillOp: 70, bleed: .1, tex: .5, ink: o.ink === null ? null : PAL.ink, sw: 1 });
    if (!face) return;
    const e = r * .34, ey = y - r * .1, lw = clamp(r / 70, .6, 1.5);
    const shut = (cx, up) => inkLine([[cx - e * .42, ey], [cx, ey + (up ? -e * .32 : e * .28)], [cx + e * .42, ey]], lw, PAL.ink, 'ink', .8);
    const open = cx => { paint(ellPts(cx, ey, e * .2, e * .3, 12), { wash: PAL.ink, ink: null }); paint(ellPts(cx + e * .07, ey - e * .12, e * .07, e * .07, 8), { wash: PAL.cream, ink: null }); };
    if (face === 'sleep') { shut(x - e, false); shut(x + e, false); }
    else if (face === 'wink') { open(x - e); shut(x + e, true); }
    else { shut(x - e, true); shut(x + e, true); }
    for (const s of [-1, 1]) paint(ellPts(x + s * e * 1.55, y + r * .22, r * .16, r * .09, 12), { fill: PAL.rose, fillOp: 170, bleed: .15, ink: null });
    if (face === 'sleep') paint(ellPts(x, y + r * .36, r * .07, r * .09, 10), { wash: PAL.ink, ink: null });
    else inkLine([[x - e * .6, y + r * .28], [x, y + r * .48], [x + e * .6, y + r * .28]], lw, PAL.ink, 'ink', .8);
  }

  // A gull: a painted M with a little body, s = half wingspan, flap = phase (turns).
  function gull(x, y, s, flap, key = '', col = PAL.cream) {
    boilSeed('gull' + key);
    const f = Math.sin(flap * TAU), tip = -s * .45 * f, mid = s * .12 * f;
    paint(ribbon([[x - s, y + tip], [x - s * .45, y - s * .25 + mid], [x, y]], s * .06, s * .2), { wash: col, ink: PAL.ink, sw: .6 });
    paint(ribbon([[x + s, y + tip], [x + s * .45, y - s * .25 + mid], [x, y]], s * .06, s * .2), { wash: col, ink: PAL.ink, sw: .6 });
    paint(ellPts(x, y + s * .03, s * .2, s * .1, 10), { wash: col, ink: PAL.ink, sw: .5 });
    paint([[x + s * .16, y], [x + s * .3, y + s * .04], [x + s * .16, y + s * .07]], { wash: PAL.ochre, ink: null });
  }

  // A palm: trunk from (x, y) curving by lean, fronds swaying with the breeze (sway ~ -1..1). s = height.
  function palm(x, y, s, sway, key = '', lean = .25) {
    boilSeed('palm' + key);
    const top = [x + s * lean + sway * s * .04, y - s];
    const P = [[x, y], [x + s * lean * .2, y - s * .4], [x + s * lean * .65, y - s * .78], top];
    paint(ribbon(P, s * .085, s * .05), { wash: C.trunk, fill: mixCol(C.trunk, PAL.ink, .3), fillOp: 70, tex: .7, ink: PAL.ink, sw: .8 });
    for (let i = 1; i < 6; i++) { const q = through(P, 4)[i * 2]; if (q) inkLine([[q[0] - s * .04, q[1]], [q[0] + s * .04, q[1] - s * .015]], .5, PAL.ink, 'inkfine', 0); }
    for (let i = 0; i < 7; i++) {   // fronds: serrated leaves arching out and drooping, stirring in the breeze
      boilSeed('frond' + key + i);
      const a = -Math.PI / 2 + (i - 3) * .66 + sway * .14 * (1 + hash(i)) + .05 * Math.sin(T * 2.2 + i), L = s * (.46 + .12 * hash(i + 4));
      const dir = Math.cos(a) >= 0 ? 1 : -1, droop = (.12 + .45 * Math.abs(Math.cos(a))) * L;
      const Cv = through([top, [top[0] + Math.cos(a) * L * .5, top[1] + Math.sin(a) * L * .5 - L * .18], [top[0] + Math.cos(a) * L * .9 + dir * L * .05, top[1] + Math.sin(a) * L * .9 + droop]], 5);
      const n = Cv.length, Lf = [], Rt = [];
      for (let j = 0; j < n; j++) {
        const p = Cv[j], q = Cv[Math.min(n - 1, j + 1)], r = Cv[Math.max(0, j - 1)], dx = q[0] - r[0], dy = q[1] - r[1], d = Math.hypot(dx, dy) || 1;
        const k = j / (n - 1), w = s * .085 * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (j % 2 ? 1.3 : .75);
        Lf.push([p[0] - dy / d * w, p[1] + dx / d * w]); Rt.push([p[0] + dy / d * w * .8, p[1] - dx / d * w * .8]);
      }
      paint(Lf.concat(Rt.reverse()), { wash: i % 2 ? C.leaf : mixCol(C.leaf, C.leafDk, .45), fill: C.leafDk, fillOp: 50, tex: .5, ink: PAL.ink, sw: .7 });
      inkLine(Cv, .5, C.leafDk, 'inkfine', .5);
    }
    for (const k of [-1, 1]) paint(ellPts(top[0] + k * s * .03, top[1] + s * .03, s * .035, s * .035, 10), { wash: '#7A5230', ink: PAL.ink, sw: .5 });
  }

  // A band of sea from y0 down to y1, with glints that shimmer.
  function sea(t, x0, x1, y0, y1, key = 'sea', cols = [C.seaLt, C.sea, C.seaDk]) {
    boilSeed(key);
    paint(rectPts(x0, y0, x1 - x0, y1 - y0), { wash: cols[1], ink: null });
    paint(rectPts(x0, y0, x1 - x0, (y1 - y0) * .35), { fill: cols[0], fillOp: 110, bleed: .03, tex: .4, ink: null });
    paint(rectPts(x0, y0 + (y1 - y0) * .6, x1 - x0, (y1 - y0) * .4), { fill: cols[2], fillOp: 90, bleed: .03, tex: .4, ink: null });
    for (let i = 0; i < 9; i++) {   // glints
      boilSeed(key + 'g' + i);
      const gx = lerp(x0, x1, hash(i + 1)), gy = lerp(y0, y1, .1 + .8 * hash(i + 20)), w = 30 + 40 * hash(i + 3), k = .5 + .5 * Math.sin(t * 2 + i * 1.7);
      streak(gx - w / 2, gx + w / 2, gy, 4 + 4 * k, C.foam);
    }
  }
  // Where waves meet sand: an irregular foam edge at base y that laps up and back once a bar, with 200 px of sea above it
  // (so it joins a sea band that ends within 200 px). Paint it over the sand.
  function shoreline(t, x0, x1, y, key = 'shore', amp = 18) {
    const lap = Math.sin((bpOf(t) / 4) * TAU) * amp;
    boilSeed(key);
    const P = []; for (let i = 0; i <= 16; i++) { const x = lerp(x0, x1, i / 16); P.push([x, y + lap + 8 * Math.sin(i * 1.3 + t * .8)]); }
    paint(P.concat([[x1, y - 200], [x0, y - 200]]), { wash: C.sea, ink: null });
    paint(ribbon(P, 7, 7), { wash: C.foam, washOp: 230, ink: null });
    paint(ribbon(P.map(([a, b]) => [a, b - 14]), 3, 3), { wash: C.foam, washOp: 200, ink: null });
  }

  // Volleyball at (x, y), radius r, spin rot.
  function vball(x, y, r, rot = 0, key = '') {
    boilSeed('vball' + key);
    push(); translate(x, y); rotate(rot);
    paint(ellPts(0, 0, r, r, 24), { wash: '#FFF1D6', ink: null });
    paint(ribbon([[-r * .95, -r * .2], [0, -r * .55], [r * .95, -r * .2]], r * .38, r * .38), { wash: C.ballA, ink: null });
    paint(ribbon([[-r * .8, r * .45], [0, r * .15], [r * .8, r * .45]], r * .32, r * .32), { wash: C.ballB, ink: null });
    paint(ellPts(0, 0, r, r, 24), { ink: PAL.ink, sw: clamp(r / 30, .5, 1.2) });
    paint(ellPts(-r * .35, -r * .4, r * .2, r * .12, 10, 0, -.6), { wash: PAL.cream, washOp: 200, ink: null });
    pop();
  }
  // A beach parasol: (x, y) = where the pole meets the ground, s = canopy radius, open 0..1, tilt (rad).
  function parasol(x, y, s, open = 1, tilt = 0, key = '') {
    boilSeed('parasol' + key);
    push(); translate(x, y); rotate(tilt);
    const h = s * 1.7;
    inkLine([[0, 0], [0, -h * .5], [0, -h - s * .15]], 1.4, PAL.ink, 'ink', 0);
    const k = clamp(open), wR = s * lerp(.14, 1, k), dome = s * lerp(1.1, .42, k), top = -h - s * .12;
    const n = 6, cols = [C.canopy, PAL.cream];
    for (let i = 0; i < n; i++) {
      const a0 = i / n, a1 = (i + 1) / n, xa = lerp(-wR, wR, a0), xb = lerp(-wR, wR, a1), P = [[0, top - dome * .02]];
      for (let j = 0; j <= 4; j++) { const xx = lerp(xa, xb, j / 4); P.push([xx, top + dome + Math.sin(j / 4 * Math.PI) * s * .08 * k - Math.abs(xx) / Math.max(1, wR) * dome * .15]); }
      paint(P, { wash: cols[i % 2], ink: null });
    }
    const O = [[0, top - dome * .02]]; for (let j = 0; j <= 24; j++) { const xx = lerp(-wR, wR, j / 24), jj = (j % 4) / 4; O.push([xx, top + dome + Math.sin(jj * Math.PI) * s * .08 * k - Math.abs(xx) / Math.max(1, wR) * dome * .15]); }
    paint(O, { ink: PAL.ink, sw: .9 });
    paint(ellPts(0, top - dome * .02, s * .05, s * .05, 8), { wash: PAL.ochre, ink: null });
    pop();
  }

  return { C, sun, gull, palm, sea, shoreline, vball, parasol };
})();
