LOOPS['imported/bianbianzhu/beach'] = t => {
  const B = BEACH, C = B.C;
  boilSeed('beach sky');
  paint(rectPts(-80, -80, W + 160, 700), { wash: '#BFE3F0', ink: null });
  paint(rectPts(-80, 380, W + 160, 240), { wash: '#FBE7C6', washOp: 150, ink: null });
  B.sun(1560, 210, 90, t, 'happy', { beat: pulse(t) });
  B.gull(lerp(-120, 2040, t / 4), 170 + 30 * Math.sin(t * 2), 60, t * 2, 'a');
  B.gull(lerp(-500, 1700, t / 4), 250 + 20 * Math.sin(t * 2 + 1), 42, t * 2.3 + .4, 'b');
  B.sea(t, -80, W + 80, 560, 780);
  boilSeed('beach sand');
  paint(rectPts(-80, 760, W + 160, H - 700), { wash: C.sand, ink: null });
  B.shoreline(t, -80, W + 80, 820);
  B.palm(300, 1000, 560, Math.sin(t * TAU / 4));
  B.parasol(1480, 1010, 200, ease(seg(t, .2, 1.4)), -.08);
  // a volleyball bounced on Clawd's head every beat
  const k = frac(bpOf(t)), top = 980 - 8 * 24;
  clawd(900, 980, 24, { ...feel('playful', t), lookY: -1, sq: .12 * Math.exp(-12 * k) });
  B.vball(900 + 30 * Math.sin(t * Math.PI), top - 44 - 260 * 4 * k * (1 - k), 44, t * 3);
};
LOOPS['imported/bianbianzhu/beach'].len = 4;
