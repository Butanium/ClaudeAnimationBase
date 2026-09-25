// lib/weather/dust.js: cartoon dust puffs for acting: a landing, a skid to a stop, a run's wind-up and the cloud left
// behind when it launches.
// Use: dust.land(t, t0, x, y, o)          puffs roll out both ways from under a landing at (x, y) at t0, specks fly;
//      dust.skid(t, t0, t1, at, o)        puffs rise along a sliding foot from t0 to t1 (strongest at the start);
//      dust.kick(t, t0, t1, at, dir, o)   feet spinning in place t0..t1 throw puffs back, and at t1 (the launch) a cloud
//                                         hangs where the runner was, then melts. dir = the way the runner goes (±1).
//      dust.puff(x, y, r, spin, k, o, key)  one puff (k = 0..1 through its life), for your own dust.
//   at: [x, y] or s => [x, y], the foot on the ground at time s (pure, so the puffs are too).
//   o: size (1 = a Clawd of u 24; scale with u / 24), amount (0..1+, how big the event is), spread (land: half-width
//      of what lands, 95·size), n (land: puffs), col / shade (puff light and dark), ink (outline colour; null: none),
//      strength (skid / kick: s => 0..1 at each spawn time), key (boil seed).
// Expects: world space (under a camera or not). Paint it after the character: dust covers the feet. 3 paints per big
//   puff, 1 per small one or speck: a landing ~25, a skid or kick ~20–30 at any moment.
// Source: made for the asset library, 2026-09-25, by painter-weather (Claude).
const dust = (() => {
  const COL = '#F1E4CC', SHADE = '#C9AE88', SPECK = '#8C7258';
  const pt = at => typeof at === 'function' ? at : () => at;

  // One puff: a lumpy ball, darker underneath, inked while it's young. spin turns its lumps (it rolls as it travels).
  function puff(x, y, r, spin, k, o, key) {
    const s = o.size ?? 1;
    if (!(r > .8)) return;
    const col = o.col ?? COL, shade = o.shade ?? SHADE, ink = o.ink === undefined ? mixCol(PAL.ink, shade, .3) : o.ink;
    boilSeed(key);
    const lump = (cx, cy, rr) => {
      const P = [];
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, b = 1 + .18 * Math.pow(Math.abs(Math.sin(a * 2.5 + spin)), .7); P.push([cx + Math.cos(a) * rr * b + jit(rr * .025), cy + Math.sin(a) * rr * b * .86 + jit(rr * .025)]); }
      return P;
    };
    const body = lump(x, y, r);
    if (r < 6 * s) { paint(body, { wash: mixCol(col, shade, .35), ink: null }); return; }
    paint(body, { wash: shade, ink: null });
    paint(lump(x - r * .1, y - r * .15, r * .8), { wash: col, ink: null });
    const zf = CAM ? Math.min(1, 1.6 / CAM.zoom) : 1;   // keep the outline's on-screen weight under a zoom (LESSONS.md)
    if (ink && k < .8) paint(body, { ink, sw: clamp(r / 24, .35, .9) * (1 - k / .8 * .6) * zf });
  }
  // grows fast, holds, then shrinks away (cartoon dust dissolves by shrinking, not by fading: a thin wash would mix)
  const swell = (a, k, grow = .1) => backOut(clamp(a / grow)) * (1 - ease(seg(k, .4, 1))) * (1 + .2 * k);

  function land(t, t0, x, y, o = {}) {
    const a0 = t - t0; if (a0 < 0 || a0 > 1.2) return;
    const s = o.size ?? 1, amt = o.amount ?? 1, n = o.n ?? 8, spread = o.spread ?? 95 * s, key = o.key ?? 'dust land ' + t0 + ' ' + x;
    const half = Math.ceil(n / 2), P = [];
    for (let j = 0; j < n; j++) {
      const side = j % 2 ? 1 : -1, q = half > 1 ? Math.floor(j / 2) / (half - 1) : 0, h = hash(t0 * 13.1 + x * .071 + j * 3.7);
      const a = a0 - .03 * q, L = (.5 + .25 * h) * Math.pow(amt, .3), k = a / L;
      if (a < 0 || k >= 1) continue;
      const D = s * (25 + 90 * q + 20 * h) * amt, R = s * (17 - 7 * q + 5 * h) * Math.sqrt(amt), d = D * easeOut(k), rr = R * swell(a, k);
      P.push({ q, x: x + side * (spread * (.45 + .3 * q) + d), y: y - rr * .7 - s * (4 + 12 * (1 - q) * (.5 + h)) * easeOut(k), r: rr, spin: side * d / R, k, j });
    }
    P.sort((p1, p2) => p2.q - p1.q);   // the big inner puffs on top
    for (const p of P) puff(p.x, p.y, p.r, p.spin, p.k, o, key + ' ' + p.j);
    // specks thrown out on arcs, shrinking to nothing as they come down
    const g = 2400 * s;
    for (let i = 0; i < (o.specks ?? 4); i++) {
      const h = hash(t0 * 7.7 + x * .13 + i * 5.3), side = i % 2 ? 1 : -1, vy = s * (330 + 200 * h) * Math.sqrt(amt), T1 = 2 * vy / g, a = a0 - .01;
      if (a < 0 || a > T1) continue;
      const px = x + side * (spread * .6 + s * (150 + 160 * hash(h * 91)) * a), py = y - 4 * s - (vy * a - g * a * a / 2), r = s * (2.6 + 1.2 * h) * (1 - .7 * a / T1);
      boilSeed(key + ' speck ' + i);
      paint(ellPts(px, py, r, r * .8, 7, r * .1, h * 3), { wash: o.speck ?? SPECK, ink: null });
    }
  }

  // Puffs spawned every `dt` seconds along a moving foot. mk(p, a, k, h, st, mv) → {x, y, r, spin} places one.
  function trail(t, t0, t1, at, o, dt, life, mk, key) {
    const A = pt(at), kmin = Math.max(0, Math.ceil((t - life - t0) / dt)), kmax = Math.floor((Math.min(t, t1) - t0) / dt);
    for (let k = kmin; k <= kmax; k++) {
      const ts = t0 + k * dt, a = t - ts, p = A(ts), h = hash(ts * 31.7 + k * 1.3), q = A(ts + .02);
      const mv = Math.sign(q[0] - p[0]) || 1, P = mk(p, a, a / life, h, o.strength ? clamp(o.strength(ts)) : 1, mv, ts);
      if (P) puff(P.x, P.y, P.r, P.spin, a / life, o, key + ' ' + k);
    }
  }
  function skid(t, t0, t1, at, o = {}) {
    const s = o.size ?? 1, amt = o.amount ?? 1;
    trail(t, t0, t1, at, o, o.every ?? .045, .6, (p, a, k, h, st, mv, ts) => {
      const str = (o.strength ? st : lerp(1, .35, seg(ts, t0, t1))) * amt, R = s * (10 + 9 * h) * str, r = R * swell(a, k, .08);
      return { x: p[0] + mv * s * (8 + 26 * h) * easeOut(k), y: p[1] - r * .7 - s * (6 + 22 * h) * easeOut(k), r, spin: -mv * a * 3 };
    }, o.key ?? 'dust skid ' + t0);
  }
  function kick(t, t0, t1, at, dir = 1, o = {}) {
    const s = o.size ?? 1, amt = o.amount ?? 1, A = pt(at), key = o.key ?? 'dust kick ' + t0;
    trail(t, t0, t1, at, o, o.every ?? .04, .45, (p, a, k, h, st, mv, ts) => {
      const str = (o.strength ? st : lerp(.55, 1, seg(ts, t0, t1))) * amt, R = s * (7 + 8 * h) * str, r = R * swell(a, k, .06);
      return { x: p[0] - dir * s * (25 + 120 * h) * easeOut(k) * str, y: p[1] - r * .6 - s * (8 + 34 * h) * Math.sin(Math.PI * Math.min(1, k * 1.4)), r, spin: -dir * a * 8 };
    }, key);
    // the cloud left behind at launch: a cluster that swells, drifts after the runner, hangs, then melts away
    const a = t - t1, L = .95 * Math.pow(amt, .3);
    if (a < 0 || a > L) return;
    const [x, y] = A(t1), k = a / L;
    const C = [[-38, -16, 20], [22, -20, 22], [-8, -44, 25], [-44, -52, 16], [28, -58, 17], [0, -14, 19], [50, -30, 14]];
    C.forEach(([cx, cy, R], i) => {
      const h = hash(t1 * 3.1 + i * 7.9), ai = a - .025 * i, ki = ai / L;
      if (ai < 0) return;
      const rr = s * R * Math.sqrt(amt) * swell(ai, ki, .12), drift = dir * s * (30 + 30 * h) * easeOut(k);
      puff(x - dir * s * 30 + dir * cx * s + drift, y + cy * s - s * 10 * easeOut(k), rr, dir * (i + ai * 2), ki, o, key + ' cloud ' + i);
    });
  }
  return { land, skid, kick, puff };
})();
