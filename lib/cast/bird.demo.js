// Demo loop for lib/cast/bird.js: a blue bird hops in, pecks, flies onto Clawd's head, both react, it sings and leaves;
// a robin sleeps on a branch, a finch crosses the sky (flap bursts and glides), a yellow bird flaps with excitement.
// The camera pushes to zoom 2 on the bird on Clawd's head, and back.
LOOPS['cast/bird'] = t => {
  const u = 24, gx = 900, gy = 850, fy = gy + 16;
  const z = kf(t, [[4.9, 1], [5.7, 2], [6.9, 2], [7.6, 1]]), cx = kf(t, [[4.9, 960], [5.7, 930], [6.9, 930], [7.6, 960]]), cy = kf(t, [[4.9, 540], [5.7, 670], [6.9, 670], [7.6, 540]]);
  camBegin(cx + 8 * Math.sin(t * .7), cy, z);
  boilSeed('bg');
  paint(rectPts(-300, -300, W + 600, 1100), { wash: '#DCE7E3', ink: null });
  paint(ellPts(1450, 830, 950, 150, 30), { wash: '#C3D5AE', ink: null });
  paint(rectPts(-300, 792, W + 600, 700), { wash: '#CDD8A6', ink: null });
  inkLine([[-100, 794], [700, 790], [1500, 796], [2100, 792]], .6, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .5);
  // a branch reaching in from the right, with a twig and two leaves
  boilSeed('branch');
  paint(ribbon([[2010, 536], [1840, 562], [1690, 580], [1570, 574]], 38, 10), { wash: '#8C6A50', fill: '#5E4636', fillOp: 60, tex: .6, ink: PAL.ink, sw: 1.1 });
  paint(ribbon([[1790, 570], [1770, 530], [1735, 505]], 9, 3), { wash: '#8C6A50', ink: PAL.ink, sw: .9 });
  for (const [lx, ly, a] of [[1735, 500, -.6], [1610, 566, .5]]) paint(ellPts(lx, ly, 26, 11, 14, 0, a), { wash: PAL.sap, fill: '#4E7A3E', fillOp: 70, ink: PAL.ink, sw: .8 });
  bird(1700, 572, u, { state: 'sleep', flip: true, seed: 5, plume: '#9C8270', wingCol: '#6F5646', lt: '#C8B19E', belly: '#E9956F', noShadow: true, boilKey: 'robin' });

  // the finch: flap bursts and glides, right to left across the sky
  const up = frac(bpOf(t) / 2) < .55;
  bird(lerp(2100, -180, t / 8), 250 + 28 * Math.sin(t * 1.6), u * .75, { state: up ? 'fly' : 'glide', flip: true, seed: 2, plume: '#5FA59E', wingCol: '#3B7671', lt: '#A9D7CF', belly: '#EFE3C8', boilKey: 'finch' });

  // Clawd watches the bird, is surprised when it lands on him, then enjoys the song
  const cp = emotions(t, [[0, 'neutral', { lookX: -.8, lookY: .3 }], [3.45, 'neutral', { lookX: -.5, lookY: -.7 }], [4.8, 'surprised', { lookY: -1, lookX: .2 }], [5.75, 'happy'], [7.35, 'neutral', { lookX: .8, lookY: -.6 }]]);
  clawd(gx, gy, u, { ...cp, boilKey: 'clawd' });
  const Hh = 8 * u * (1 - (cp.sq || 0)), r = cp.rot || 0, head = [gx + (cp.dx || 0) * u + Math.sin(r) * Hh + .5 * u, gy + (cp.dy || 0) * u - Math.cos(r) * Hh];

  // the blue bird: hops in, pecks, flies up onto Clawd's head, reacts, sings, flies off
  const act = bird.act(t, [[0, 'neutral'], [5.05, 'surprised'], [5.8, 'happy']]);
  let A;
  if (t < 1.95) { const h = bird.hops(t, .25, 230, 560, 6); A = [h.x, fy, { ...h, state: 'idle' }]; }
  else if (t < 3.5) A = [560, fy, { ...bird.fly(t, 3.5, 4.55, [560, fy], head), state: 'peck' }];
  else if (t < 7.3) { const f = bird.fly(t, 3.5, 4.55, [560, fy], head, { ground: gy + 16 }); A = [f.x, f.y, { ...f, state: t < 5.9 ? 'idle' : 'sing', noShadow: t > 4.3 }]; }
  else { const f = bird.fly(t, 7.3, 8.2, head, [2150, 240]); A = [f.x, f.y, { ...f, state: 'idle' }]; }
  bird(A[0], A[1], u, { ...act, ...A[2], seed: 1, boilKey: 'blue' });

  // a yellow bird on the ground: idle, then flapping with excitement, then startled by Clawd's take
  const dAct = bird.act(t, [[0, 'neutral'], [2.3, 'excited'], [3.7, 'neutral'], [4.85, 'surprised'], [5.9, 'happy']]);
  bird(1250, fy, u * .9, { ...dAct, state: t > 2.3 && t < 3.7 ? 'flap' : 'idle', flip: true, seed: 3, plume: '#E4B85C', wingCol: '#B8843C', lt: '#F6DC9C', belly: '#F7EAD0', beakCol: '#D9774E', boilKey: 'yellow' });
  camEnd();
};
LOOPS['cast/bird'].len = 8;
