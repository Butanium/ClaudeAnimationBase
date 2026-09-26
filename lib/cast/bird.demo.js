// Demo loop for lib/cast/bird.js: a blue bird hops in, pecks, flies onto Clawd's head, both react, it sings and leaves;
// a robin sleeps on a branch, a finch crosses the sky (flap bursts and glides), a yellow bird flaps with excitement.
// The camera pushes from zoom 1.1 to 2.1 on the bird on Clawd's head, and back.
LOOPS['cast/bird'] = t => {
  const u = 30, gx = 960, gy = 880, fy = gy + 18;
  const z = kf(t, [[4.9, 1.1], [5.7, 2.1], [6.9, 2.1], [7.6, 1.1]]), cy = kf(t, [[4.9, 640], [5.7, 690], [6.9, 690], [7.6, 640]]);
  camBegin(960 + 8 * Math.sin(t * .7), cy, z);
  boilSeed('bg');
  paint(rectPts(-300, -300, W + 600, 1150), { wash: '#DCE7E3', ink: null });
  paint(ellPts(1450, 850, 950, 150, 30), { wash: '#C3D5AE', ink: null });
  paint(rectPts(-300, 815, W + 600, 700), { wash: '#CDD8A6', ink: null });
  inkLine([[-100, 817], [700, 813], [1500, 819], [2100, 815]], .6, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .5);
  // a branch reaching in from the right, with a twig and two leaves
  boilSeed('branch');
  paint(ribbon([[1930, 598], [1780, 622], [1640, 640], [1520, 634]], 40, 11), { wash: '#8C6A50', fill: '#5E4636', fillOp: 60, tex: .6, ink: PAL.ink, sw: 1.1 });
  paint(ribbon([[1740, 630], [1722, 588], [1690, 562]], 10, 3), { wash: '#8C6A50', ink: PAL.ink, sw: .9 });
  for (const [lx, ly, a] of [[1688, 556, -.6], [1560, 626, .5]]) paint(ellPts(lx, ly, 28, 12, 14, 0, a), { wash: PAL.sap, fill: '#4E7A3E', fillOp: 70, ink: PAL.ink, sw: .8 });
  bird(1650, 630, u * .9, { state: 'sleep', flip: true, seed: 5, plume: '#9C8270', wingCol: '#6F5646', lt: '#C8B19E', belly: '#E9956F', noShadow: true, boilKey: 'robin' });

  // the finch: flap bursts and glides, right to left across the sky
  const up = frac(bpOf(t) / 2) < .55;
  bird(lerp(2000, -100, t / 8), 330 + 28 * Math.sin(t * 1.6), u * .75, { state: up ? 'fly' : 'glide', flip: true, seed: 2, plume: '#5FA59E', wingCol: '#3B7671', lt: '#A9D7CF', belly: '#EFE3C8', boilKey: 'finch' });

  // Clawd watches the bird, is surprised when it lands on him, then enjoys the song
  const cp = emotions(t, [[0, 'neutral', { lookX: -.8, lookY: .3 }], [3.45, 'neutral', { lookX: -.5, lookY: -.7 }], [4.8, 'surprised', { lookY: -1, lookX: .2 }], [5.75, 'happy'], [7.35, 'neutral', { lookX: .8, lookY: -.6 }]]);
  clawd(gx, gy, u, { ...cp, boilKey: 'clawd' });
  const Hh = 8 * u * (1 - (cp.sq || 0)), r = cp.rot || 0, head = [gx + (cp.dx || 0) * u + Math.sin(r) * Hh + .5 * u, gy + (cp.dy || 0) * u - Math.cos(r) * Hh];

  // the blue bird: hops in, pecks, flies up onto Clawd's head, reacts, sings, flies off
  const act = bird.act(t, [[0, 'neutral'], [5.05, 'surprised'], [5.8, 'happy']]);
  let A;
  if (t < 1.95) { const h = bird.hops(t, .25, 280, 620, 6); A = [h.x, fy, { ...h, state: 'idle' }]; }
  else if (t < 3.5) A = [620, fy, { ...bird.fly(t, 3.5, 4.55, [620, fy], head), state: 'peck' }];
  else if (t < 7.3) { const f = bird.fly(t, 3.5, 4.55, [620, fy], head, { ground: fy }); A = [f.x, f.y, { ...f, state: t < 5.9 ? 'idle' : 'sing', noShadow: t > 4.3 }]; }
  else { const f = bird.fly(t, 7.3, 8.2, head, [2150, 300], { h: 70 }); A = [f.x, f.y, { ...f, state: 'idle' }]; }
  bird(A[0], A[1], u, { ...act, ...A[2], seed: 1, boilKey: 'blue' });

  // a yellow bird on the ground: idle, then flapping with excitement, then startled by Clawd's take
  const dAct = bird.act(t, [[0, 'neutral'], [2.3, 'excited'], [3.7, 'neutral'], [4.85, 'surprised'], [5.9, 'happy']], { phase: BEAT / 4 });
  bird(1330, fy, u * .9, { ...dAct, state: t > 2.3 && t < 3.7 ? 'flap' : 'idle', flip: true, seed: 3, plume: '#E4B85C', wingCol: '#B8843C', lt: '#F6DC9C', belly: '#F7EAD0', beakCol: '#D9774E', boilKey: 'yellow' });
  camEnd();
};
LOOPS['cast/bird'].len = 8;
