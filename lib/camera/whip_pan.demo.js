// Demo: Clawd hears something off to the right → whip pan right to a dusk dune, where a party Clawd waves (a close-up
// at zoom 1.8) → whip pan left, back to the meadow (the loop's seam). Whips are centred on t = 1.5 and t = 0 (= 3).
(() => {
  const D = .5, G = 840, GB = 860;
  const A = [[0, PAL.sky], [.5, mixCol(PAL.sky, PAL.cream, .45)], [.58, mixCol(PAL.teal, PAL.sky, .35)], [.7, PAL.sap], [1, mixCol(PAL.sap, PAL.ink, .3)]];
  const B = [[0, PAL.violet], [.32, PAL.rose], [.55, mixCol(PAL.ochre, PAL.rose, .4)], [.72, mixCol(PAL.clayDk, PAL.violet, .45)], [1, mixCol(PAL.violet, PAL.ink, .4)]];
  const edge = (pts, sw = 1) => { for (let i = 0; i + 1 < pts.length; i++) inkLine([pts[i], lerp2(pts[i], pts[i + 1], .5), pts[i + 1]], sw, PAL.ink, 'ink', .4); };
  const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k) + jit(2)];

  function meadow(t, lt, w) {
    camBegin(900 + 30 * Math.sin(t * .7) + w.dx, 540 + w.dy, w.zoom, w.rot);
    boilSeed('A sky');
    paint(rectPts(-1700, -300, W + 3400, H + 600), { wash: A[0][1], ink: null });
    paint(rectPts(-1700, 420, W + 3400, 200), { wash: A[1][1], washOp: 150, ink: null });
    for (let i = 0; i < 5; i++) {   // clouds
      boilSeed('A cloud' + i);
      const x = -900 + i * 900 + 200 * hash(i), y = 150 + 120 * hash(i + 9) + 6 * wob(t, .3, i * .2);
      paint(ellPts(x, y, 150 + 60 * hash(i + 3), 42, 20, 3), { wash: PAL.cream, ink: mixCol(PAL.sky, PAL.ink, .35), sw: .5 });
    }
    boilSeed('A far');
    paint(ellPts(300, 900, 1500, 330, 40, 3), { wash: A[2][1], ink: null });
    paint(ellPts(2500, 920, 1400, 360, 40, 3), { wash: mixCol(A[2][1], PAL.sap, .3), ink: null });
    boilSeed('A ground');
    paint(rectPts(-1700, G - 10, W + 3400, 500, 3), { wash: PAL.sap, ink: null });
    edge([[-1700, G - 8], [-400, G - 14], [900, G - 6], [2200, G - 12], [3600, G - 8]]);
    for (const [x, s] of [[1500, 1], [2300, .8], [3000, 1.1]]) {   // a tree and two bushes for the whip to pass
      boilSeed('A tree' + x);
      if (s === 1) { paint(rectPts(x - 16, G - 230, 32, 225, 2), { wash: mixCol(PAL.clayDk, PAL.ink, .3), ink: PAL.ink, sw: .9 }); }
      paint(ellPts(x, G - (s === 1 ? 300 : 50) * s, 140 * s, (s === 1 ? 120 : 70) * s, 24, 3), { wash: mixCol(PAL.sap, PAL.teal, .4), ink: PAL.ink, sw: .9 });
    }
    const mood = emotions(lt, [[0, 'happy'], [.45, 'surprised', { lookX: .9 }]]);
    clawd(720, G, 26, { ...mood, ...(lt > .95 ? turn(lt, .95, 1.1, 0, .125) : {}) });
    camEnd();
  }

  function dune(t, lt, w) {
    const z = 1.8;
    camBegin(1100 + 12 * Math.sin(t * .9) + w.dx, 700 + w.dy, z * w.zoom, w.rot);
    boilSeed('B sky');
    paint(rectPts(-900, 200, W + 1800, 900), { wash: B[0][1], ink: null });
    paint(rectPts(-900, 560, W + 1800, 180), { wash: B[1][1], ink: null });
    glow(1330, 640, 260, '#FFC766', .9);
    boilSeed('B sun');
    paint(ellPts(1330, 640, 70, 70, 26, 1), { wash: PAL.ochre, ink: PAL.ink, sw: .7 });
    boilSeed('B dunes');
    paint(ellPts(700, 900, 900, 170, 36, 2), { wash: mixCol(PAL.clayDk, PAL.violet, .3), ink: null });
    paint(rectPts(-900, GB - 6, W + 1800, 400, 2), { wash: B[3][1], ink: null });
    edge([[-900, GB - 4], [300, GB - 10], [1100, GB - 4], [2000, GB - 9], [2900, GB - 4]], .7);
    clawd(1100, GB, 20, { ...feel('excited', t), ...move('wave', t), hat: 'party', view: 'q', flip: true, tint: 'rosy', tintK: .5 });
    camEnd();
  }

  LOOPS['camera/whip_pan'] = t => {
    const o1 = { dir: 'right', a: A, b: B }, o2 = { dir: 'left', a: B, b: A };
    if (t < 1.5) {   // shot A: arrives from whip 2 (t < .25), leaves on whip 1 (t > 1.25)
      const [p, o] = t < D / 2 ? [.5 + t / D, o2] : [seg(t, 1.5 - D / 2, 1.5 + D / 2), o1];
      meadow(t, t, whipPan.cam(p, o));
      whipPan(p, o);
    } else {
      const [p, o] = t < 1.5 + D / 2 ? [seg(t, 1.5 - D / 2, 1.5 + D / 2), o1] : [seg(t, 3 - D / 2, 3 + D / 2), o2];
      dune(t, t - 1.5, whipPan.cam(p, { ...o, zoom: 1.8 }));
      whipPan(p, o);
    }
  };
  LOOPS['camera/whip_pan'].len = 3;
})();
