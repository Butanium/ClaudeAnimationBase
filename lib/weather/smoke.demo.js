// smoke demo: a chilly evening. Clawd holds a hot mug, steam curling up from it; behind, the cottage's chimney smoke
// drifts left, and a gust at ~2.2 s bends the plume and the steam together before they straighten up again.
(() => {
  const gy = 860, u = 26, cx = 700, aR = .45;
  const wind = s => -.2 - 1.1 * Math.exp(-(((s - 2.6) / .7) ** 2));   // steam: dx per px risen
  const gust = s => 60 * wind(s);                                       // plume: px/s sideways
  function mug(u, sw) {   // drawn at the arm tip, turned back upright
    push(); rotate(aR);
    paint(rrPts(-1.1 * u, -2.3 * u, 2.2 * u, 2.4 * u, .35 * u), { wash: PAL.teal, ink: PAL.ink, sw: sw * .8 });
    paint(ellPts(0, -2.25 * u, 1.05 * u, .28 * u, 14), { wash: '#6B4A3A', ink: PAL.ink, sw: sw * .5 });
    pop();
  }

  LOOPS['weather/smoke'] = t => {
    camBegin(960 + 10 * Math.sin(t * .5), 540, 1.02);
    boilSeed('smoke demo sky');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: mixCol(PAL.sky, PAL.violet, .35), ink: null });
    paint(ellPts(960, 820, 1500, 260, 36, 6), { wash: mixCol(PAL.rose, PAL.cream, .45), ink: null });
    boilSeed('smoke demo hills');
    paint(ellPts(1500, 880, 900, 220, 36, 3), { wash: mixCol(PAL.teal, PAL.violet, .45), ink: null });
    boilSeed('smoke demo ground');
    paint(rectPts(-400, 830, W + 800, 600, 3), { wash: mixCol(PAL.sap, PAL.violet, .3), ink: null });
    inkLine([[-400, 832], [W / 2, 826], [W + 400, 834]], 1, PAL.ink, 'ink', .5);
    // the cottage
    boilSeed('smoke demo cottage');
    paint(rectPts(1300, 560, 170, 150, 2), { wash: mixCol(PAL.clayDk, PAL.violet, .3), ink: PAL.ink, sw: .9 });   // chimney
    paint(rectPts(1180, 640, 420, 200, 2), { wash: PAL.cream, ink: PAL.ink, sw: 1 });
    paint([[1150, 650], [1390, 480], [1630, 650]], { wash: PAL.clayDk, ink: PAL.ink, sw: 1 });
    paint(rrPts(1250, 700, 80, 80, 8), { wash: PAL.ochre, ink: PAL.ink, sw: .8 });
    paint(rrPts(1450, 730, 70, 110, 6), { wash: mixCol(PAL.clayDk, PAL.ink, .3), ink: PAL.ink, sw: .8 });
    smoke.plume(t, 1385, 560, { wind: gust });

    const m = feel('relieved', t, { emote: null });
    const bob = -.15 * Math.abs(Math.sin(bpOf(t) * Math.PI)), sq = .03 * Math.sin(t * TAU * .35);
    clawd(cx, gy, u, { ...m, dy: bob, sq, rot: 0, aR, aL: -.6, lookX: .3, lookY: -.5, armR: mug });
    // the mug's rim, from the same pose: arm pivot (4.9u, -4.5u), 2.2u along the arm, then 2.3u up to the rim
    const tipX = cx + (4.9 + 2.2 * Math.cos(aR)) * u * (1 + sq * .6), tipY = gy + bob * u + (-4.5 - 2.2 * Math.sin(aR)) * u * (1 - sq);
    smoke.steam(t, tipX, tipY - 2.3 * u * (1 - sq), { w: 2 * u, wind });
    camEnd();
  };
  LOOPS['weather/smoke'].len = 4.5;
})();
