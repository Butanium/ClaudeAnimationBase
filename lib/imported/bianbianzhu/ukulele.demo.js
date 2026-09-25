LOOPS['imported/bianbianzhu/ukulele'] = t => {
  boilSeed('uke bg');
  paint(rectPts(-80, -80, W + 160, 820), { wash: '#F6DDB8', ink: null });
  paint(ellPts(700, 1160, 1300, 420, 40, 2), { wash: '#E9C58C', ink: PAL.ink, sw: .8 });
  // playing: strums on the beat, sings, then lifts the neck for a big finish
  const mood = emotions(t, [[0, 'happy'], [2.3, 'excited']]);
  const tilt = kf(t, [[2.5, 0], [2.9, .38], [3.6, .38], [3.95, 0]], backOut);
  UKULELE.player(700, 950, 40, mood, { mouth: UKULELE.sing(t), tilt, ring: t > 2.9 && t < 3.6 ? 1 : undefined });
  // travelling: the uke slung on the back (side view)
  const x = lerp(1250, 1780, t / 4), walk = bpOf(t) * 2;
  clawd(x, 900, 22, { ...feel('happy', t), view: 'side', walk, dy: -Math.abs(Math.sin(walk * Math.PI)) * .5, boilKey: 'walker',
    draw: (u, sw) => UKULELE.back(u, sw, 'side') });
};
LOOPS['imported/bianbianzhu/ukulele'].len = 4;
