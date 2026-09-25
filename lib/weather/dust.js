// lib/weather/dust.js: cartoon dust puffs for acting: a landing, a skid to a stop, a run's wind-up and the cloud left
// behind when it launches.
// Use: dust.land(t, t0, x, y, o)          puffs roll out both ways from under a landing at (x, y) at t0, specks fly;
//      dust.skid(t, t0, t1, at, o)        puffs rise along a sliding foot from t0 to t1 (strongest at the start);
//      dust.kick(t, t0, t1, at, dir, o)   feet spinning in place t0..t1 throw puffs back, and at t1 (the launch) a cloud
//                                         hangs where the runner was, then melts. dir = the way the runner goes (±1).
//      dust.cloud(P, o, key) / dust.puff(x, y, r, spin, k, o, key)   your own dust: puffs P = [{x, y, r, spin, k, id}]
//                                         (k = 0..1 through its life) painted as one cloud with one outline.
//   at: [x, y] or s => [x, y], the foot on the ground at time s (pure, so the puffs are too).
//   o: size (1 = a Clawd of u 24; scale with u / 24), amount (0..1+, how big the event is), spread (land: half-width
//      of what lands, 95·size), n (land: puffs), col / shade (puff light and dark), ink (outline colour; null: none),
//      strength (skid / kick: s => 0..1 at each spawn time), key (boil seed).
// Expects: world space (under a camera or not). Paint it after the character: dust covers the feet. 3 paints per big
//   puff, 1 per small one or speck: a landing ~25, a skid or kick ~20–30 at any moment.
// Source: made for the asset library, 2026-09-25, by painter-weather (Claude).
const dust = (() => {
  const COL = '#F3E8D2', SHADE = '#D6BF9A', SPECK = '#8C7258';
  const pt = at => typeof at === 'function' ? at : () => at;

  // A cloud of puffs P = [{x, y, r, spin, k, id}], painted as ONE shape: every puff's outline first, then all the washes
  // over them, so the outlines inside the cloud are covered and only its lumpy silhouette stays inked. Each puff is a
  // lumpy ball, darker underneath; spin turns its lumps (it rolls as it travels); its outline thins with age k.
  function cloud(P, o, key) {
    const s = o.size ?? 1, col = o.col ?? COL, shade = o.shade ?? SHADE, ink = o.ink === undefined ? mixCol(PAL.ink, shade, .3) : o.ink;
    const zf = CAM ? Math.min(1, 1.6 / CAM.zoom) : 1;   // keep the outline's on-screen weight under a zoom (LESSONS.md)
    const lump = (cx, cy, rr, spin) => {
      const Q = [];
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, b = 1 + .26 * Math.pow(Math.abs(Math.sin(a * 2.5 + spin)), .7); Q.push([cx + Math.cos(a) * rr * b + jit(rr * .025), cy + Math.sin(a) * rr * b * .86 + jit(rr * .025)]); }
      return Q;
    };
    const B = P.filter(p => p.r > .8).map(p => { boilSeed(key + ' ' + p.id); return { ...p, big: p.r >= 9 * s, body: lump(p.x, p.y, p.r, p.spin), top: lump(p.x - p.r * .1, p.y - p.r * .15, p.r * .8, p.spin) }; });
    boilSeed(key + ' paint');
    if (ink) for (const b of B) if (b.big && b.k < .8) paint(b.body, { ink, sw: clamp(b.r / 22, .4, 1) * (1 - b.k / .8 * .6) * zf });
    for (const b of B) paint(b.body, { wash: b.big ? shade : mixCol(col, shade, .35), ink: null });
    for (const b of B) if (b.big) paint(b.top, { wash: col, ink: null });
  }
  const puff = (x, y, r, spin, k, o, key) => cloud([{ x, y, r, spin, k, id: 0 }], o, key);
  // grows fast, holds, then shrinks away (cartoon dust dissolves by shrinking, not by fading: a thin wash would mix)
  const swell = (a, k, grow = .1) => backOut(clamp(a / grow)) * (1 - seg(k, .4, 1) ** 2) * (1 + .25 * k);

  function land(t, t0, x, y, o = {}) {
    const a0 = t - t0; if (a0 < 0 || a0 > 1.2) return;
    const s = o.size ?? 1, amt = o.amount ?? 1, n = o.n ?? 10, spread = o.spread ?? 95 * s, key = o.key ?? 'dust land ' + t0 + ' ' + x;
    const half = Math.ceil(n / 2), P = [];
    for (let j = 0; j < n; j++) {
      const side = j % 2 ? 1 : -1, q = half > 1 ? Math.floor(j / 2) / (half - 1) : 0, h = hash(t0 * 13.1 + x * .071 + j * 3.7);
      const a = a0 - .03 * q, L = (.5 + .25 * h) * Math.pow(amt, .3), k = a / L;
      if (a < 0 || k >= 1) continue;
      const D = s * (30 + 120 * q + 25 * h) * amt, R = s * (38 - 18 * q + 10 * h) * Math.sqrt(amt), d = D * easeOut(k), rr = R * swell(a, k);
      P.push({ q, x: x + side * (spread * (.45 + .3 * q) + d), y: y - rr * .7 - s * (8 + 34 * (1 - q) * (.5 + h)) * easeOut(k), r: rr, spin: side * d / R, k, id: j });
    }
    // specks thrown out on arcs, shrinking to nothing as they come down; painted under the cloud, so they fly out of it
    const g = 2400 * s;
    for (let i = 0; i < (o.specks ?? 4); i++) {
      const h = hash(t0 * 7.7 + x * .13 + i * 5.3), side = i % 2 ? 1 : -1, vy = s * (330 + 200 * h) * Math.sqrt(amt), T1 = 2 * vy / g, a = a0 - .01;
      if (a < 0 || a > T1) continue;
      const px = x + side * (spread * .6 + s * (150 + 160 * hash(h * 91)) * a), py = y - 4 * s - (vy * a - g * a * a / 2), r = s * (2.6 + 1.2 * h) * (1 - .7 * a / T1);
      boilSeed(key + ' speck ' + i);
      paint(ellPts(px, py, r, r * .8, 7, r * .1, h * 3), { wash: o.speck ?? SPECK, ink: null });
    }
    P.sort((p1, p2) => p2.q - p1.q);   // the big inner puffs on top
    cloud(P, o, key);
  }

  // Puffs spawned every `dt` seconds along a moving foot. mk(p, a, k, h, st, mv) → {x, y, r, spin} places one.
  function trail(t, t0, t1, at, o, dt, life, mk, key) {
    const A = pt(at), kmin = Math.max(0, Math.ceil((t - life - t0) / dt)), kmax = Math.floor((Math.min(t, t1) - t0) / dt), C = [];
    for (let k = kmin; k <= kmax; k++) {
      const ts = t0 + k * dt, a = t - ts, p = A(ts), h = hash(ts * 31.7 + k * 1.3), q = A(ts + .02);
      const mv = Math.sign(q[0] - p[0]) || 1, P = mk(p, a, a / life, h, o.strength ? clamp(o.strength(ts)) : 1, mv, ts);
      if (P) C.push({ ...P, k: a / life, id: k });
    }
    cloud(C, o, key);
  }
  function skid(t, t0, t1, at, o = {}) {
    const s = o.size ?? 1, amt = o.amount ?? 1;
    trail(t, t0, t1, at, o, o.every ?? .045, .6, (p, a, k, h, st, mv, ts) => {
      const str = (o.strength ? st : lerp(1, .35, seg(ts, t0, t1))) * amt, R = s * (18 + 16 * h) * str, r = R * swell(a, k, .08);
      return { x: p[0] + mv * s * (10 + 40 * h) * easeOut(k), y: p[1] - r * .7 - s * (10 + 34 * h) * easeOut(k), r, spin: -mv * a * 3 };
    }, o.key ?? 'dust skid ' + t0);
  }
  function kick(t, t0, t1, at, dir = 1, o = {}) {
    const s = o.size ?? 1, amt = o.amount ?? 1, A = pt(at), key = o.key ?? 'dust kick ' + t0;
    trail(t, t0, t1, at, o, o.every ?? .035, .45, (p, a, k, h, st, mv, ts) => {
      const str = (o.strength ? st : lerp(.55, 1, seg(ts, t0, t1))) * amt, R = s * (20 + 18 * h) * str, r = R * swell(a, k, .06);
      return { x: p[0] - dir * s * (40 + 170 * h) * easeOut(k) * str, y: p[1] - r * .6 - s * (12 + 50 * h) * Math.sin(Math.PI * Math.min(1, k * 1.4)), r, spin: -dir * a * 8 };
    }, key);
    // the cloud left behind at launch: a cluster that swells, drifts after the runner, hangs, then melts away
    const a = t - t1, L = .95 * Math.pow(amt, .3);
    if (a < 0 || a > L) return;
    const [x, y] = A(t1), k = a / L, P = [];
    const C = [[-70, -26, 38], [40, -34, 42], [-14, -80, 48], [-80, -96, 30], [52, -104, 32], [0, -22, 36], [92, -52, 26]];
    C.forEach(([cx, cy, R], i) => {
      const h = hash(t1 * 3.1 + i * 7.9), ai = a - .025 * i, ki = ai / L;
      if (ai < 0) return;
      const rr = s * R * Math.sqrt(amt) * swell(ai, ki, .12), drift = dir * s * (40 + 40 * h) * easeOut(k);
      P.push({ x: x - dir * s * 40 + dir * cx * s + drift, y: y + cy * s - s * 16 * easeOut(k), r: rr, spin: dir * (i + ai * 2), k: ki, id: i });
    });
    cloud(P, o, key + ' cloud');
  }
  return { land, skid, kick, cloud, puff };
})();
