// lib/weather/lightning.js: a lightning strike: a jagged forked bolt that flickers (leader, flash, dip, re-strike,
// decay), the clouds lighting up from inside, a full-frame flash, and the thunder's cue time for a sound, a take or a shake.
// Use: const S = lightning.strike(t0, { from: [x, y], to: [x, y], delay, size, seed, branches, kinks });
//        S.thunder = t0 + delay (.6 by default; real thunder lags ~3 s per km), S.level(t) = the light 0..1 at time t.
//      lightning.sky(t, S, o)     light the clouds: call it after painting the sky, before anything in front of it (hills
//                                 and characters painted after stay dark and read as silhouettes). o: col, r, a.
//      lightning.bolt(t, S, o)    the bolt on its own glow. o: col, core (the white-hot middle), halo, ink (null: none).
//      lightning.flash(t, S, o)   light over the whole frame on the brightest frames; screen space, after camEnd().
//                                 o: a, col, at ([x, y] on screen; default: the strike, through the last camera).
//      lightning.shake(t, S, amt) → [dx, dy], the thunder's rumble to add to the camera from S.thunder on.
// Expects: world space for sky and bolt (under a camera or not); all light is glow(), so it stays clean over dark paint.
//   A strike is ~10 glows and ~6 paints while it's lit, nothing otherwise.
// Source: made for the asset library, 2026-09-25, by painter-weather (Claude).
const lightning = (() => {
  // the light of one strike, a seconds after it: a dim leader frame, the flash, a dip, a re-strike, then a decay
  function levelAt(a) {
    if (a < 0) return 0;
    if (a < .03) return .55;
    if (a < .1) return 1;
    if (a < .135) return .3;
    if (a < .2) return .85;
    return .85 * Math.exp(-(a - .2) * 6);
  }

  // A jagged path from p to q: n kinks, zig-zagging across the line and wandering off it, fixed by the seed.
  function jagged(p, q, n, amp, seed) {
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, P = [p];
    let wander = 0;
    for (let i = 1; i < n; i++) {
      wander = wander * .6 + (hash(seed + i * 3.1) - .5) * amp * 1.2;
      const off = (i % 2 ? 1 : -1) * amp * (.25 + .75 * hash(seed + i * 7.7)) + wander, k = (i + (hash(seed + i * 5.3) - .5) * .6) / n;
      P.push([p[0] + dx * k + nx * off, p[1] + dy * k + ny * off]);
    }
    P.push(q);
    return P;
  }
  // A tapered stroke along a polyline with SHARP kinks (ribbon() smooths them): mitred offsets, capped at 2× width.
  function sharp(P, w0, w1) {
    const n = P.length, Lf = [], Rt = [];
    for (let i = 0; i < n; i++) {
      let nx = 0, ny = 0, c = 0;
      for (const [a, b] of [[i - 1, i], [i, i + 1]]) {
        if (a < 0 || b >= n) continue;
        const dx = P[b][0] - P[a][0], dy = P[b][1] - P[a][1], d = Math.hypot(dx, dy) || 1; nx += -dy / d; ny += dx / d; c++;
      }
      const d = Math.hypot(nx, ny) || 1, w = lerp(w0, w1, i / (n - 1)) / 2 * Math.min(2, c / d);
      Lf.push([P[i][0] + nx / d * w, P[i][1] + ny / d * w]); Rt.push([P[i][0] - nx / d * w, P[i][1] - ny / d * w]);
    }
    return Lf.concat(Rt.reverse());
  }

  function strike(t0, o = {}) {
    const from = o.from ?? [W * .45, 40], to = o.to ?? [W * .55, H * .75], seed = (o.seed ?? t0) * 13.37, size = o.size ?? 1;
    const L = Math.hypot(to[0] - from[0], to[1] - from[1]), n = o.kinks ?? Math.max(5, Math.round(L / 60));
    const main = jagged(from, to, n, L * .045, seed), branches = [];
    for (let b = 0; b < (o.branches ?? 3); b++) {
      const h = hash(seed + b * 9.1), at = 1 + Math.floor((.15 + .6 * h) * (n - 2)), p = main[at];
      const d0 = main[Math.min(n, at + 1)], ang = Math.atan2(d0[1] - p[1], d0[0] - p[0]) + (b % 2 ? 1 : -1) * (.45 + .5 * hash(seed + b * 4.3));
      const len = L * (.14 + .2 * hash(seed + b * 2.9)) * (1 - at / n * .5), q = [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len];
      branches.push({ at, pts: jagged(p, q, 4, len * .08, seed + b * 31), w: 8 * size * (1 - at / n * .6) });
    }
    return { t0, from, to, size, seed, main, branches, thunder: t0 + (o.delay ?? .6), level: t => levelAt(t - t0) };
  }

  function sky(t, S, o = {}) {
    const lv = S.level(t) * (o.a ?? 1); if (lv < .02) return;
    const [x, y] = S.from, r = o.r ?? 1400 * S.size;
    glow(x, y + r * .08, r, o.col ?? '#8FA0E8', lv);
    glow(x, y, r * .45, '#DCD8FF', lv * .9);
  }

  function bolt(t, S, o = {}) {
    const a = t - S.t0, lv = S.level(t); if (a < 0 || a > .6 || lv < .08) return;
    const s = S.size, k = clamp(lv * 1.25), col = o.col ?? '#FFE9A6', core = o.core ?? '#FFFCEE';
    const ink = o.ink === undefined ? mixCol(PAL.ink, PAL.indigo, .35) : o.ink, sw = .8 * (CAM ? Math.min(1, 1.6 / CAM.zoom) : 1);
    const reach = a < .03 ? Math.ceil(S.main.length * .6) : S.main.length, M = S.main.slice(0, reach);   // the leader is still coming down
    boilSeed('bolt ' + S.seed);
    for (let i = 0; i < M.length; i += 2) glow(M[i][0], M[i][1], 120 * s, o.halo ?? '#C9D2FF', lv);   // its own light first
    if (reach === S.main.length) glow(...S.to, 190 * s, '#FFF0C0', lv);
    for (const B of S.branches) if (B.at < reach) {
      paint(sharp(B.pts, B.w * k, 1), { wash: col, ink, sw: sw * .7 });
      paint(sharp(B.pts, B.w * .35 * k, .5), { wash: core, ink: null });
    }
    paint(sharp(M, 17 * s * k, (reach < S.main.length ? 9 : 5) * s * k), { wash: col, ink, sw });
    paint(sharp(M, 6.5 * s * k, 2 * s * k), { wash: core, ink: null });
  }

  function flash(t, S, o = {}) {
    const k = clamp((S.level(t) - .5) / .5) * (o.a ?? .85); if (k <= 0) return;
    const m = [(S.from[0] + S.to[0]) / 2, (S.from[1] + S.to[1]) / 2], at = o.at ?? (LAST_CAM ? toScreen(...m, LAST_CAM) : m);
    glow(at[0], at[1], 2600, o.col ?? '#F2EEFF', k);
  }

  const shake = (t, S, amt = 10) => t < S.thunder ? [0, 0] : shakeXY(t, amt * Math.exp(-(t - S.thunder) * 3.5) * clamp((t - S.thunder) / .06));

  return { strike, sky, bolt, flash, shake };
})();
