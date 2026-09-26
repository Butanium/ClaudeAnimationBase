// Demo loop for lib/cast/bug.js: a green beetle scuttles in, sees Clawd, hides in its shell, gets caught under a jar, bonks
// the glass, is let out and buzzes up onto Clawd's head; a ladybug is flattened by a falling acorn and pops back dizzy.
// The camera pushes from zoom 1.3 to 2.2 on the jar, and back.
LOOPS['cast/bug'] = t => {
  const u = 30, gy = 880, fy = gy + 18, jx = 1180;
  const z = kf(t, [[3.05, 1.3], [3.6, 2.2], [4.7, 2.2], [5.4, 1.3]]), cx = kf(t, [[3.05, 900], [3.6, 1180], [4.7, 1180], [5.4, 900]]), cy = kf(t, [[3.05, 720], [3.6, 830], [4.7, 830], [5.4, 720]]);
  const thud = t > 3.0 && t < 3.15 ? shakeXY(t, 6) : [0, 0];
  camBegin(cx + thud[0] + 6 * Math.sin(t * .6), cy + thud[1], z);
  boilSeed('bg');
  paint(rectPts(-300, -300, W + 600, 1150), { wash: '#E4EBDB', ink: null });
  paint(rectPts(-300, 810, W + 600, 700), { wash: '#C6D4A2', ink: null });
  inkLine([[-100, 812], [900, 808], [2100, 813]], .7, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .5);
  // an oak on the left: the acorn's source
  boilSeed('tree');
  paint(ribbon([[150, 830], [175, 560], [160, 250]], 90, 70), { wash: '#8C6A50', fill: '#5E4636', fillOp: 60, tex: .6, ink: PAL.ink, sw: 1.1 });
  paint(ribbon([[170, 420], [300, 360], [470, 350]], 34, 10), { wash: '#8C6A50', ink: PAL.ink, sw: 1 });
  paint(ellPts(360, 300, 230, 110, 24, 6), { wash: '#7FA563', fill: '#5C8A48', fillOp: 70, tex: .6, ink: PAL.ink, sw: 1 });

  // Clawd: delighted by the bug, puzzled, startled by the jar, sorry for it, loved at the end
  const cp = emotions(t, [[0, 'neutral', { lookX: .8, lookY: .5 }], [1.25, 'happy', { lookX: .8, lookY: .5 }], [2.35, 'confused', { lookX: .9, lookY: .4 }], [3.1, 'surprised', { lookX: .8, lookY: .4 }], [4.2, 'sad', { lookX: .8, lookY: .5 }], [5.3, 'hopeful', { lookX: .8, lookY: -.3 }], [6.75, 'love']]);
  clawd(760, gy, u, { ...cp, boilKey: 'clawd' });
  const Hh = 8 * u * (1 - (cp.sq || 0)), head = [760 + (cp.dx || 0) * u + Math.sin(cp.rot || 0) * Hh + .8 * u, gy + (cp.dy || 0) * u - Math.cos(cp.rot || 0) * Hh];

  // the ladybug: an acorn drops on it at 1.3, it's flat until 2.2, pops back dizzy, then laughs it off
  const lx = 420, acT = 1.3, ac = t < acT ? [lx + 10, lerp(300, fy - 26, easeIn(seg(t, .75, acT)))] : arcPt([lx + 10, fy - 26], [lx - 150, fy - 12], 110, seg(t, acT, acT + .6));
  const lb = bug.squash(t, acT, 2.2), lAct = bug.act(t, [[0, 'neutral', { lookX: .6 }], [3.4, 'laugh']], { phase: BEAT / 4 });
  bug(lx, fy, u, { ...lAct, ...lb, seed: 2, shell: '#D9534F', shellDk: '#9E3431', shellLt: '#F2A09A', spots: true, boilKey: 'ladybug' });
  if (t > .75) { boilSeed('acorn'); push(); translate(ac[0], ac[1]); rotate(t > acT ? (t - acT) * -9 : .2); paint(ellPts(0, 4, 13, 17, 14), { wash: '#B98A55', ink: PAL.ink, sw: .8 }); paint(ellPts(0, -9, 15, 8, 12), { wash: '#7A5B3E', ink: PAL.ink, sw: .8 }); inkLine([[0, -16], [3, -24]], .8, PAL.ink, 'ink', 0); pop(); }

  // the beetle: scuttles in, sees Clawd, hides; the jar comes down over it; it peeks, bonks the glass, sulks; the jar
  // lifts, it cheers and buzzes up onto Clawd's head
  const act = bug.act(t, [[0, 'neutral', { lookX: -.4 }], [1.5, 'surprised', { lookX: -1 }], [1.9, 'scared'], [3.45, 'surprised', { lookX: .6 }], [3.85, 'determined'], [4.25, 'dizzy'], [4.55, 'sad'], [5.3, 'excited'], [6.8, 'happy']]);
  let A;
  if (t < 3.9) { const s = bug.scuttle(t, .2, 1.35, 1700, jx); A = { ...s, y: fy, hide: ease(seg(t, 2.0, 2.2)) * (1 - ease(seg(t, 3.35, 3.55))) }; }
  else if (t < 5.4) { const s = bug.scuttle(t, 3.95, 4.15, jx, jx + 22); A = { ...s, flip: false, y: fy, sq: (s.sq || 0) + (t > 4.15 ? .12 * spring(t, 4.15, 7, 20) : 0), dx: t > 4.15 ? -.5 * Math.exp(-8 * (t - 4.15)) : 0 }; }
  else { A = bug.fly(t, 5.7, 6.6, [jx + 22, fy], head, { h: 160 }); }
  // the jar: falls in from above at 2.6, lands mouth-down at 3.0, lifts off at 4.8
  const jh = 150, jp = t < 3.0 ? arcPt([jx + 250, -200], [jx + 10, fy], -60, easeIn(seg(t, 2.6, 3.0))) : t < 4.8 ? [jx + 10, fy] : arcPt([jx + 10, fy], [jx + 420, -300], 120, easeIn(seg(t, 4.8, 5.3)));
  const jr = t < 3.0 ? lerp(-.5, 0, seg(t, 2.6, 3.0)) : t < 4.8 ? .04 * spring(t, 3.0, 6, 20) : .4 * seg(t, 4.8, 5.3);
  const jarOn = t > 2.55 && t < 5.35;
  if (jarOn) bug.jar(jp[0], jp[1], jh, 'back', { down: true, rot: jr, w: 1.1 });
  bug(A.x, A.y, u, { ...act, ...A, seed: 1, boilKey: 'beetle' });
  if (jarOn) bug.jar(jp[0], jp[1], jh, 'front', { down: true, rot: jr, w: 1.1 });
  camEnd();
};
LOOPS['cast/bug'].len = 8;
