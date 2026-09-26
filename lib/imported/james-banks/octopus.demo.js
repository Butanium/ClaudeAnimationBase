LOOPS['imported/james-banks/octopus'] = t => {
  boilSeed('octo bg');
  paint(rectPts(-80, -80, W + 160, H + 160), { wash: '#2F6F8F', ink: null });
  paint(rectPts(-80, -80, W + 160, 420), { wash: '#4E93A8', washOp: 170, ink: null });
  paint(ellPts(960, 1180, 1500, 330, 40, 3), { wash: '#D9C08E', ink: PAL.ink, sw: .8 });
  for (let i = 0; i < 7; i++) {   // rising bubbles
    boilSeed('octo bubble' + i);
    const k = frac(t / 4 + hash(i)), bx = 300 + 1400 * hash(i + 7) + 12 * Math.sin(t * 3 + i), by = lerp(1000, -40, k), r = 8 + 10 * hash(i + 3);
    paint(ellPts(bx, by, r, r, 10), { wash: '#BFE6EE', washOp: 200, ink: PAL.ink, sw: .4 });
  }
  const wave = seg(t, 1.3, 3.1) > 0 && t < 3.1;
  const mood = t < 1.3 ? { eyes: 'open', lookX: -1 } : t < 3.1 ? { eyes: 'happy', mouth: 'grin', blush: .8 } : { eyes: 'wide', mouth: 'o', lookX: -1 };
  const arms = wave ? [null, [-3.1, -2.2 + .5 * Math.sin((t - 1.3) * 9), .5]] : undefined;
  octopus(1200, 560 + 22 * Math.sin(t * 1.6), 72, { ...mood, arms, sq: .06 * Math.sin(t * 1.6 + 1) });
  clawd(620, 960, 26, { ...feel(t < 3.1 ? 'happy' : 'surprised', t), view: 'q', aR: t > 1.6 && t < 3.1 ? 1.2 + .3 * Math.sin(t * 9) : .2 });
};
LOOPS['imported/james-banks/octopus'].len = 4;
