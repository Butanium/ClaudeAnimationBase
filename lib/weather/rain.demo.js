// rain demo: a grey afternoon where the rain sets in on Clawd (splashing on the head, rings on the puddles), then a
// windy night storm that pushes in to a puddle at zoom 2.
(() => {
  const DAY_SKY = '#AFBBCB', NIGHT_PUD = '#3E4C8A';
  function backdrop(night) {
    boilSeed('rain demo sky');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: night ? PAL.night : DAY_SKY, ink: null });
    for (const [x, y, rx, ry] of [[380, 170, 420, 110], [1350, 120, 520, 120], [1900, 230, 300, 90]])
      paint(ellPts(x, y, rx, ry, 26, 8), { wash: night ? mixCol(PAL.night, PAL.indigo, .6) : '#9AA7BA', ink: null });
    boilSeed('rain demo hills');
    paint(ellPts(500, 780, 900, 210, 36, 3), { wash: night ? mixCol(PAL.indigo, PAL.night, .45) : mixCol(PAL.teal, DAY_SKY, .62), ink: null });
    paint(ellPts(1600, 800, 800, 180, 36, 3), { wash: night ? mixCol(PAL.teal, PAL.night, .62) : mixCol(PAL.teal, DAY_SKY, .45), ink: null });
    boilSeed('rain demo ground');
    const G = night ? mixCol(PAL.sap, PAL.night, .62) : mixCol(PAL.sap, '#56645F', .45);
    paint(rectPts(-400, 770, W + 800, 700, 3), { wash: G, ink: null });
    inkLine([[-400, 772], [W / 2, 766], [W + 400, 774]], 1, PAL.ink, 'ink', .5);
  }

  LOOPS['weather/rain'] = t => {
    const night = t >= 4, lt = night ? t - 4 : t;
    const cam = night ? [kf(lt, [[0, 960], [1.1, 960], [2.5, 1190]]), kf(lt, [[0, 540], [1.1, 540], [2.5, 830]]), kf(lt, [[0, 1], [1.1, 1], [2.5, 2.1]])]
      : [960 + 12 * Math.sin(lt * .6), 540, 1.02];
    camBegin(...cam);
    backdrop(night);
    const puddles = [[1200, 868, 170, 30], [470, 905, 120, 22]];
    for (const p of puddles) rain.puddle(p, { col: night ? NIGHT_PUD : undefined });

    const u = 24, x = night ? 760 : 880, gy = 850;
    const mood = night ? feel('nervous', lt, { tint: 'blue', tintK: .5, lookX: .6, emote: null })
      : emotions(lt, [[0, 'neutral', { lookY: -.9, lookX: .3 }], [1.25, 'surprised', { lookY: -.9, emote: null }], [2.1, 'sad', { emote: null, lookY: .3 }]]);
    const sq = mood.sq || 0, top = gy + (mood.dy || 0) * u - 8 * u * (1 - sq), half = 5 * u * (1 + sq * .6);
    const o = night
      ? { intensity: 1, wind: s => .32 + .1 * wob(s, .4), night: true, ground: gy, puddles, puddleCol: NIGHT_PUD, seed: 2 }
      : { intensity: s => kf(s, [[0, .1], [1.1, 1]]), wind: s => .1 + .08 * wob(s, .3), ground: gy, puddles, seed: 1 };
    o.surfaces = [[x + (mood.dx || 0) * u - half, top, x + (mood.dx || 0) * u + half, top]];
    rain(t, { ...o, layer: 'far' });
    clawd(x, gy, u, mood);
    rain(t, { ...o, layer: 'near' });
    camEnd();
  };
  LOOPS['weather/rain'].len = 8;
})();
