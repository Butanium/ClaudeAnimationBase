// lib/sky/daysky.js: a painted sky whose whole look runs night → dawn → day → dusk → night from one number.
// Use: DaySky.draw(t, tod, o) paints the sky; tod is the time of day, 0..1 on a clock (0 = midnight, .25 = dawn,
//        .5 = noon, .75 = dusk, 1 = midnight again), or a name: 'night' | 'dawn' | 'day' | 'dusk'. Animate tod for a
//        colour arc (e.g. kf(lt, [[0, .12], [6, .3]]) is cold night → warm dawn).
//      o: horizon (y, default 700), depth (parallax factor, default .08: 0 = fixed to the screen, 1 = moves with the
//        world), sun / moon (false to hide), moonPhase (0..1, default .3 = crescent; 1 = full), arc ({cx, rx, ry}: the
//        path the sun and moon ride, default {960, 820, 560}), stars (count per 2400 px tile, default 70), clouds
//        (count per 3000 px tile, default 5, 0 for none), wind (cloud drift, px/s, default 14), cloudY ([top, bottom]
//        band above the horizon, default [470, 190]), cloudScale (1), seed.
//      DaySky.light(tod) → {zen, mid, hor, cloud, cloudDk, sun, starK, dayK, dim, warm}: the palette at that time,
//        for tinting whatever stands under the sky (pass it to Landscape.draw as {light}).
//      DaySky.sunAt(tod, o) / DaySky.moonAt(tod, o) → [x, y, up] in the sky layer's coordinates (up = elevation
//        -1..1); Parallax.map(o.depth ?? .08, x, y) gives the world point.
// Expects: lib/sky/parallax.js. World space under camBegin, with its own parallax (or no camera).
// Source: made for the asset library, 2026-09-25, by painter-skies (Claude).
const DaySky = (() => {
  const NAMED = { night: 0, dawn: .26, day: .5, noon: .5, dusk: .74 };
  const todOf = tod => typeof tod === 'string' ? NAMED[tod] ?? .5 : frac(tod);
  // The palette at key times of day, cycled: [tod, zenith, middle, horizon, cloud, cloud shadow, sun].
  const KEYS = [
    [0,    '#141A44', '#1E275C', '#33397A', '#2D3468', '#20264F', '#F4E3B2'],
    [.17,  '#1A2150', '#2E3470', '#6B4E86', '#3C3A70', '#2A2A58', '#F6A870'],
    [.235, '#3D4C8E', '#8E6E9E', '#F09A7A', '#E7A2A0', '#9C6E92', '#F7874F'],
    [.3,   '#6A98CF', '#AFC6DD', '#F6D6B0', '#FBE3CF', '#C7A9B6', '#FDC274'],
    [.4,   '#6CA6DA', '#9FCBE8', '#DDEDE8', '#FFF6E6', '#C3D2E2', '#FFE7A4'],
    [.6,   '#6CA6DA', '#9FCBE8', '#E3EEE2', '#FFF6E6', '#C3D2E2', '#FFE7A4'],
    [.7,   '#6E97CC', '#B6C3D6', '#F4CF9A', '#FBE0C4', '#C8A2A8', '#FDB765'],
    [.765, '#4D4486', '#B86A8C', '#F2884F', '#EE9178', '#8A5682', '#F2703F'],
    [.83,  '#222859', '#4B3A74', '#9A527A', '#4A3A6E', '#30295A', '#E8784E'],
    [1,    '#141A44', '#1E275C', '#33397A', '#2D3468', '#20264F', '#F4E3B2'],
  ];
  function light(tod) {
    const x = todOf(tod);
    let i = 1; while (i < KEYS.length - 1 && x > KEYS[i][0]) i++;
    const a = KEYS[i - 1], b = KEYS[i], k = ease((x - a[0]) / (b[0] - a[0]));
    const [zen, mid, hor, cloud, cloudDk, sun] = [1, 2, 3, 4, 5, 6].map(j => mixCol(a[j], b[j], k));
    const starK = 1 - ease(seg(x, .17, .27)) + ease(seg(x, .76, .86));
    const dayK = ease(seg(x, .22, .34)) - ease(seg(x, .68, .8));
    const warm = Math.max(Math.exp(-(((x - .25) / .05) ** 2)), Math.exp(-(((x - .76) / .05) ** 2)));
    return { zen, mid, hor, cloud, cloudDk, sun, starK: clamp(starK), dayK: clamp(dayK), dim: clamp(1 - dayK - .35 * warm), warm };
  }
  // Colour of the sky at height g above the horizon (0 = horizon, 1 = zenith).
  const skyCol = (L, g) => g < .45 ? mixCol(L.hor, L.mid, ease(g / .45)) : mixCol(L.mid, L.zen, ease((g - .45) / .55));

  const ARC = { cx: 960, rx: 820, ry: 560 };
  // Sun and moon ride the same arc: they rise at the left end (east), peak, set at the right end.
  function bodyAt(th, o = {}) {
    const A = { ...ARC, ...(o.arc || {}) }, hz = o.horizon ?? 700;
    return [A.cx - Math.cos(th) * A.rx, hz - Math.sin(th) * A.ry, Math.sin(th)];
  }
  const sunAt = (tod, o) => bodyAt((todOf(tod) - .25) / .5 * Math.PI, o);
  const moonAt = (tod, o) => bodyAt((frac(todOf(tod) + .5) - .25) / .5 * Math.PI, o);

  // One wavy horizontal band of wash from y0 down to y1, across [x0, x1].
  function band(x0, x1, y0, y1, col, bi, amp) {
    boilSeed('skyband' + bi);
    const st = 120, a = Math.floor(x0 / st), b = Math.ceil(x1 / st), top = [], s = hash(bi * 7.3 + 1);
    for (let i = a; i <= b; i++) {   // sampled at fixed world x, so a panning camera doesn't make the edge crawl
      const x = i * st;
      top.push([x, y0 + amp * (.65 * Math.sin(x / 230 + s * 6) + .35 * Math.sin(x / 97 + s * 17)) + jit(amp * .12)]);
    }
    const bot = [[b * st, y1], [(a + b) / 2 * st, y1], [a * st, y1]];
    paint(top.concat(bot), { wash: col, ink: null });
  }

  // A cumulus as one outline: the upper envelope of a row of round puffs (middle ones highest) over a flat base.
  function cloudPts(cx, cy, w, h, seed, breathe) {
    const nb = 3 + Math.floor(hash(seed) * 3), B = [];
    const R = j => { const u = j / (nb - 1), mid = 1 - Math.abs(u - .5) * 2; return h * (.3 + .32 * mid + .14 * hash(seed + j * 3.7)) * (1 + .04 * Math.sin(breathe + j * 1.9)); };
    const r0 = R(0), rN = R(nb - 1);
    for (let j = 0; j < nb; j++) {
      const u = j / (nb - 1), mid = 1 - Math.abs(u - .5) * 2, r = R(j);
      B.push({ x: lerp(cx - w / 2 + r0, cx + w / 2 - rN, u), y: cy - r * (.2 + .45 * mid), r });
    }
    const P = [];
    B.forEach((b, j) => {
      const a0 = j === 0 ? Math.PI * .55 : Math.PI, a1 = j === nb - 1 ? Math.PI * 2.45 : Math.PI * 2, n = 14;
      for (let k = 0; k <= n; k++) {
        const a = lerp(a0, a1, k / n), x = b.x + Math.cos(a) * b.r, y = b.y + Math.sin(a) * b.r;
        if (y > cy || B.some((o, m) => m !== j && Math.hypot(x - o.x, y - o.y) < o.r * .99)) continue;
        P.push([x, y]);
      }
    });
    const L = P[0][0], Rt = P[P.length - 1][0];
    for (let k = 0; k <= 6; k++) P.push([lerp(Rt, L, k / 6), cy + h * .04 * Math.sin(k / 6 * Math.PI)]);
    return { P, L, R: Rt };
  }
  function cloud(t, cx, cy, w, h, seed, Lt, sw) {
    boilSeed('cloud' + seed);
    const { P, L, R } = cloudPts(cx, cy, w, h, seed, bpOf(t) * Math.PI * .5 + seed);
    paint(P, { wash: Lt.cloud, ink: null });
    // the shaded underside, inside the silhouette
    const S = []; for (let k = 0; k <= 8; k++) S.push([lerp(L + h * .3, R - h * .3, k / 8), cy - h * (.14 + .05 * Math.sin(k * 1.7 + seed))]);
    for (let k = 8; k >= 0; k--) S.push([lerp(L + h * .18, R - h * .18, k / 8), cy - h * .015]);
    paint(S, { wash: mixCol(Lt.cloud, Lt.cloudDk, .55), ink: null, curv: .5 });
    paint(P, { ink: mixCol(Lt.cloudDk, PAL.ink, .35), sw: sw * .8 });
  }

  function moonShape(x, y, r, phase, tilt) {
    const c = 1 - 2 * clamp(phase, .08, 1), P = [];
    for (let k = 0; k <= 14; k++) { const a = -Math.PI / 2 + k / 14 * Math.PI; P.push([Math.cos(a) * r, Math.sin(a) * r]); }
    for (let k = 1; k < 14; k++) { const a = Math.PI / 2 - k / 14 * Math.PI; P.push([c * Math.cos(a) * r, Math.sin(a) * r]); }
    const cs = Math.cos(tilt), sn = Math.sin(tilt);
    return P.map(([px, py]) => [x + px * cs - py * sn, y + px * sn + py * cs]);
  }

  function draw(t, tod, o = {}) {
    const x = todOf(tod), Lt = light(x), hz = o.horizon ?? 700, d = o.depth ?? .08, seed = o.seed ?? 0;
    const V = Parallax.begin(d), sw = Math.min(1, 1.6 / V.zd), top = Math.min(V.y0, hz - 900) - 40;
    const x0 = V.x0 - 60, x1 = V.x1 + 60, y1 = Math.max(V.y1, hz) + 60;

    // the graded wash: bands from the zenith down to the horizon, closer together near the horizon
    const NB = 14;
    for (let i = 0; i < NB; i++) {
      const g = 1 - (i + .3 * (hash(i * 3.9) - .5)) / (NB - 1), yb = hz - 900 * Math.pow(clamp(g), 1.35);
      band(x0, x1, i === 0 ? top : yb, y1, skyCol(Lt, clamp(g)), i, i === 0 ? 0 : (6 + 14 * g) * (.6 + .8 * hash(i * 5.3)));
    }
    // a few soft blooms of pigment, so the wash isn't only stripes
    for (let tile = Math.floor(x0 / 1400); tile * 1400 < x1; tile++) for (let i = 0; i < 3; i++) {
      const id = tile * 7 + i, bx = tile * 1400 + hash(id * 1.9 + 2) * 1400, g = .15 + .7 * hash(id * 2.3 + 4), by = hz - 900 * g;
      boilSeed('bloom' + id);
      paint(ellPts(bx, by, 220 + 160 * hash(id), 60 + 40 * hash(id + 1), 18, 6), { fill: skyCol(Lt, clamp(g + (hash(id * 4.1) > .5 ? .18 : -.18))), fillOp: 60, bleed: .18, tex: .7, border: .5, ink: null });
    }

    // stars: a field that tiles every 2400 px, twinkling on the beat, fading in as night falls
    const nStars = o.stars ?? 70;
    if (Lt.starK > .01 && nStars > 0) {
      const P = 2400, bn = beatN(t);
      for (let tile = Math.floor(x0 / P); tile * P < x1; tile++) for (let i = 0; i < nStars; i++) {
        const id = i + seed * 97, sx = tile * P + hash(id * 1.31 + 3) * P, g = .25 + .75 * Math.sqrt(hash(id * 2.17 + 5)), sy = hz - 900 * g;
        if (sx < x0 || sx > x1 || sy < top) continue;
        const vis = clamp((Lt.starK - hash(id * 5.1) * .6) / .4);   // the brightest come out first
        if (vis <= .01) continue;
        boilSeed('star' + tile + ' ' + i);
        const big = hash(id * 3.3) > .82, flash = hash(bn * 7.7 + id) < .12 ? pulse(t, 4) : 0;
        const tw = .7 + .3 * Math.sin(t * (1.3 + hash(id) * 1.5) * TAU / 2 + id);
        const r = (big ? 12 : 4.5 + 3.5 * hash(id * 4.4)) * vis * (tw + .7 * flash);
        paint(starPts(sx, sy, r, big ? .32 : .42, 4, hash(id) * .4), { wash: mixCol(skyCol(Lt, g), '#FFF3D6', .5 + .5 * vis), ink: null });
        if (big || flash > .3) glow(sx, sy, r * (4 + 5 * flash), '#FFE9B8', .45 * vis + .5 * flash);
      }
    }

    // the moon, the sun
    if (o.moon !== false) {
      const [mx, my, up] = moonAt(x, o), k = clamp(up * 4);
      if (k > 0) {
        boilSeed('moon');
        const r = 60 * (o.moonScale ?? 1), phase = o.moonPhase ?? .3;
        glow(mx, my, r * 3.2 * (1 + .05 * pulse(t, 3)), '#E9E4FF', .55 * k * (1 - Lt.dayK));
        paint(moonShape(mx, my, r, phase, -.45), { wash: mixCol(Lt.mid, '#FFF1CF', .55 + .45 * k), ink: mixCol(PAL.ink, Lt.zen, .3), sw: .8 * sw, curv: .4 });
      }
    }
    if (o.sun !== false) {
      const [sx, sy, up] = sunAt(x, o);
      const pre = clamp(1 + up * 6);                        // the glow rises before the sun does
      if (pre > 0) {
        boilSeed('sun');
        const low = 1 - clamp(up * 2.5), r = 58 * (o.sunScale ?? 1) * (1 + .1 * low) * (1 + .025 * pulse(t, 5));
        glow(sx, Math.min(sy, hz + 20), r * (5 + 4 * low), Lt.sun, (.5 + .6 * low) * pre);
        if (up > -.15) {
          glow(sx, sy, r * 2.2, '#FFF0C8', .5 * (1 - low) + .2);
          paint(ellPts(sx, sy, r, r, 30, 1.2), { wash: mixCol(Lt.sun, '#FFF4D8', .45 * (1 - low)), ink: mixCol(PAL.ink, Lt.sun, .45), sw: .8 * sw });
        }
      }
    }

    // clouds: a field that tiles every 3000 px and drifts with the wind
    const nCl = o.clouds ?? 5, wind = o.wind ?? 14, cs = o.cloudScale ?? 1, [cyTop, cyBot] = o.cloudY ?? [470, 190];
    if (nCl > 0) {
      const P = 3000;
      for (let i = 0; i < nCl; i++) {
        const id = i + seed * 31, w = (170 + 200 * hash(id * 1.7 + 11)) * cs, h = w * (.36 + .1 * hash(id * 2.9));
        const cy = hz - lerp(cyBot, cyTop, hash(id * 4.3 + 1)), sp = wind * (.7 + .6 * hash(id * 6.1));
        const cx0 = ((hash(id * 3.1 + 7) * P + sp * t) % P + P) % P;
        for (let tile = Math.floor((x0 - w) / P) - 1; tile * P < x1 + w; tile++) {
          const cx = cx0 + tile * P;
          if (cx + w / 2 < x0 || cx - w / 2 > x1) continue;
          cloud(t, cx, cy, w, h, id * 13 + tile * 1000, Lt, sw);
        }
      }
    }
    Parallax.end();
    boilSeed('after sky');
  }

  return { draw, light, sunAt, moonAt, skyCol };
})();
