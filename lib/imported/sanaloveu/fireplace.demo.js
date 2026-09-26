LOOPS['imported/sanaloveu/fireplace'] = t => {
  boilSeed('fire bg');
  paint(rectPts(-80, -80, W + 160, 1000), { wash: '#5E4036', ink: null });
  paint(rectPts(-80, 900, W + 160, 300), { wash: '#65402F', ink: PAL.ink, sw: .8 });
  // the fire catches, then burns
  const lit = kf(t, [[0, .15], [1.4, 1]], easeOut);
  fireplace(860, 920, 1.3, t, { lit });
  clawd(1460, 960, 26, { ...emotions(t, [[0, 'neutral', { lookX: -1 }], [1.6, 'relieved', { lookX: -1 }]]), view: 'q', flip: true, boilKey: 'warm' });
};
LOOPS['imported/sanaloveu/fireplace'].len = 4;
