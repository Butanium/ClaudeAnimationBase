// lib/weather/smoke.js: steam curling up from a mug or a pot, and a smoke plume from a chimney or a campfire.
// Use: smoke.steam(t, x, y, o)  wisps rising from (x, y) (a rim's middle): o: n (3 wisps), h (height, 130·size), w (rim
//                                width, 50·size), size, wind (dx per px risen, or t => it), col, ink (null: none), key.
//      smoke.plume(t, x, y, o)  puffs leaving (x, y) (a chimney top) every o.every s, rising, swelling, bending with the
//                                wind and melting away, painted as one cloud with one outline (dust.cloud): o: size, rate
//                                (px/s up, 90·size), life (2.6 s), wind (px/s sideways, or t => it), col / shade / ink, key.
// Expects: lib/weather/dust.js (for the plume). World space.
//   Steam: 1 paint per wisp. Plume: ~10 puffs × 3 paints.
// Source: made for the asset library, 2026-09-25, by painter-weather (Claude).
const smoke = (() => {
  const val = (v, t, d) => typeof v === 'function' ? v(t) : v ?? d;

  // Each wisp is one tapered ribbon: a stretch of a rising, swaying column. Its head climbs from the rim, its tail
  // leaves the rim a little later, and the whole wisp thins out as it climbs, then the next one follows.
  function steam(t, x, y, o = {}) {
    const s = o.size ?? 1, n = o.n ?? 3, Hh = o.h ?? 130 * s, Wr = o.w ?? 50 * s, P = o.period ?? 1.9, key = o.key ?? 'steam ' + x + ' ' + y;
    const col = o.col ?? '#F7F1E7', ink = o.ink === undefined ? mixCol(PAL.ink, '#9C94A6', .5) : o.ink, zf = CAM ? Math.min(1, 1.6 / CAM.zoom) : 1;
    for (let j = 0; j < n; j++) {
      const ph = j / n + .13 * hash(j + x * .01), c = t / P + ph, u = frac(c), cyc = Math.floor(c), h = hash(j * 7.1 + cyc * 3.3 + x * .01);
      const head = Hh * easeOut(clamp(u / .75)), tail = Hh * easeIn(clamp((u - .2) / .8)) * .9;
      if (head - tail < 6 * s) continue;
      const x0 = x + (j - (n - 1) / 2) / Math.max(1, n - 1) * Wr * .6 + (h - .5) * Wr * .2, wind = val(o.wind, t, 0), pts = [];
      for (let i = 0; i <= 8; i++) {
        const hh = lerp(tail, head, i / 8), k = hh / Hh;
        pts.push([x0 + Math.sin(hh / (26 * s) - t * 3.2 + j * 2.1 + h * 3) * (5 + 16 * k) * s + wind * hh, y - hh]);
      }
      const w = 9 * s * (1 - .75 * u);   // thick when young, thinning as it climbs
      boilSeed(key + ' ' + j);
      paint(ribbon(pts, w, w * .15), { wash: col, ink: ink && u < .8 ? ink : null, sw: .45 * zf * (1 - u * .6) });
    }
  }

  function plume(t, x, y, o = {}) {
    const s = o.size ?? 1, dt = o.every ?? .26, life = o.life ?? 2.6, rise = o.rate ?? 90 * s, key = o.key ?? 'plume ' + x + ' ' + y;
    const P = [];
    for (let k = Math.floor((t - life) / dt) + 1; k <= Math.floor(t / dt); k++) {
      const ts = k * dt, a = t - ts, q = a / life, h = hash(k * 3.71 + x * .013);
      // it drifts with the wind that was blowing along the way (integrated in closed form for a constant wind; a changing
      // wind bends the whole plume at once, which reads as a gust)
      const wind = val(o.wind, t, 25 * s), bob = Math.sin(a * 2.2 + k) * 6 * s * q;
      const r = s * (13 + 5 * h) * (1 + 2.6 * easeOut(q)) * backOut(clamp(a / .25)) * (1 - seg(q, .6, 1) ** 2);
      P.push({ x: x + wind * a * (.3 + .7 * q) + bob, y: y - r * .5 - rise * a * (1 - .25 * q), r, spin: k + a, k: q, id: k });
    }
    dust.cloud(P, { size: s, col: o.col ?? '#E6E0DC', shade: o.shade ?? '#B7AEAE', ink: o.ink === undefined ? mixCol(PAL.ink, '#B7AEAE', .3) : o.ink }, key);
  }
  return { steam, plume };
})();
