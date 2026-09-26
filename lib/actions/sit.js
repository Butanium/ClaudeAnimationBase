// lib/actions/sit.js: Clawd sits down on the floor, on a stool, or up on a ledge with its legs dangling and kicking, and gets back up.
// Use: clawd(x, y, u, sit(t, feel('happy', t), { h: 3.5, t0: 1, t1: 4 })). (x, y) is the FLOOR point, as for a standing
//   Clawd, so a walk up to the seat and the sit share it. The second argument is the option object to build on (an
//   emotion, a dance): sit adds to its dy / sq / rot / dx instead of replacing them and keeps its draw hook
//   (`{ ...feel(), ...sit(t) }` also works, but loses the mood's bounce).
//   h: seat height above the floor, in u (0 = on the floor; up to ~1.8 a stool, feet planted; above 2 a ledge: it hops up
//     and the legs dangle and kick). Clawd's legs are about 2u long.
//   t0: the moment it lands on the seat (sitting down takes `down` = .45 s before it; omit t0 to start seated).
//   t1: when it starts getting up (`up` = .55 s later it's standing). Omit to stay seated.
//   kick 0..1 (dangling legs swing on the beat, each on its own phase), bob 0..1 (how much of o's up-down bounce
//   survives sitting, default .35), rest (u, how high the body rests on its tucked legs when h is lower, default .5),
//   lift (u, extra seat height under the body only, e.g. a cushion). Every view works; front and q read best.
// Expects: core + clawd (VIEWS, tintCols). World space: works under a camera. Legs are drawn through the draw hook
//   (noLegs); on a ledge (h > 2) the floor shadow is hidden while seated: paint the ledge's own contact.
// Source: made for the asset library, 2026-09-25, by painter-actions (Claude).
function sit(t, o = {}, s = {}) {
  const h = s.h ?? 0, t0 = s.t0 ?? -1e9, t1 = s.t1 ?? 1e9, down = s.down ?? .45, up = s.up ?? .55;
  const kick = s.kick ?? 1, bob = s.bob ?? .35, lift = s.lift ?? 0;
  if (t < t0 - down || t > t1 + up + .6) return o;                               // standing: nothing to change

  // -- the body. Squash and rotation pivot at the seat (the underside), not at the feet.
  const rot = o.rot || 0, hop = h > 2;             // hop: the seat is above the underside, so sitting = hopping up onto it
  let sq = (o.sq || 0) + (o.take || 0), seat = 1, ex = 0;    // seat: 0 standing .. 1 seated; ex: extra dy (u, up < 0)
  if (t < t0) {                                   // sitting down: a small wind-up, then the drop (or the hop)
    const k = seg(t, t0 - down, t0), a = seg(k, 0, .38), m = seg(k, .38, 1);
    if (hop) { sq += .16 * Math.sin(Math.PI * a) * (1 - m) - .14 * Math.sin(Math.PI * m); seat = m; ex = -(1.2 + .25 * (h - 2)) * 4 * m * (1 - m); }
    else { sq += -.07 * Math.sin(Math.PI * a) + .05 * m; seat = easeIn(m); ex = -.35 * Math.sin(Math.PI * a); }
  } else if (t < t1) {                            // seated: the landing squash rings out
    sq += .26 * Math.exp(-7 * (t - t0)) * Math.cos(17 * (t - t0));
  } else {                                        // getting up: lean into it, push, rise (or hop down), settle on the feet
    const k = seg(t, t1, t1 + up), a = seg(k, 0, .4), m = seg(k, .4, 1), after = t - (t1 + up);
    sq += .13 * Math.sin(Math.PI * a) * (1 - m) - (hop ? 0 : .1 * Math.sin(Math.PI * m));
    seat = 1 - (hop ? easeIn(m) : easeOut(m));
    if (hop) ex = -.9 * 4 * m * (1 - m);
    if (after > 0) { sq += .2 * Math.exp(-8 * after) * Math.cos(18 * after); seat = 0; }
  }
  const sy = (o.sy ?? 1) * (1 - sq), under = 2 * sy * Math.cos(rot);          // body origin → underside, in u
  const seatH = Math.max(h, s.rest ?? .5) + lift;                               // on the floor it rests on its tucked legs
  const dyBody = lerp(0, under - seatH, seat) + ex;                             // without the mood's bounce
  const dy = dyBody + (o.dy || 0) * lerp(1, bob, seat), dx = (o.dx || 0) - 2 * sy * Math.sin(rot) * seat;

  // -- the legs, each a vector from its hip to its foot (u). D = how far the floor is below the underside: while the feet
  // reach it they're planted there (splayed in front, reaching forward in profile, and a leg that comes at the camera
  // shortens and shows its sole pad); when they don't, they dangle and kick on the beat, each leg on its own phase.
  const D = under - dyBody, planted = D < 2.1, L = 1.85;
  const bp = bpOf(t), kickK = kick * seg(t, t0 + .15, t0 + .6) * (1 - seg(t, t1, t1 + .2));
  const flop = Math.max(0, spring(t, t0, 5, 13));                               // legs fling up on landing, fall back
  const PH = [0, .55, .2, .8], SPREAD = [-2.3, -.5, .5, 2.3];
  const swing = i => (kickK * .26 + .3 * flop) * Math.sin((bp + PH[i]) * Math.PI) * (i % 2 ? -1 : 1);
  const view = o.view || 'front', V = VIEWS[view] || VIEWS.front, prev = o.draw, key = o.boilKey ?? '';
  const prof = view === 'side' || view === 'q', away = view === 'back' || view === 'qback';
  const { dk, lt } = tintCols(o), far = mixCol(dk, PAL.ink, .22), pad = mixCol(lt, PAL.rose, .3);
  // → [angle (rad, + = foot toward +x), drawn length, sole pad length], or null when the leg is hidden
  const legOf = (i, lx) => {
    if (!planted) {
      if (!prof) { const fwd = clamp(kickK * .3 * (1 + Math.sin((bp + PH[i]) * Math.PI)) + .5 * flop); return [swing(i), L * (1 - .3 * fwd), away ? 0 : .6 * fwd]; }
      return [.12 + 1.3 * Math.abs(swing(i)) + .6 * flop, L, 0];
    }
    if (!prof) {                                  // front / back: feet on the floor, splayed wider the lower it sits
      const X = SPREAD[i] * clamp(1 - D / 2); let vy = D - .15, a = Math.atan2(X, vy);
      vy -= .5 * Math.abs(Math.sin(a)); a = Math.atan2(X, vy);                  // the foot's corner, not its centre, on the floor
      const len = Math.min(L, Math.hypot(X, vy)), pf = Math.sqrt(Math.max(0, 1 - (len / L) ** 2));
      if (away && pf > .55) return null;                                        // pointing away: behind the body
      return [a, Math.max(len, .9 * pf + .15), away ? 0 : Math.min(.9 * pf, len - .1)];
    }
    // profile: the foot reaches forward along the floor (q: the forward reach is foreshortened, the sole shows)
    const fs = view === 'q' ? .8 : 1; let a = 0, X = 0, vy = D - .15;
    for (let k = 0; k < 3; k++) { vy = D - .15 - .5 * Math.sin(a); X = Math.sqrt(Math.max(0, L * L - vy * vy)); a = Math.atan2(X * fs, vy); }
    if (lx < 0 && a > 1) return null;                                           // the back pair folds under the body
    return [a, Math.hypot(X * fs, vy), view === 'q' ? .55 * Math.sin(Math.atan2(X, vy)) : 0];
  };
  const legs = (u, sw) => {
    V.legs.forEach(([lx, isFar], i) => {
      const leg = legOf(i, lx); if (!leg) return;
      const [a, len, ph] = leg, col = isFar ? far : dk, J = u * .04;
      boilSeed(`sit leg ${key} ${i}`);
      // splayed legs slide their hips to the body's edge (front: outer legs out to the sides; profile: the front pair forward)
      const edge = !planted ? 0 : prof ? (lx > 0 ? 1.1 * Math.sin(a) : 0) : Math.sign(SPREAD[i]) * (Math.abs(SPREAD[i]) > 1 ? .9 : .2) * Math.abs(Math.sin(a));
      push(); translate((lx + .5 + edge) * u, -2.05 * u); rotate(-a);
      paint(rectPts(-.5 * u, 0, u, len * u, J), { wash: col, washOp: 255, ink: null });
      if (ph > .08) paint(rrPts(-.38 * u, (len - ph + .04) * u, .76 * u, (ph - .1) * u, Math.min(.25, (ph - .1) / 2) * u, J * .5), { wash: isFar ? mixCol(pad, PAL.ink, .2) : pad, washOp: 255, ink: null });
      paint(rectPts(-.5 * u, 0, u, len * u, J), { ink: PAL.ink, sw: sw * .8 });
      pop();
    });
    boilSeed(`sit draw ${key}`);
    if (prev) prev(u, sw);
  };
  return { ...o, dy, dx, sq: sq - (o.take || 0), rot, noLegs: true, draw: legs, noShadow: o.noShadow || (hop && seat > .3) };
}
