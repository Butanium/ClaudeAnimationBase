// lib/imported/cromwellian/butterfly.js: a butterfly seen from above as cartoons draw it, and a five-petal bloom drawn
// as one outline (it can be worn on Clawd's head).
// Use: butterfly(x, y, s, flap, rot, o): flap 0 (wings shut) .. 1 (open), s = size (wingspan ~2.9 s), rot = body tilt
//   (0 = head up); o: wing, wing2 (hind wings), dk (wing shading), key.
//   butterfly.path(t, [[t0, x0, y0], [t1, x1, y1], ...]): a smooth flight through timed keys (holds the ends).
//   butterfly.bloom(cx, cy, r, col, sw, rot) paints the flower; butterfly.bloomPts(cx, cy, r, rot) is its outline.
//   butterfly.wornBloom(grow 0..1, col): a clawd() draw hook that pops a bloom onto Clawd's head (stem included).
// Expects: core only; world or screen space.
// Source: imported from https://github.com/cromwellian/ClaudeAnimationBase@d62c9c0 (src/scenes/butterfly.js), MIT, by
//   Ray Cromwell; Copyright (c) 2026 Ray Cromwell, MIT. Changed: pulled out of the film's IIFE into one global, wing
//   colours and the boil key as options, bloom colour an argument of wornBloom.
const butterfly = (() => {
  function butterfly(x, y, s, flap, rot = 0, o = {}) {
    boilSeed('butterfly ' + (o.key ?? 0));
    const wing = o.wing || '#EC8FAE', wing2 = o.wing2 || '#F4B36E', dk = o.dk || PAL.violet;
    const w = lerp(.32, 1, clamp(flap)), sw = clamp(s / 45, .45, 1.1);
    push(); translate(x, y); rotate(rot);
    for (const side of [-1, 1]) {
      const X = (a, b) => [side * a * w * s, b * s];
      paint([X(.05, .05), X(.75, .15), X(1.05, .7), X(.7, 1.05), X(.2, .75)], { wash: wing2, ink: PAL.ink, sw, curv: .6 });
      paint([X(.05, -.1), X(.45, -.95), X(1.2, -1.2), X(1.45, -.7), X(1.05, -.1), X(.4, .05)], { wash: wing, fill: dk, fillOp: 45, tex: .5, ink: PAL.ink, sw, curv: .6 });
      if (w > .35) paint(ellPts(side * 1.05 * w * s, -.75 * s, .17 * s * w, .17 * s, 10), { wash: PAL.cream, ink: null });
      inkLine([[0, -.5 * s], [side * .15 * s, -.95 * s], [side * .38 * s, -1.2 * s]], sw * .6, PAL.ink, 'inkfine', .6);
    }
    paint(ribbon([[0, -.55 * s], [0, .1 * s], [0, .8 * s]], .26 * s, .1 * s), { wash: '#4A3A5C', ink: PAL.ink, sw: sw * .6 });
    pop();
  }
  // Smooth path through timed keys [[t, x, y], ...] (Catmull-Rom); holds the ends.
  butterfly.path = (t, K) => {
    if (t <= K[0][0]) return [K[0][1], K[0][2]];
    const n = K.length; if (t >= K[n - 1][0]) return [K[n - 1][1], K[n - 1][2]];
    let i = 0; while (t >= K[i + 1][0]) i++;
    const p0 = K[Math.max(0, i - 1)], p1 = K[i], p2 = K[i + 1], p3 = K[Math.min(n - 1, i + 2)], u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
    return [1, 2].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * u3));
  };
  // A bloom as ONE outline: five round petals from a polar curve, with an ochre centre.
  butterfly.bloomPts = (cx, cy, r, rot = 0, n = 40) => {
    const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; const rr = r * (.62 + .38 * Math.pow(Math.abs(Math.cos(a * 2.5 + rot)), .7)); p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return p;
  };
  butterfly.bloom = (cx, cy, r, col, sw, rot = 0) => {
    paint(butterfly.bloomPts(cx, cy, r, rot), { wash: col, fill: PAL.cream, fillOp: 50, tex: .5, ink: PAL.ink, sw });
    paint(ellPts(cx, cy, r * .3, r * .3, 12), { wash: PAL.ochre, ink: PAL.ink, sw: sw * .6 });
  };
  // The bloom worn on the head, as a draw() hook (body-local: follows every squash, flip and tumble). Front-view coordinates.
  butterfly.wornBloom = (grow, col = PAL.rose) => (u, sw) => {
    const k = backOut(clamp(grow));
    if (k < .02) return;
    inkLine([[-1.9 * u, -7.9 * u], [-1.8 * u, -8.6 * u], [-1.7 * u, -9.3 * u]], sw * 1.3, PAL.sap, 'ink', .5);
    push(); translate(-1.7 * u, -9.3 * u); scale(k); rotate(.3);
    butterfly.bloom(0, 0, 1.35 * u, col, sw * .8);
    pop();
  };
  return butterfly;
})();
