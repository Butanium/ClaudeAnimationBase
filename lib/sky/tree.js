// lib/sky/tree.js: a painted tree in six kinds, with seeded variety, swaying on the beat (the trunk bends, the crown
// follows a moment later, hanging parts last).
// Use: Tree.draw(t, x, y, o) with (x, y) the foot of the trunk on the ground.
//      o: kind ('oak' | 'fir' | 'birch' | 'willow' | 'blossom' | 'bare', default 'oak'), h (height in px, default 420),
//        seed (shape variety: crown puffs, lean, branches, tiers), wind (sway, default 1; 0 = still), lean (rest lean,
//        −.3..3, default seeded), col / trunk (colours), light (DaySky.light(tod): darkens it at night) or dim / night,
//        petals (blossom: falling petals, default true), key (boil key, default from x and kind).
//      Tree.sway(t, x, o) → the sway value (−1..1-ish) that tree bends by, to move something with it (a swing, a bird).
// Expects: nothing beyond core. World space (under a camera or not); for a far row, draw it inside Parallax.begin(d).
// Source: made for the asset library, 2026-09-25, by painter-skies (Claude).
const Tree = (() => {
  const KIND = {
    oak:     { leaf: '#5E9A55', trunk: '#8A6243', puffs: 7, w: .78, crown: .58 },
    blossom: { leaf: '#F2A9BD', trunk: '#8A5A4A', puffs: 6, w: .72, crown: .55 },
    birch:   { leaf: '#9CC06A', trunk: '#EFE6D4', puffs: 4, w: .46, crown: .5 },
    willow:  { leaf: '#86AE5E', trunk: '#7C5E45', puffs: 5, w: .9, crown: .45 },
    fir:     { leaf: '#3F7659', trunk: '#6E4E38' },
    bare:    { trunk: '#7A6152' },
  };
  // Sway locked to the beat: a slow lean that rolls once a bar, a smaller one on top, offset by the tree's position so
  // a row of trees doesn't sway in unison (the gust travels along it).
  function sway(t, x = 0, o = {}) {
    const bp = bpOf(t) - x / 900, w = o.wind ?? 1;
    return w * (.55 * Math.sin(bp * Math.PI / 2) + .25 * Math.sin(bp * Math.PI * 1.1 + 1.3) + .2 * Math.sin(bp * Math.PI / 2 - .6) * pulse(t - x / 2000, 2.5));
  }

  // The outline of a union of circles, seen from (cx, cy): for each direction the farthest circle edge. One outline.
  function blob(C, cx, cy, n = 84) {
    const P = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, ux = Math.cos(a), uy = Math.sin(a);
      let best = 0;
      for (const c of C) {
        const dx = c.x - cx, dy = c.y - cy, b = ux * dx + uy * dy, disc = b * b - (dx * dx + dy * dy - c.r * c.r);
        if (disc >= 0) best = Math.max(best, b + Math.sqrt(disc));
      }
      P.push([cx + ux * best, cy + uy * best]);
    }
    return P;
  }
  // The part of a closed outline below y = cut (a wavy line), closed along the cut: the shaded underside, inside it.
  function below(P, cut, amp, seed) {
    const n = P.length, inside = P.map(p => p[1] > cut(p[0]));
    let s = inside.findIndex((v, i) => v && !inside[(i - 1 + n) % n]);
    if (s < 0) return null;
    const out = [];
    for (let k = 0; k < n && inside[(s + k) % n]; k++) out.push(P[(s + k) % n]);
    if (out.length < 3) return null;
    const a = out[out.length - 1], b = out[0];
    for (let k = 1; k < 6; k++) { const x = lerp(a[0], b[0], k / 6); out.push([x, cut(x) - amp * Math.sin(k / 6 * Math.PI) + amp * .3 * Math.sin(k * 2.1 + seed)]); }
    return out;
  }

  // trunk centre line from the foot (0, 0) up to height hh, bent by b (px at the top) and the rest lean
  const spine = (hh, b, lean, n = 6) => { const P = []; for (let i = 0; i <= n; i++) { const f = i / n; P.push([(lean * f + b * f * f), -hh * f]); } return P; };
  const along = (P, f) => { const i = f * (P.length - 1), k = Math.floor(i), q = Math.min(P.length - 1, k + 1), u = i - k; return [lerp(P[k][0], P[q][0], u), lerp(P[k][1], P[q][1], u)]; };

  function draw(t, x, y, o = {}) {
    const kind = o.kind || 'oak', K = KIND[kind] || KIND.oak, H = o.h ?? 420, sd = (o.seed ?? 0) * 7.13 + 1, key = o.key ?? 'tree ' + kind + ' ' + Math.round(x);
    const L = o.light || {}, dim = o.dim ?? L.dim ?? 0, night = o.night ?? L.zen ?? PAL.night;
    const tone = c => mixCol(c, night, .6 * dim), leaf = tone(o.col || K.leaf || '#5E9A55'), bark = tone(o.trunk || K.trunk);
    const sw = clamp(H / 420, .6, 1.2) * (CAM ? Math.min(1, 1.6 / CAM.zoom) : 1);
    const lean = (o.lean ?? (hash(sd * 3.1) - .5) * .12) * H;
    const sv = sway(t, x, o), sLag = sway(t - .12, x, o), sLag2 = sway(t - .26, x, o);
    const bend = sv * H * .035;
    push(); translate(x, y);
    boilSeed(key + ' trunk');

    if (kind === 'fir') {
      const tiers = 4 + Math.floor(hash(sd) * 2), stub = H * .1, P = [], Q = [];
      const cx = f => lean * f + (sLag * H * .045) * f * f;
      P.push([cx(1), -H]);
      for (let k = 0; k < tiers; k++) {   // each tier: a drooping tip out, a notch back in; tips flutter a little later
        const f0 = 1 - (k + 1) / tiers * .9, wT = H * (.1 + .3 * (k + 1) / tiers) * (.9 + .2 * hash(sd + k)), yT = -stub - (H - stub) * f0;
        const fl = sLag2 * H * .012 * (k + 1) / tiers;
        P.push([cx(f0) + wT + fl, yT + wT * .12]);
        if (k < tiers - 1) P.push([cx(f0) + wT * .45, yT - H * .02]);
        Q.push([cx(f0) - wT + fl, yT + wT * .12]);
        if (k < tiers - 1) Q.push([cx(f0) - wT * .45, yT - H * .02]);
      }
      const O = P.concat([[cx(.06) + H * .04, -stub]], [[cx(.06) - H * .04, -stub]], Q.reverse());
      paint(rectPts(-H * .035, -stub * 1.3, H * .07, stub * 1.3, 1), { wash: bark, ink: PAL.ink, sw: .8 * sw });
      boilSeed(key + ' crown');
      paint(O, { wash: leaf, ink: null });
      // shade: the right half of the fir, from the tip down the centre
      const S = [[cx(1), -H]].concat(P.slice(1), [[cx(.06) + H * .04, -stub], [cx(.06), -stub]]);
      for (let i = 10; i >= 0; i--) S.push([cx(i / 10) , -stub - (H - stub) * i / 10 * .95]);
      paint(S, { wash: mixCol(leaf, mixCol(PAL.teal, PAL.ink, .6), .3), ink: null });
      paint(O, { ink: PAL.ink, sw: sw });
      pop(); boilSeed(key + ' after'); return;
    }

    if (kind === 'bare') {
      // a trunk that forks into branches, each forking again, all bending with the wind (tips most)
      const lines = [];
      const grow = (x0, y0, ang, len, w, depth, id) => {
        const bx = x0 + Math.cos(ang) * len, by = y0 + Math.sin(ang) * len, fy = clamp(-by / H);
        const tipX = bx + bend * fy * fy * 1.2 + sLag2 * H * .01 * depth;
        lines.push({ P: [[x0, y0], [lerp(x0, tipX, .55) + (hash(id * 3.3 + sd) - .5) * len * .2, lerp(y0, by, .55)], [tipX, by]], w0: w, w1: w * .6 });
        if (depth >= 3) return;
        const n = depth === 0 ? 3 : 2;
        for (let j = 0; j < n; j++) {
          const spread = (j - (n - 1) / 2) * (.75 - depth * .08) + (hash(id * 7 + j + sd) - .5) * .35;
          grow(tipX, by, ang + spread, len * (.62 + .15 * hash(id * 5 + j + sd)), w * .6, depth + 1, id * 3 + j + 1);
        }
      };
      grow(0, 0, -Math.PI / 2 + lean / H * 1.5, H * .38, H * .07, 0, 1);
      lines.forEach((b, i) => { boilSeed(key + ' br' + i); paint(ribbon(b.P, b.w0, b.w1), { wash: bark, ink: PAL.ink, sw: sw * (i ? .6 : .9) }); });
      pop(); boilSeed(key + ' after'); return;
    }

    // leafy kinds: a trunk with a couple of branches up into a crown of puffs
    const trunkH = H * (1 - K.crown * .72), T = spine(trunkH, bend * .7, lean * (trunkH / H));
    const top = T[T.length - 1], cR = H * K.crown * .5, cx0 = top[0] + sLag * H * .045, cy0 = top[1] - cR * .55;
    const C = [];
    for (let j = 0; j < K.puffs; j++) {   // puffs around the crown's centre, seeded
      const a = -Math.PI / 2 + (j / K.puffs - .5) * (kind === 'willow' ? 3.4 : 5.4) + (hash(sd + j * 1.7) - .5) * .5;
      const d = cR * (.42 + .25 * hash(sd + j * 2.3)), r = cR * (.42 + .22 * hash(sd + j * 3.9));
      C.push({ x: cx0 + Math.cos(a) * d * K.w / .6, y: cy0 + Math.sin(a) * d * .8, r });
    }
    C.push({ x: cx0, y: cy0, r: cR * .62 });
    const wT = H * (kind === 'birch' ? .045 : kind === 'willow' ? .1 : .075);
    // branches reaching into the crown, painted with the trunk as ribbons
    const br = [];
    for (let j = 0; j < (kind === 'birch' ? 2 : 3); j++) {
      const f = .62 + .12 * j, p0 = along(T, f), c = C[Math.floor(hash(sd + j * 4.4) * K.puffs)];
      br.push(ribbon([p0, [lerp(p0[0], c.x, .5), lerp(p0[1], c.y, .6)], [c.x, c.y + c.r * .3]], wT * .45, wT * .18));
    }
    if (kind === 'willow') {   // hanging strands behind the crown, their tips dragging behind the sway
      const n = 10;
      for (let j = 0; j < n; j++) {
        const u = j / (n - 1), sx = cx0 + (u - .5) * cR * K.w * 3, sy = cy0 + cR * .1 - Math.sin(u * Math.PI) * cR * .45;
        const len = H * (.34 + .16 * hash(sd + j * 5.1)), dr = sLag2 * H * .06, ph = Math.sin(t * 2.1 + j * 1.3) * H * .006;
        const S = [[sx, sy], [sx + dr * .3 + (u - .5) * cR * .3, sy + len * .45], [sx + dr + ph + (u - .5) * cR * .4, sy + len]];
        boilSeed(key + ' strand' + j);
        paint(ribbon(S, H * .06, H * .02), { wash: mixCol(leaf, PAL.ink, j % 2 ? .14 : .04), ink: mixCol(leaf, PAL.ink, .7), sw: .6 * sw });
      }
    }
    boilSeed(key + ' trunk');
    br.forEach(B => paint(B, { wash: bark, ink: PAL.ink, sw: .7 * sw }));   // branches first: the trunk covers their roots
    paint(ribbon(T, wT * 1.25, wT * .7), { wash: bark, ink: PAL.ink, sw: .9 * sw });
    if (kind === 'birch') for (let j = 0; j < 7; j++) {   // birch bark marks
      const f = .08 + j * .11 + hash(sd + j) * .05, [px, py] = along(T, f), side = hash(sd + j * 2) < .5 ? -1 : 1;
      inkLine([[px + side * wT * .6, py], [px + side * wT * .05, py + 3 + hash(j) * 3]], 1.1 * sw, PAL.ink, 'ink', .2);
    }
    // the crown
    boilSeed(key + ' crown');
    const B = blob(C, cx0, cy0);
    paint(B, { wash: leaf, ink: null });
    const sh = below(B, xx => cy0 + cR * .15 + cR * .08 * Math.sin(xx / cR * 3 + sd), cR * .12, sd);
    if (sh) paint(sh, { wash: mixCol(leaf, mixCol(PAL.teal, PAL.ink, .55), .28), ink: null });
    const lit = mixCol(leaf, '#FFF3D0', .28 * (1 - dim));
    C.slice(0, K.puffs).forEach((c, j) => {   // lit puffs on the upper left, where the light comes from
      if (c.y > cy0 + cR * .1 || c.x > cx0 + cR * .4) return;
      paint(ellPts(c.x - c.r * .2, c.y - c.r * .25, c.r * .5, c.r * .38, 14, 1), { wash: lit, ink: null });
    });
    paint(B, { ink: PAL.ink, sw: sw });
    for (let j = 0; j < 5; j++) {   // leaf-clump marks: little arcs inside the crown
      const c = C[j % C.length], ax = c.x + (hash(sd + j * 6.1) - .5) * c.r, ay = c.y + (hash(sd + j * 7.3) - .1) * c.r * .6, r = cR * .12;
      inkLine([[ax - r, ay - r * .2], [ax, ay + r * .35], [ax + r, ay - r * .2]], .6 * sw, mixCol(leaf, PAL.ink, .5), 'inkfine', .6);
    }
    if (kind === 'blossom' && o.petals !== false) {   // petals drifting down and away with the wind, on a loop
      for (let j = 0; j < 7; j++) {
        const per = 2.6 + hash(sd + j) * 1.4, ph = frac(t / per + hash(sd + j * 3)), sx = cx0 + (hash(sd + j * 5) - .5) * cR * 2;
        const px = sx + ph * H * .35 * (.4 + (o.wind ?? 1)) + Math.sin(ph * 9 + j) * H * .03, py = cy0 + cR * .3 + ph * (H - trunkH * .2 - cR * .3) * .9;
        boilSeed(key + ' petal' + j);
        paint(ellPts(px, py, H * .011, H * .007, 8, 0, ph * 8 + j), { wash: mixCol(leaf, '#FFF1F2', .35), ink: null });
      }
    }
    pop();
    boilSeed(key + ' after');
  }
  return { draw, sway };
})();
