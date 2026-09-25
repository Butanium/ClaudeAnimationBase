// Demo: in a painter's corner, Clawd winds up and flicks a brush at the camera; the glob flies at the lens and splats,
// more splats cover the frame, and the paint runs off to show a beach (zoom 1.4). At the loop's seam a teal splat
// covers the beach and soaks away from its first splat back into the studio ('soak').
(() => {
  const D = .8, TA = 1.65, LEN = 3.3, LAND = [1240, 380], G = 900;
  const flick = lt => ({ aR: kf(lt, [[0, .4], [.8, .5], [.98, -.55], [1.08, 1.35], [1.5, 1.1]], ease) });
  const brush = u => { paint(ribbon([[-.2 * u, 0], [1.6 * u, -.05 * u], [3.2 * u, 0]], .45 * u, .3 * u), { wash: PAL.ochre, ink: PAL.ink, sw: .8 });
    paint(ellPts(3.7 * u, 0, .75 * u, .42 * u, 14, .5), { wash: PAL.violet, ink: PAL.ink, sw: .8 }); };

  function studio(t, lt) {
    camBegin(960 + 14 * Math.sin(t * .8), 540, 1.02);
    boilSeed('A wall');
    paint(rectPts(-100, -100, W + 200, G + 100), { wash: mixCol(PAL.cream, PAL.ochre, .3), ink: null });
    paint(rectPts(-100, G - 10, W + 200, 300, 2), { wash: mixCol(PAL.clayDk, PAL.ochre, .35), ink: null });
    inkLine([[-100, G - 8], [960, G - 12], [W + 100, G - 7]], 1, PAL.ink, 'ink', .4);
    boilSeed('A easel');   // an easel with a half-finished painting (colour blocks, no marks that read as letters)
    for (const [a, b] of [[[1380, 900], [1470, 380]], [[1600, 900], [1510, 380]], [[1490, 900], [1490, 420]]]) inkLine([a, b], 1.6, mixCol(PAL.clayDk, PAL.ink, .3), 'ink', 0);
    paint(rectPts(1320, 380, 340, 270, 2), { wash: PAL.cream, ink: PAL.ink, sw: 1 });
    paint(ellPts(1440, 520, 70, 60, 20, 3), { wash: PAL.rose, ink: null });
    paint(rectPts(1350, 580, 280, 50, 3), { wash: PAL.sap, ink: null });
    paint(ellPts(1560, 460, 40, 40, 16, 2), { wash: PAL.ochre, ink: null });
    const u = 26, x = 760, mood = emotions(lt, [[0, 'happy'], [.75, 'mischief'], [1.2, 'laugh']]);
    const arm = flick(lt);
    clawd(x, G, u, { ...mood, aR: arm.aR, armR: lt < 1.08 ? brush : (u2) => paint(ribbon([[-.2 * u2, 0], [1.6 * u2, -.05 * u2], [3.2 * u2, 0]], .45 * u2, .3 * u2), { wash: PAL.ochre, ink: PAL.ink, sw: .8 }) });
    // the glob: leaves the brush tip and flies at the lens, growing
    const k = seg(lt, 1.08, TA - D / 2);
    if (k > 0 && k < 1) {
      boilSeed('A glob');
      const tip = toScreen(x + 4.9 * u + Math.cos(1.35) * 6 * u, G - 4.5 * u - Math.sin(1.35) * 6 * u);
      camEnd();
      const q = easeIn(k), p = arcPt(tip, LAND, 160, easeOut(k)), r = lerp(14, 150, q);
      paint(ellPts(p[0], p[1], r, r * .9, 18, 1), { wash: PAL.violet, ink: PAL.ink, sw: .8, curv: .4 });
    } else camEnd();
  }

  function beach(t, lt) {
    camBegin(1000 + 20 * Math.sin(t * .6), 620, 1.4);
    boilSeed('B sky');
    paint(rectPts(-100, -100, W + 200, 700), { wash: PAL.sky, ink: null });
    glow(1400, 330, 220, '#FFC766', .8);
    paint(ellPts(1400, 330, 60, 60, 24, 1), { wash: mixCol(PAL.ochre, PAL.cream, .4), ink: PAL.ink, sw: .7 });
    boilSeed('B sea');
    paint(rectPts(-100, 590, W + 200, 120, 2), { wash: PAL.teal, ink: null });
    for (let i = 0; i < 6; i++) paint(ribbon([[300 + i * 260 + 40 * wob(t, .4, i * .3), 640 + 18 * hash(i)], [360 + i * 260 + 40 * wob(t, .4, i * .3), 636 + 18 * hash(i)], [420 + i * 260 + 40 * wob(t, .4, i * .3), 640 + 18 * hash(i)]], 5, 2), { wash: mixCol(PAL.teal, PAL.cream, .5), ink: null });
    boilSeed('B sand');
    paint(rectPts(-100, 700, W + 200, 500, 2), { wash: mixCol(PAL.ochre, PAL.cream, .55), ink: null });
    inkLine([[-100, 702], [960, 696], [W + 100, 703]], .8, PAL.ink, 'ink', .4);
    clawd(1000, 790, 22, feel('cool', t));
    camEnd();
  }

  LOOPS['camera/blot_wipe'] = t => {
    const o1 = { x: LAND[0], y: LAND[1] }, o2 = { x: 1500, y: 300, cols: [PAL.teal, mixCol(PAL.teal, PAL.indigo, .5), PAL.sky], clear: 'soak', seed: 3 };
    if (t < TA) {
      studio(t, t);
      if (t < D / 2) blotWipe(.5 + t / D, o2);
      if (t > TA - D / 2) blotWipe(seg(t, TA - D / 2, TA + D / 2), o1);
    } else {
      beach(t, t - TA);
      if (t < TA + D / 2) blotWipe(seg(t, TA - D / 2, TA + D / 2), o1);
      if (t > LEN - D / 2) blotWipe(seg(t, LEN - D / 2, LEN + D / 2), o2);
    }
  };
  LOOPS['camera/blot_wipe'].len = LEN;
})();
