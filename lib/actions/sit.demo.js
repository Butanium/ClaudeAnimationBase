// Demo: three seats. Left: sits down on the floor with a sigh and gets back up. Middle: on a bench in 3/4 view, feet planted.
// Right: hops up onto a wall, kicks its legs, hops back down. The camera drifts in to zoom ~1.5.
LOOPS['actions/sit'] = t => {
  const u = 24, gy = 800;
  camBegin(960 + 30 * Math.sin(t * .5), 640, 1.45 + .05 * Math.sin(t * .4));
  boilSeed('sit demo bg');
  paint(rectPts(-40, -40, W + 80, gy + 40), { wash: '#EFE3CF', ink: null });                        // back wall
  paint(rectPts(-40, gy - 4, W + 80, H - gy + 60), { wash: '#D9C7A6', ink: null });                 // floor
  inkLine([[-20, gy + 2], [W / 2, gy - 2], [W + 20, gy + 3]], 1.1, PAL.ink, 'ink', .4);
  // the bench (h = 1.4) and the wall (h = 5.5)
  const sx = 960, wx = 1440, hs = 1.4, hw = 5.5, wood = '#B98A5A', stone = '#A9A3B8', seam = c => mixCol(c, PAL.ink, .45);
  boilSeed('sit demo bench');
  paint(rectPts(sx - 7.5 * u, gy - hs * u, 15 * u, hs * u, 2), { wash: wood, ink: PAL.ink, sw: 1 });
  inkLine([[sx - 7.2 * u, gy - hs * u * .5], [sx + 7.2 * u, gy - hs * u * .45]], .5, seam(wood), 'inkfine', .3);
  boilSeed('sit demo wall');
  paint(rectPts(wx - 7 * u, gy - hw * u, 14 * u, hw * u, 2), { wash: stone, ink: PAL.ink, sw: 1.1 });
  const rows = 4, rh = hw * u / rows;
  for (let r = 1; r < rows; r++) inkLine([[wx - 6.8 * u, gy - hw * u + r * rh], [wx + 6.8 * u, gy - hw * u + r * rh]], .45, seam(stone), 'inkfine', .2);
  for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) {
    const bx = wx - 7 * u + (c + (r % 2 ? .5 : 1)) * 3.5 * u;
    if (bx < wx + 6.6 * u) inkLine([[bx, gy - hw * u + r * rh + 2], [bx, gy - hw * u + (r + 1) * rh - 2]], .45, seam(stone), 'inkfine', 0);
  }

  // left: sits down on the floor at 1.1 s, gets up at 4.2 s
  const moodL = emotions(t, [[0, 'neutral'], [1.25, 'relieved'], [4.0, 'determined']], { take: .5 });
  clawd(470, gy, u, sit(t, moodL, { h: 0, t0: 1.1, t1: 4.2 }));
  // middle: on the bench the whole time
  clawd(sx, gy, u, sit(t, feel('thinking', t, { seed: 2, view: 'q' }), { h: hs }));
  // right: hops up at 1.5 s, kicks, hops down at 4.5 s
  const moodR = emotions(t, [[0, 'hopeful'], [1.6, 'happy'], [4.3, 'playful']], { take: .6 });
  clawd(wx, gy, u, sit(t, { ...moodR, seed: 4 }, { h: hw, t0: 1.5, t1: 4.5 }));
  camEnd();
};
LOOPS['actions/sit'].len = 5.8;
