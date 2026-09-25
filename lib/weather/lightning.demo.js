// lightning demo: a storm at night. A far strike flickers behind the hills and Clawd flinches when its thunder arrives
// 1.1 s later; then a close one hits the tree: the clouds light up behind the silhouettes, the whole frame flashes, and
// the thunder shakes the camera an instant later, with Clawd's big take.
(() => {
  const FAR = lightning.strike(.5, { from: [1520, 110], to: [1640, 640], size: .6, delay: 1.1, seed: 3, branches: 2 });
  const NEAR = lightning.strike(2.3, { from: [1120, -60], to: [1392, 520], size: 1.1, delay: .16, seed: 8 });
  const CLOUD = mixCol(PAL.night, PAL.indigo, .55);

  LOOPS['weather/lightning'] = t => {
    const [sx, sy] = lightning.shake(t, NEAR, 14);
    camBegin(960 + 10 * Math.sin(t * .5) + sx, 540 + sy, 1.02);
    boilSeed('lightning demo sky');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: PAL.night, ink: null });
    for (let i = 0; i < 6; i++) {   // a low ceiling of cloud, drifting
      const x = -100 + i * 420 + 30 * Math.sin(t * .3 + i), y = 90 + 50 * hash(i + 4);
      boilSeed('lightning demo cloud ' + i);
      paint(ellPts(x, y, 300 + 80 * hash(i), 110 + 30 * hash(i + 9), 26, 10), { wash: i % 2 ? CLOUD : mixCol(CLOUD, PAL.night, .4), ink: null });
    }
    lightning.sky(t, FAR, { a: .6 });
    lightning.sky(t, NEAR);
    lightning.bolt(t, FAR);   // behind the hills
    boilSeed('lightning demo hills');
    paint(ellPts(1650, 820, 700, 200, 36, 3), { wash: mixCol(PAL.indigo, PAL.night, .55), ink: null });
    paint(ellPts(300, 840, 800, 190, 36, 3), { wash: mixCol(PAL.violet, PAL.night, .7), ink: null });
    boilSeed('lightning demo ground');
    paint(rectPts(-400, 780, W + 800, 700, 3), { wash: mixCol(PAL.sap, PAL.night, .7), ink: null });
    inkLine([[-400, 782], [W / 2, 776], [W + 400, 784]], 1, PAL.ink, 'ink', .5);
    // the tree the close strike hits
    boilSeed('lightning demo tree');
    const tree = mixCol(PAL.ink, PAL.night, .35);
    paint(ribbon([[1400, 800], [1390, 700], [1398, 610]], 34, 18), { wash: tree, ink: PAL.ink, sw: .9 });
    paint(ellPts(1395, 560, 120, 90, 24, 4), { wash: tree, ink: PAL.ink, sw: .9 });
    lightning.bolt(t, NEAR);

    const mood = emotions(t, [[0, 'nervous', { lookX: .7, lookY: -.4, emote: null }], [FAR.thunder, 'scared', { lookX: .8 }],
                              [NEAR.thunder, 'surprised', { emote: '!!', lookX: .9 }], [NEAR.thunder + .9, 'scared', { lookX: .6 }]]);
    clawd(640, 840, 26, mood);
    camEnd();
    lightning.flash(t, NEAR);
  };
  LOOPS['weather/lightning'].len = 4;
})();
