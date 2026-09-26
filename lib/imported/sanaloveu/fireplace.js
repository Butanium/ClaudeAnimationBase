// lib/imported/sanaloveu/fireplace.js: a cozy fireplace: wooden surround, dark firebox, two crossed logs, three swaying
// flames and a warm glow.
// Use: fireplace(cx, floorY, s, t, o): centred at cx, standing on floorY; s = scale (1 = 430 × 350 px incl. the mantel).
//   o: lit 0..1 (flame height and glow; 0 = out), glow (glow strength, default 2), speed (flame sway, default 1: slow,
//   cozy), wood, box, mantel, key.
// Expects: core only; world or screen space. Paint the wall first: the glow lands on what's painted before it.
// Source: imported from https://github.com/sanaloveu/ClaudeAnimationBase@d038e6d (branch bbiriville-code-redraw-v1,
//   src/bbiriville/props.js fireplace), MIT, by sana (sanaloveu); Copyright (c) 2026 sanaloveu, MIT. Changed: placed and
//   scaled by arguments instead of the film's fixed room coordinates, always animated, `lit`, `glow` and `speed` added, the
//   glow twice as strong by default (it barely showed on a brown wall), the film's BBPAL colours inlined as options.
function fireplace(cx, floorY, s, t, o = {}) {
  const key = 'fireplace ' + (o.key ?? 0), lit = clamp(o.lit ?? 1), lp = TAU * (t / 12) * (o.speed ?? 1);
  const P = pts => pts.map(([x, y]) => [x - 285, y - 955]);   // the source's room coordinates, relative to the hearth floor
  push(); translate(cx, floorY); scale(s);
  boilSeed(key + ' body');
  paint(P(rrPts(70, 625, 430, 330, 36, 2)), { wash: o.wood || '#77533E', fill: '#A77954', fillOp: 65, bleed: .08, tex: .5, ink: PAL.ink, sw: 1 });
  paint(P(rrPts(132, 709, 306, 214, 28, 1)), { wash: o.box || '#2D2527', ink: PAL.ink, sw: .8 });
  paint(P(rectPts(52, 601, 466, 42, 2)), { wash: o.mantel || '#8A5A3B', ink: PAL.ink, sw: .8 });
  boilSeed(key + ' logs');
  push(); translate(0, -65); rotate(-.12); paint(rrPts(-105, -18, 210, 32, 14, 1), { wash: '#5E3629', ink: '#4B3840', sw: .7 }); pop();
  push(); translate(0, -61); rotate(.16); paint(rrPts(-96, -16, 192, 30, 13, 1), { wash: '#75432E', ink: '#4B3840', sw: .7 }); pop();
  if (lit > .01) {
    const gk = .82 + .18 * Math.sin(lp * 2 + .4);
    glow(0, -135, 170 * (1 + .05 * gk) * (.6 + .4 * lit), '#FF9B42', (.34 + .12 * gk) * lit * (o.glow ?? 2));
    const flame = (fx, base, rw, rh, col, i, speed, ph) => {
      boilSeed(key + ' flame' + i);
      const sway = Math.sin(lp * speed + ph) * 11, hh = rh * (1 + .10 * Math.sin(lp * (speed + 1) + ph * .7)) * lit;
      paint(through(P([[fx - rw, base], [fx - rw * .55 + sway * .2, base - hh * .3], [fx - rw * .2, base - hh * .15], [fx + sway, base - hh], [fx + rw * .24, base - hh * .25], [fx + rw * .58 + sway * .2, base - hh * .35], [fx + rw, base], [fx, base + 10]]), 5),
        { wash: col, ink: mixCol(PAL.ink, col, .45), sw: .45, curv: .65 });
    };
    flame(245, 888, 45, 128, '#F47B2B', 1, 2, .2);
    flame(305, 888, 52, 168, '#FFD26A', 2, 3, 1.4);
    flame(350, 890, 34, 105, '#F59A38', 3, 5, 2.2);
  }
  pop();
}
