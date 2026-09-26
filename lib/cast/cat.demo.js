// Demo loop for lib/cast/cat.js: a grey tabby sits, stretches, spots a ball of yarn, wiggles, pounces on it, is proud of
// itself and curls up to sleep; Clawd and a small cream cat watch and react. The camera pushes to zoom 2 on the tabby and back.
LOOPS['cast/cat'] = t => {
  const u = 30, gy = 880, fy = gy + 16;
  const z = kf(t, [[4.8, 1.1], [5.5, 2], [6.9, 2], [7.6, 1.1]]), cx = kf(t, [[4.8, 960], [5.5, 1060], [6.9, 1060], [7.6, 960]]), cy = kf(t, [[4.8, 650], [5.5, 760], [6.9, 760], [7.6, 650]]);
  camBegin(cx + 8 * Math.sin(t * .6), cy, z);
  boilSeed('bg');
  paint(rectPts(-300, -300, W + 600, 1150), { wash: '#E9DFD0', ink: null });
  paint(rectPts(-300, 800, W + 600, 700), { wash: '#C9B79C', ink: null });
  paint(rectPts(1500, 380, 260, 300, 6), { wash: '#DCCDB7', fill: '#C3B090', fillOp: 60, tex: .5, ink: PAL.ink, sw: .9 });   // a window-ish frame on the wall
  inkLine([[-100, 802], [800, 798], [2100, 803]], .7, mixCol(PAL.paper, PAL.ink, .4), 'inkfine', .5);
  paint(ellPts(1060, fy + 4, 360, 38, 26), { fill: '#A8574A', fillOp: 90, bleed: .1, tex: .5, ink: null });   // a rug

  // the yarn: lies there, gets pounced on (squashed), rolls away
  const land = 4.55, roll = ease(seg(t, land + .05, land + .8)), yx = 1045 - 70 * roll, ysq = .35 * Math.exp(-10 * Math.max(0, t - land)) * (t > land ? 1 : 0);
  boilSeed('yarn');
  push(); translate(yx, fy - 22); rotate(-roll * 3); scale(1 + ysq, 1 - ysq);
  paint(ellPts(0, 0, 22, 22, 18), { wash: PAL.rose, ink: PAL.ink, sw: .9 });
  for (const [a, r] of [[.3, 16], [1.4, 12], [2.5, 18]]) inkLine([[Math.cos(a) * r, Math.sin(a) * r - 10], [Math.cos(a + .6) * 6, Math.sin(a + .6) * 6], [Math.cos(a + 2.4) * r, Math.sin(a + 2.4) * r]], .5, mixCol(PAL.rose, PAL.ink, .45), 'inkfine', .6);
  pop();
  inkLine([[yx - 18, fy - 8], [yx - 60, fy - 2 + 4 * Math.sin(t * 3)], [yx - 110 + 40 * roll, fy - 1]], .8, mixCol(PAL.rose, PAL.ink, .2), 'ink', .6);

  // Clawd watches from the left
  const cp = emotions(t, [[0, 'neutral', { lookX: .8 }], [4.65, 'surprised', { lookX: .6 }], [5.25, 'laugh'], [6.4, 'happy', { lookX: .7, lookY: .3 }]]);
  clawd(700, gy, u, { ...cp, boilKey: 'clawd' });

  // the tabby: sit → stretch → sit, spots the yarn, pounces, proud, sleepy, curls up
  const act = cat.act(t, [[0, 'neutral', { lookX: -.6 }], [2.55, 'surprised', { lookX: -.8, lookY: .5 }], [3.0, 'mischief', { lookX: -.8, lookY: .6 }], [4.75, 'proud'], [5.7, 'sleepy']]);
  let M;
  if (t < 3.05) M = { x: 1380, y: fy, ...cat.moves(t, [[0, 'sit'], [1.15, 'stretch'], [2.1, 'sit']]) };
  else if (t < 5.9) M = cat.pounce(t, 4.1, land, [1380, fy], [1110, fy]);
  else M = { x: 1110, y: fy, ...cat.moves(t, [[0, 'sit'], [6.05, 'curl']], { dur: .5 }) };
  const sleep = M.pose2 === 'curl' || M.pose === 'curl' ? { eyes: 'closed', emote: 'zzz', emoteK: seg(t, 6.3, 6.6), emoteAge: t - 6.3, mouth: null } : {};
  cat(M.x, M.y, u, { ...act, ...M, ...sleep, flip: true, seed: 1, boilKey: 'tabby' });

  // a small cream cat on the left, watching, reacting half a beat later
  const act2 = cat.act(t, [[0, 'neutral', { lookX: .9 }], [4.8, 'surprised', { lookX: .8 }], [5.5, 'happy']], { phase: BEAT / 4 });
  cat(300, fy, u, { ...act2, pose: 'sit', size: .75, seed: 4, fur: '#E8D0AC', furDk: '#C9A06C', furLt: '#F6E8D2', chest: '#FBF3E6', boilKey: 'cream' });
  camEnd();
};
LOOPS['cast/cat'].len = 8;
