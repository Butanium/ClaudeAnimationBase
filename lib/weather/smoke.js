// lib/weather/smoke.js: steam curling up from a mug or a pot, and a smoke plume from a chimney or a campfire.
// Use: smoke.steam(t, x, y, o)  wisps rising from (x, y) (a rim's middle): o: n (3 wisps), h (height, 130·size), w (rim
//                                width, 50·size), size, wind (dx per px risen, or t => it), col, ink (null: none), key.
//      smoke.plume(t, x, y, o)  puffs leaving (x, y) (a chimney top) every o.every s, rising, swelling, bending with the
//                                wind and melting away, painted as one cloud with one outline (dust.cloud): o: size, rate
//                                (px/s up, 140·size), life (3.2 s), wind (px/s sideways, or t => it), col / shade / ink, key.
// Expects: lib/weather/dust.js (for the plume). World space.
//   Steam: 1 paint per wisp. Plume: ~10 puffs × 3 paints.
// Source: made for the asset library, 2026-09-25, by painter-weather (Claude).
const smoke = (() => {
  const val = (v, t, d) => typeof v === 'function' ? v(t) : v ?? d;
  // a smooth band along P, thickest in its middle and pointed at both ends (ribbon() tapers one way only)
  function wisp(P, w) {
    const C = through(P), n = C.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const ww = w / 2 * Math.pow(Math.max(.08, Math.sin(Math.PI * Math.pow(i / (n - 1), .8))), .7);
      L.push([C[i][0] - dy / d * ww, C[i][1] + dx / d * ww]); R.push([C[i][0] + dy / d * ww, C[i][1] - dx / d * ww]);
    }
    return L.concat(R.reverse());
  }

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
      const w = 17 * s * (1 - .7 * u);   // thick when young, thinning as it climbs
      boilSeed(key + ' ' + j);
      paint(wisp(pts, w), { wash: col, ink: ink && u < .8 ? ink : null, sw: .45 * zf * (1 - u * .6) });
    }
  }

  function plume(t, x, y, o = {}) {
    const s = o.size ?? 1, dt = o.every ?? .38, life = o.life ?? 3.2, rise = o.rate ?? 140 * s, key = o.key ?? 'plume ' + x + ' ' + y;
    const P = [];
    for (let k = Math.floor((t - life) / dt) + 1; k <= Math.floor(t / dt); k++) {
      const ts = k * dt, a = t - ts, q = a / life, h = hash(k * 3.71 + x * .013);
      // it drifts with the wind that was blowing along the way (integrated in closed form for a constant wind; a changing
      // wind bends the whole plume at once, which reads as a gust)
      const wind = val(o.wind, t, 25 * s), bob = Math.sin(a * 2.2 + k) * 6 * s * q;
      const r = s * (16 + 8 * h) * (1 + 2.2 * easeOut(q)) * lerp(.45, 1, backOut(clamp(a / .3))) * (1 - seg(q, .6, 1) ** 2);
      P.push({ x: x + wind * a * (.3 + .7 * q) + bob + (h - .5) * 16 * s * (1 + q), y: y - r * .5 - rise * a * (.4 + .6 * seg(a, 0, .9)) * (1 - .25 * q), r, spin: k + a, k: q, id: k });
    }
    dust.cloud(P, { size: s, col: o.col ?? '#E6E0DC', shade: o.shade ?? '#B7AEAE', ink: o.ink === undefined ? mixCol(PAL.ink, '#B7AEAE', .3) : o.ink }, key);
  }
  return { steam, plume };
})();
