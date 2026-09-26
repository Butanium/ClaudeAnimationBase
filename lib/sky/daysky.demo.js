// Demo: one full day in 8 s (tod = t / 8): night → dawn → day → dusk → night, with Clawd on a meadow hill acting the
// time of day. The ground is tinted with DaySky.light(tod), so it darkens and warms with the sky.
LOOPS['sky/daysky'] = t => {
  const tod = frac(t / 8), L = DaySky.light(tod);
  camBegin(960 + 40 * Math.sin(t * TAU / 8), 540, 1.02);
  DaySky.draw(t, tod);
  const shade = (c, far) => mixCol(mixCol(c, L.zen, .6 * L.dim), L.hor, far);
  boilSeed('far hill');
  paint(ellPts(1450, 930, 1000, 260, 40, 2), { wash: shade('#8FB27A', .45), ink: null });
  boilSeed('meadow');
  paint(ellPts(700, 1100, 1350, 320, 48, 2), { wash: shade(PAL.sap, .08), ink: PAL.ink, sw: 1 });
  const x = 820, gy = 1100 - 320 * Math.sqrt(1 - ((x - 700) / 1350) ** 2) + 6;
  clawd(x, gy, 22, emotions(t, [[0, 'sleepy'], [1.85, 'hopeful', { lookX: -.7, lookY: -.3 }], [3.2, 'happy'], [5.7, 'relieved', { lookX: .6 }], [6.9, 'sleepy']]));
  camEnd();
};
LOOPS['sky/daysky'].len = 8;
