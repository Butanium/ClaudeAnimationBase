// lib/imported/james-banks/octopus.js: a friendly octopus: a round mantle, six curling arms that float lazily, a face.
// Use: octopus(x, y, s, o): (x, y) = where the mantle meets the arms; s = unit (the mantle is ~3.4 s wide, ~3.8 s tall).
//   o: arms (up to six [tipX, tipY, bend] in s, relative to (x, y); a missing or null entry floats idly), skipArms (indices
//   not drawn, e.g. to draw one later in front of someone with octopus.armAt), eyes 'open' | 'happy' | 'wide' | 'wink',
//   lookX, lookY (-1..1), mouth 'smile' | 'grin' | 'o', blush 0..1, rot, sq (squash; negative stretches), col, key.
//   octopus.armAt(x, y, s, i, arm, o) draws arm i alone at the same (x, y). Arm roots run left to right, i = 0..5.
// Expects: core only; world or screen space. The idle float and the arms' ripple read the global frame time T.
// Source: imported from https://github.com/james-banks/ClaudeAnimationBase@e64e9bd (src/scenes/opus_cast.js), MIT, by
//   James Banks; Copyright (c) 2026 James Banks, MIT. Changed: one global (octoArm/octoArmAt/OCTO_BASES folded in), colour
//   as o.col instead of the film's OPAL.coral, and a boil seed per arm and for the mantle (the arms move every frame, so
//   with one seed the mantle drawn after them re-boiled every frame).
const octopus = (() => {
  const BASES = [-1.25, -.75, -.25, .25, .75, 1.25];
  const idle = i => { const ph = T * 2.2 + i * 1.1; return [BASES[i] * 1.9 + Math.sin(ph) * .5, 2.2 + Math.cos(ph * .8) * .4, Math.sin(ph + 1) * .6]; };
  const cols = c => ({ C: c, Cd: mixCol(c, PAL.ink, .35), Cl: mixCol(c, PAL.cream, .45) });

  // one arm in the octopus's local space; arm = [tipX, tipY, bend] in s
  function arm(s, i, a, sw, col) {
    const { C, Cd, Cl } = cols(col);
    const [tx, ty, bend] = a, b = [BASES[i] * s, -.1 * s], p = [tx * s, ty * s];
    const dx = p[0] - b[0], dy = p[1] - b[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    const P = []; for (let k = 0; k <= 7; k++) { const q = k / 7, w = Math.sin(q * Math.PI) * bend * s + Math.sin(T * 5 + i + q * 4) * .12 * s * q; P.push([b[0] + dx * q + nx * w, b[1] + dy * q + ny * w]); }
    const cu = P[7], pe = P[6]; P.push([cu[0] + (cu[0] - pe[0]) * .35 + nx * .35 * s, cu[1] + (cu[1] - pe[1]) * .35 + ny * .35 * s]);   // curled tip
    paint(ribbon(P, .78 * s, .14 * s), { wash: i === 2 || i === 3 ? C : mixCol(C, Cd, .25), ink: PAL.ink, sw: sw * .8 });
    for (let k = 1; k < 6; k++) { const q = P[k + 1]; paint(ellPts(q[0] - nx * .2 * s, q[1] - ny * .2 * s, .1 * s, .08 * s, 8), { wash: Cl, ink: null }); }
  }

  function octopus(x, y, s, o = {}) {
    const key = 'octo ' + (o.key || 0), col = o.col || '#EE7C86', { C, Cl } = cols(col), sw = clamp(s / 26, .4, 1.4), sq = o.sq || 0;
    push(); translate(x, y); if (o.rot) rotate(o.rot); scale(1 + sq * .4, 1 - sq);
    for (const i of [0, 5, 1, 4, 2, 3]) if (!(o.skipArms || []).includes(i)) { boilSeed(key + ' arm' + i); arm(s, i, (o.arms && o.arms[i]) || idle(i), sw, col); }
    boilSeed(key + ' body');
    const M = []; for (let i = 0; i <= 26; i++) { const a = Math.PI + i / 26 * Math.PI; M.push([Math.cos(a) * 1.75 * s, -.2 * s + Math.sin(a) * 3.7 * s * (.8 + .2 * Math.abs(Math.cos(a)))]); }
    M.push([1.6 * s, .35 * s], [-1.6 * s, .35 * s]);
    paint(M, { wash: C, fill: Cl, fillOp: 60, bleed: .08, tex: .5, ink: PAL.ink, sw, curv: .35 });
    for (const [sx, sy, r] of [[-.9, -2.6, .22], [.6, -3.2, .16], [1.1, -2.2, .12], [-.3, -3.5, .12]]) paint(ellPts(sx * s, sy * s, r * s, r * .8 * s, 8), { wash: Cl, ink: null });
    const e = o.eyes || 'open', lx = (o.lookX || 0) * .16 * s, ly = (o.lookY || 0) * .12 * s;
    for (const sd of [-1, 1]) {
      const ex = sd * .72 * s, ey = -1.45 * s, kind = e === 'wink' && sd > 0 ? 'happy' : e;
      if (kind === 'happy') { inkLine([[ex - .4 * s, ey + .12 * s], [ex, ey - .25 * s], [ex + .4 * s, ey + .12 * s]], sw * 1.1, PAL.ink, 'ink', .4); continue; }
      const w = kind === 'wide' ? 1.25 : 1;
      paint(ellPts(ex, ey, .46 * s * w, .56 * s * w, 16), { wash: PAL.cream, ink: PAL.ink, sw: sw * .6 });
      paint(ellPts(ex + lx, ey + ly + .08 * s, .22 * s, .3 * s, 12), { wash: PAL.ink, ink: null });
      paint(ellPts(ex + lx - .08 * s, ey + ly - .04 * s, .07 * s, .08 * s, 6), { wash: PAL.cream, ink: null });
    }
    if (o.blush) for (const sd of [-1, 1]) paint(ellPts(sd * 1.2 * s, -.75 * s, .3 * s, .15 * s, 10), { fill: '#D8394E', fillOp: 140 * o.blush, ink: null });
    const m = o.mouth || 'smile';
    if (m === 'smile') inkLine([[-.35 * s, -.6 * s], [0, -.38 * s], [.35 * s, -.6 * s]], sw * .9, PAL.ink, 'ink', .5);
    else if (m === 'grin') paint([[-.55 * s, -.66 * s], [.55 * s, -.66 * s], [.3 * s, -.28 * s], [-.3 * s, -.28 * s]], { wash: '#4A1F2A', ink: PAL.ink, sw: sw * .6, curv: .4 });
    else if (m === 'o') paint(ellPts(0, -.5 * s, .22 * s, .26 * s, 10), { wash: '#4A1F2A', ink: PAL.ink, sw: sw * .5 });
    pop();
  }
  // one arm drawn apart from the body (e.g. wrapping in front of someone), at the octopus's (x, y)
  octopus.armAt = (x, y, s, i, a, o = {}) => {
    boilSeed('octo ' + (o.key || 0) + ' arm' + i + ' apart');
    push(); translate(x, y); arm(s, i, a || idle(i), clamp(s / 26, .4, 1.4), o.col || '#EE7C86'); pop();
  };
  return octopus;
})();
