// snow demo: a grey winter afternoon of steady snow; it settles on the ground and grows into a cap on Clawd's
// head (flakes land on it and melt in) while Clawd tries to catch one on the tongue. Then night: a steady fall, and the
// camera pushes in to zoom 2 on the capped head.
(() => {
  const gy = 860, u = 26, cx = 900;
  function backdrop(night) {
    boilSeed('snow demo sky');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: night ? mixCol(PAL.night, PAL.indigo, .35) : '#8D9BB0', ink: null });
    boilSeed('snow demo hills');
    paint(ellPts(420, 830, 900, 220, 36, 3), { wash: night ? mixCol(PAL.indigo, PAL.night, .3) : '#AEB9C8', ink: null });
    paint(ellPts(1560, 850, 780, 190, 36, 3), { wash: night ? mixCol(PAL.teal, PAL.night, .6) : '#9EABBD', ink: null });
    boilSeed('snow demo ground');
    paint(rectPts(-400, gy - 20, W + 800, 600, 3), { wash: night ? '#56618E' : '#DDE3EA', ink: null });
    for (const [x, h] of [[260, 150], [1480, 190], [1700, 130]]) {   // pines
      boilSeed('snow demo pine ' + x);
      const c = night ? mixCol(PAL.teal, PAL.night, .7) : mixCol(PAL.teal, PAL.ink, .35);
      paint([[x, gy - 30 - h], [x + h * .32, gy - 30], [x - h * .32, gy - 30]], { wash: c, ink: PAL.ink, sw: .8 });
      snow.cover(x - h * .16, x + h * .16, gy - 30 - h * .5, 10, { key: 'pine cap ' + x });
    }
  }

  LOOPS['weather/snow'] = t => {
    const night = t >= 4, lt = night ? t - 4 : t;
    const cam = night ? [kf(lt, [[0, 960], [1, 960], [2.6, cx]]), kf(lt, [[0, 540], [1, 540], [2.6, gy - 7 * u]]), kf(lt, [[0, 1], [1, 1], [2.6, 2]])]
      : [960 + 10 * Math.sin(lt * .5), 540, 1.02];
    camBegin(...cam);
    backdrop(night);
    const groundD = night ? 22 : 4 + 4.5 * lt, capD = night ? 34 : Math.min(30, 9 * Math.max(0, lt - .6));
    boilSeed('snow demo cover');
    snow.cover(-300, W + 300, gy - 20, groundD, { key: 'ground cover', ink: null });

    const mood = night ? feel('relieved', lt, { emote: null, lookY: -.3 })
      : emotions(lt, [[0, 'surprised', { lookY: -1, emote: null }], [1, 'happy'], [2.2, 'playful', { lookY: -1, lookX: .2 }]]);
    const top = gy + (mood.dy || 0) * u - 8 * u * (1 - (mood.sq || 0)), half = 5 * u * (1 + (mood.sq || 0) * .6), x = cx + (mood.dx || 0) * u;
    const o = night
      ? { intensity: .8, wind: s => .1 + .05 * wob(s, .2), night: true, ground: gy - 20 - groundD, seed: 2 }
      : { intensity: .9, wind: s => .06 + .08 * wob(s, .25), ground: gy - 20 - groundD, seed: 1 };
    o.surfaces = [[x - half, top - capD * .8, x + half, top - capD * .8]];
    snow(t, { ...o, layer: 'far' });
    clawd(cx, gy, u, { ...mood, draw: (uu, sw) => snow.cover(-5 * uu, 5 * uu, -8 * uu, capD, { key: 'cap' }) });
    snow(t, { ...o, layer: 'near' });
    camEnd();
  };
  LOOPS['weather/snow'].len = 8;
})();
