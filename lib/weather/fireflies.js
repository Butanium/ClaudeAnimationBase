// lib/weather/fireflies.js: fireflies drifting on lazy loops and blinking, each a glow over a tiny painted bug with a lit
// tail; they can blink on their own clocks or all together on the beat, and one can fly to a point (a head, a hand),
// sit there blinking, and fly off again.
// Use: fireflies(t, o) paints the swarm; fireflies.at(i, t, o) → [x, y, lit 0..1]: where firefly i is (eyes can follow it).
//   o: n (12), ember (the light between blinks, .12), area [cx, cy, rx, ry] they wander in, size (1: a bug ~12 px long), sync 0..1 or t => 0..1 (0: their own
//      clocks, 1: all on the beat, in a wave across the swarm), col (the light), trail (0..1, the light smearing behind
//      them), visit { i, t0, t1, at: [x, y] or s => [x, y], fly: .9 } (i arrives at t0 + fly, leaves at t1), seed.
// Expects: glow() is the light, so a dark ground (on a bright day they barely show, as real light wouldn't). World space.
//   Per firefly: 3–5 glows and 2 paints (4 with wings, from size 1.2).
// Source: made for the asset library, 2026-09-25, by painter-weather (Claude).
const fireflies = (() => {
  const LIGHT = '#FFCF4A', HOT = '#FFF6C4', BODY = '#3B3346', TAIL = '#8E8F5A';

  // own path: a lazy loop around a home point (two sines per axis, each firefly its own speeds), plus a small bob
  function wander(i, t, o) {
    const [cx, cy, rx, ry] = o.area ?? [W / 2, H * .55, W * .35, H * .2], sd = (o.seed ?? 0) * 101 + i * 7.31, h = k => hash(sd + k);
    const hx = cx + rx * (h(1) - .5) * 1.4, hy = cy + ry * (h(2) - .5) * 1.4, f1 = .1 + .15 * h(3), f2 = .2 + .25 * h(4), g1 = .12 + .16 * h(5);
    return [hx + rx * .38 * (Math.sin(TAU * f1 * t + 6 * h(6)) + .45 * Math.sin(TAU * f2 * t + 6 * h(7))),
            hy + ry * .38 * (Math.sin(TAU * g1 * t + 6 * h(8)) + .4 * Math.sin(TAU * 2.3 * g1 * t + 6 * h(9))) + 5 * (o.size ?? 1) * wob(t, 1.3 + h(10), h(11))];
  }
  function blink(i, t, o, x) {
    const sd = (o.seed ?? 0) * 101 + i * 7.31, P = 1.2 + 1.4 * hash(sd + 12), u = frac(t / P + hash(sd + 13));
    const own = u < .45 ? Math.pow(Math.sin(Math.PI * u / .45), 1.2) : 0;
    const sync = clamp(typeof o.sync === 'function' ? o.sync(t) : o.sync ?? 0);
    if (sync <= 0) return own;
    const tb = t - (x / W) * .1, f = frac(bpOf(tb)), beat = f < .45 ? Math.pow(Math.sin(Math.PI * f / .45), 1.4) : 0;   // a wave across the swarm
    return lerp(own, beat, sync);
  }
  function at(i, t, o = {}) {
    let p = wander(i, t, o);
    const v = o.visit;
    if (v && v.i === i && t > v.t0) {
      const fly = v.fly ?? .9, A = typeof v.at === 'function' ? v.at : () => v.at, s = o.size ?? 1;
      const perch = s2 => { const q = A(s2); return [q[0] + 2 * s * wob(s2, .7), q[1] - 4 * s - 3 * s * Math.abs(wob(s2, .9))]; };
      if (t < v.t0 + fly) { const k = ease(seg(t, v.t0, v.t0 + fly)), q = perch(t); p = [lerp(p[0], q[0], k), lerp(p[1], q[1], k) - 60 * s * 4 * k * (1 - k)]; }
      else if (t < v.t1) p = perch(t);
      else { const k = ease(seg(t, v.t1, v.t1 + fly)), q = perch(t); p = [lerp(q[0], p[0], k), lerp(q[1], p[1], k) - 50 * s * 4 * k * (1 - k)]; }
    }
    return [p[0], p[1], blink(i, t, o, p[0])];
  }

  function fireflies(t, o = {}) {
    const n = o.n ?? 12, s = o.size ?? 1, col = o.col ?? LIGHT, tr = o.trail ?? .5;
    for (let i = 0; i < n; i++) {
      const [x, y, b] = at(i, t, o), [px, py] = at(i, t - .04, o), d = Math.hypot(x - px, y - py) || 1, ux = (x - px) / d, uy = (y - py) / d;
      boilSeed('firefly ' + (o.seed ?? 0) + ' ' + i);
      const lit = Math.max(b, o.ember ?? .12);   // between blinks they keep a faint ember
      if (tr > 0 && b > .05) for (const k of [1, 2]) { const [qx, qy, qb] = at(i, t - .07 * k, o); glow(qx, qy, 34 * s, col, Math.min(b, qb) * tr * (1 - .35 * k)); }
      glow(x, y, 110 * s * (.55 + .45 * lit), col, lit);   // light first, the bug on it: a wide halo, a bright one, a hot core
      glow(x, y, 42 * s, col, lit);
      glow(x, y, 17 * s, HOT, lit);
      // the bug, heading where it flies: a dark head and body, the tail lit by its own light
      paint(ellPts(x + ux * 4 * s, y + uy * 4 * s, 4.6 * s, 3.2 * s, 9, 0, Math.atan2(uy, ux)), { wash: BODY, ink: null });
      if (s >= 1.2) for (const sd of [-1, 1]) {
        const fl = .4 + .6 * Math.abs(Math.sin(t * 70 + i + sd));
        paint(ellPts(x + ux * 2.5 * s - uy * sd * 4.5 * s * fl, y + uy * 2.5 * s + ux * sd * 4.5 * s * fl, 4.2 * s, 1.9 * s * fl, 8, 0, Math.atan2(uy, ux) + sd * .9), { wash: '#B9B4C9', ink: null });
      }
      paint(ellPts(x - ux * 2.8 * s, y - uy * 2.8 * s, 4.4 * s, 3.6 * s, 9, 0, Math.atan2(uy, ux)), { wash: mixCol(TAIL, HOT, Math.min(1, lit * 1.6)), ink: null });
    }
  }
  fireflies.at = at;
  return fireflies;
})();
