// lib/actions/held.js: props Clawd holds in one hand: an umbrella (rain splashes on it) and a balloon on a string.
// Use: clawd(x, y, u, held.umbrella(t, feel('happy', t), { col: PAL.teal, wind: .3 })). held.<prop>(t, o, opts) takes the
//   option object to build on (an emotion, a sit(), the other hand's prop) and returns it with that hand's arm angle and
//   hook set; apply it last, since it owns that arm. The prop stays upright whatever the arm does and follows the body
//   (flip, squash, rot). Common opts: hand 'R' | 'L' (default 'R'; side view uses its one arm), arm (the arm angle; each
//   prop has its own default), follow 0..1 (how much of o's arm motion is kept, default .25), col, seed.
//   held.umbrella: over the head, aimed from the fist; wind -1..1 (leans into it and flutters; may be a number that
//     changes with t), top (apex height above the feet, u, default 14.8).
//     held.canopy(x, y, u, o) → the canopy's top as world segments [[ax, ay, bx, by], ...] for lib/weather/rain.js
//     `surfaces` (o = the object you passed to clawd()), so drops splash on the umbrella and Clawd stays dry.
//   held.balloon: floats on a string; len (u, default 7.5), r (u, default 1.75), vx (the character's speed in u/s: the
//     balloon trails behind), vy (vertical speed, u/s, + = down: rising fast, it lags and the string goes slack),
//     tugs: [t, ...] (jolts, e.g. a hop's landing: it jerks, dips and bobs back). It hangs in world space: it doesn't
//     tilt or squash with the body.
//   held.hold(o, opts, armDefault, draw) makes any prop: draw(u, sw, side, a) paints in an upright, body-aligned frame at
//     the fist (side = +1 when outward is +x).
// Expects: core + clawd (VIEWS). World space: works under a camera. Drawn in the arm hook, so a prop sits at its arm's
//   layer (in front view, behind the body).
// Source: made for the asset library, 2026-09-25, by painter-actions (Claude).
const held = (() => {
  // the hand's arm, [pivotX, dir, which, layer] from VIEWS, and its fist in body-local u
  const armOf = (o, hand) => { const V = VIEWS[o.view] || VIEWS.front; return V.arms.find(a => a[2] === hand) || V.arms[0]; };
  function gripAt([px, dir], a) {
    if (dir === 0) { const th = .7 - a; return [px + 1.75 * Math.cos(th), -4.2 + 1.75 * Math.sin(th)]; }
    return [px + dir * .55 * clamp((Math.abs(a) - .7) / .9) + dir * 1.85 * Math.cos(a), -4.5 - 1.85 * Math.sin(a)];
  }
  // float: the prop hangs in world space (undo the body's rotation too), else it's rigid in the fist (rotates with it).
  // Either way it doesn't squash with the body.
  function hold(o, opts, armDef, draw, float = false) {
    const hand = o.view === 'side' ? 'L' : opts.hand || 'R', A = armOf(o, hand), [, dir, which] = A;
    const key = 'a' + which, a = opts.arm ?? armDef + (opts.follow ?? .25) * ((o[key] ?? .2) - .2);
    const side = dir === 0 ? 1 : dir, prev = o['arm' + which], tag = `held ${which} ${o.boilKey ?? ''}`, B = body(o);
    const hook = (u, sw) => {
      if (prev) { push(); prev(u, sw); pop(); }
      push(); translate(-.35 * u, 0);                                  // into the fist, not at the nub's very end
      if (dir === 0) rotate(a - .7); else if (dir < 0) { scale(-1, 1); rotate(-a); } else rotate(a);
      scale(1 / Math.abs(B.sx), 1 / B.sy); if (float) rotate(o.flip ? B.r : -B.r);
      boilSeed(tag); draw(u, sw, side, a);
      pop();
    };
    return { ...o, [key]: a, ['arm' + which]: hook, heldArm: { A, a } };
  }
  // clawd()'s body transform: rotation and scale (the scale carries the flip)
  function body(o) {
    const sq = (o.sq || 0) + (o.take || 0);
    return { r: o.rot || 0, sx: (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6) * (1 + clamp(o.smear || 0) * .35), sy: (o.sy ?? 1) * (1 - sq) };
  }
  // world position of a point (vx, vy) px in a rigid prop's frame, held at the body-local fist (fx, fy) px
  function propToWorld(x, y, u, o, fx, fy, vx, vy) {
    const B = body(o), c = Math.cos(B.r), s = Math.sin(B.r), f = o.flip ? -1 : 1;
    const wx = x + (o.dx || 0) * u + c * B.sx * fx - s * B.sy * fy, wy = y + (o.dy || 0) * u + s * B.sx * fx + c * B.sy * fy;
    return [wx + c * f * vx - s * vy, wy + s * f * vx + c * vy];
  }

  // ---------- umbrella ----------
  // Its geometry in body-local px: the fist, the sway about it, the apex (relative to the fist) and the canopy's lean.
  function umbrellaGeo(t, o, opts, A, a, u) {
    const V = VIEWS[o.view] || VIEWS.front, [gx, gy] = gripAt(A, a), wind = opts.wind || 0, seed = opts.seed || 0;
    // the apex sits where the tilted canopy's rim comes out centred over the head
    const ty = -(opts.top ?? 14.8), hc = .6 * 6.6; let tx = V.hat;
    for (let k = 0; k < 3; k++) tx = V.hat + hc * Math.sin(Math.atan2(tx - gx, gy - ty));
    const sway = .035 * wob(t, .4, seed) + .02 * wob(t, 1.3, seed + .3) + wind * (.48 + .08 * wob(t, 2.7, seed));
    const ax = (tx - gx) * u, ay = (ty - gy) * u;
    return { gx: gx * u, gy: gy * u, sway, ax, ay, lean: Math.atan2(ax, -ay) + wind * .08 * wob(t, 3.1, seed), R: 6.6 * u, wind };
  }
  const E = .14, N = 6;   // how much of the rim's underside shows, and the number of gores
  function canopyPts(g, t) {
    const R = g.R, hc = .6 * R, fl = g.wind * .05 * R;
    const tip = k => { const p = -Math.PI / 2 + k * Math.PI / N; return [R * Math.sin(p), hc + E * R * Math.cos(p) + (k % 2 ? 1 : -1) * fl * wob(t, 4, k * .2)]; };
    const rib = k => { const p = -Math.PI / 2 + k * Math.PI / N, pts = []; for (let j = 0; j < 6; j++) { const f = j / 6 * Math.PI / 2; pts.push([R * Math.sin(p) * Math.sin(f), hc * (1 - Math.cos(f)) + E * R * Math.cos(p) * Math.sin(f)]); } pts.push(tip(k)); return pts; };
    const mid = (k0, k1) => { const [x0, y0] = tip(k0), [x1, y1] = tip(k1); return [lerp(x0, x1, .5), lerp(y0, y1, .5) - .09 * R]; };
    const dome = []; for (let j = 1; j < 16; j++) { const f = -Math.PI / 2 + j / 16 * Math.PI; dome.push([R * Math.sin(f), hc * (1 - Math.cos(f))]); }
    dome.unshift(tip(0)); dome.push(tip(N));
    const rim = []; for (let k = N; k > 0; k--) { rim.push(mid(k, k - 1)); if (k > 1) rim.push(tip(k - 1)); }
    return { outline: dome.concat(rim), dome, rib, mid, tip };
  }
  function umbrella(t, o = {}, opts = {}) {
    const col = opts.col || PAL.teal;
    const out = hold(o, opts, opts.arm ?? 1.15, (u, sw, side, a) => {
      const g = umbrellaGeo(t, o, opts, out.heldArm.A, a, u), dark = '#4A3B4F';
      push(); rotate(g.sway);                                          // the whole umbrella pivots in the fist
      // handle: a J hooking under the fist; the shaft up to the apex (the canopy hides its top)
      inkLine([[0, -.2 * u], [.02 * u, .75 * u], [-.2 * side * u, 1.25 * u], [-.62 * side * u, 1.1 * u], [-.7 * side * u, .8 * u]], sw * 2.1, dark, 'ink', .5);
      inkLine([[0, 0], [g.ax * .5, g.ay * .5], [g.ax, g.ay]], sw * 1.5, dark, 'ink', 0);
      // canopy: a half-ellipse dome with a scalloped rim, seen a little from below; alternate gores darker; ribs on top
      push(); translate(g.ax, g.ay); rotate(g.lean);
      const C = canopyPts(g, t), R = g.R;
      paint(C.outline, { wash: col, washOp: 255, ink: null });
      for (let k = 1; k < N; k += 2) paint(C.rib(k).concat([C.mid(k, k + 1)], C.rib(k + 1).reverse()), { wash: mixCol(col, PAL.ink, .16), washOp: 255, ink: null });
      paint(ellPts(-.36 * R, .28 * .6 * R, .2 * R, .06 * R, 12, 0, -.45), { wash: mixCol(col, PAL.cream, .4), washOp: 255, ink: null });   // sheen
      paint(C.outline, { ink: PAL.ink, sw: sw * .9 });
      for (let k = 1; k < N; k++) inkLine(C.rib(k), sw * .5, mixCol(col, PAL.ink, .55), 'inkfine', .4);
      inkLine([[0, 0], [0, -.75 * u]], sw * 1.6, dark, 'ink', 0);    // finial
      pop(); pop();
    });
    return { ...out, heldUmbrella: { t, opts, ...out.heldArm } };
  }
  // the canopy's top in world space, as segments for rain.js `surfaces`
  function canopy(x, y, u, o) {
    const H = o.heldUmbrella; if (!H) return [];
    const g = umbrellaGeo(H.t, o, H.opts, H.A, H.a, u), C = canopyPts(g, H.t);
    // canopy frame → fist frame (sway) → world (the prop frame is body-aligned, unsquashed)
    const cs = Math.cos(g.lean), sn = Math.sin(g.lean), cw = Math.cos(g.sway), sw = Math.sin(g.sway);
    const pts = C.dome.filter((_, j) => j % 2 === 0 || j === C.dome.length - 1).map(([px, py]) => {
      const qx = g.ax + cs * px - sn * py, qy = g.ay + sn * px + cs * py;
      return propToWorld(x, y, u, o, g.gx, g.gy, cw * qx - sw * qy, sw * qx + cw * qy);
    });
    const segs = []; for (let i = 0; i + 1 < pts.length; i++) segs.push([...pts[i], ...pts[i + 1]]);
    return segs;
  }

  // ---------- balloon ----------
  function balloon(t, o = {}, opts = {}) {
    const col = opts.col || PAL.rose, seed = opts.seed || 0, tugs = opts.tugs || [];
    const lag = clamp(-(opts.vy || 0) * .07, 0, 2.2), L = (opts.len ?? 7.5) - lag;   // rising fast: it lags, the string goes slack
    return hold(o, opts, opts.arm ?? .95, (u, sw, side) => {
      const trail = clamp(-(opts.vx || 0) * .09, -.8, .8);             // moving right → it trails left
      const psi = side * .1 + trail + .12 * wob(t, .23, seed) + .05 * wob(t, .61, seed + .4) + .22 * ring(t, tugs, 3.5, 9);
      const bob = .25 * wob(t, .5, seed + .2) + .5 * ring(t, tugs, 4, 11);
      const kx = Math.sin(psi) * L * u, ky = -Math.cos(psi) * L * u + bob * u;   // the knot
      // the string: its upper end lags, so it bows away from the way it's going
      const bend = (.55 * wob(t, .31, seed + .7) - 1.4 * trail - .8 * ring(t, tugs, 3.5, 9) + .9 * lag) * u, S = [];
      for (let j = 0; j <= 6; j++) { const s = j / 6, b = bend * Math.sin(Math.PI * s); S.push([kx * s + Math.cos(psi) * b, ky * s + Math.sin(psi) * b]); }
      inkLine(S, sw * .55, mixCol(PAL.ink, PAL.paper, .2), 'inkfine', .5);
      push(); translate(kx, ky); rotate(psi * .7);
      const rb = (opts.r ?? 1.75) * u, ry = rb * 1.18, B = [];
      for (let j = 0; j < 24; j++) { const th = j / 24 * TAU, sy = Math.sin(th); B.push([rb * Math.cos(th) * (1 - .1 * Math.max(0, sy)), -ry * 1.02 + ry * sy * (sy > 0 ? 1.08 : .96)]); }
      paint([[0, -.1 * u], [-.32 * u, .3 * u], [.32 * u, .3 * u]], { wash: mixCol(col, PAL.ink, .2), washOp: 255, ink: PAL.ink, sw: sw * .5 });   // knot
      paint(B, { wash: col, washOp: 255, fill: mixCol(col, PAL.ink, .25), fillOp: 45, bleed: .08, tex: .5, border: .6, ink: PAL.ink, sw: sw * .85, curv: .5 });
      paint(ellPts(-.42 * rb, -ry * 1.45, .2 * rb, .34 * ry, 12, 0, .45), { wash: mixCol(col, PAL.cream, .75), washOp: 255, ink: null });   // shine
      paint(ellPts(-.2 * rb, -ry * 1.85, .07 * rb, .07 * rb, 8), { wash: mixCol(col, PAL.cream, .75), washOp: 255, ink: null });
      pop();
    }, true);
  }

  return { umbrella, canopy, balloon, hold, gripAt };
})();
