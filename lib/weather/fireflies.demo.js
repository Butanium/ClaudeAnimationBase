// fireflies demo: a meadow at dusk. Clawd watches the swarm; one firefly comes down to sit on Clawd's head (Clawd's eyes
// follow it up, then love), leaves, and the whole swarm starts blinking together on the beat.
(() => {
  const gy = 880, u = 30, cx = 960;
  const F = { n: 14, area: [960, 520, 760, 250], seed: 4, sync: s => seg(s, 3.7, 4.1), visit: { i: 0, t0: 1.2, t1: 3.3, at: null } };
  const mood = t => emotions(t, [[0, 'hopeful'], [2.15, 'love', { emote: null }], [3.45, 'happy']]);
  const head = t => { const m = mood(t); return [cx + 1.2 * u, gy + (m.dy || 0) * u - 8 * u * (1 - (m.sq || 0))]; };
  F.visit.at = head;

  LOOPS['weather/fireflies'] = t => {
    camBegin(960 + 14 * Math.sin(t * .4), 540, 1.02);
    boilSeed('fireflies demo sky');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: mixCol(PAL.night, PAL.indigo, .3), ink: null });
    paint(ellPts(960, 760, 1500, 240, 36, 6), { wash: mixCol(PAL.violet, PAL.night, .45), ink: null });
    for (let i = 0; i < 18; i++) {
      boilSeed('fireflies demo star ' + i);
      const tw = .6 + .4 * Math.sin(t * (1.5 + hash(i + 50)) + i);
      paint(starPts(hash(i + 20) * W, 40 + hash(i + 30) * 380, (2.5 + 3 * hash(i + 40)) * tw, .35, 4), { wash: PAL.cream, ink: null });
    }
    boilSeed('fireflies demo hills');
    paint(ellPts(420, 900, 820, 200, 36, 3), { wash: mixCol(PAL.teal, PAL.night, .72), ink: null });
    paint(ellPts(1560, 910, 760, 180, 36, 3), { wash: mixCol(PAL.sap, PAL.night, .7), ink: null });
    boilSeed('fireflies demo ground');
    paint(rectPts(-400, 850, W + 800, 600, 3), { wash: mixCol(PAL.sap, PAL.night, .62), ink: null });
    inkLine([[-400, 852], [W / 2, 846], [W + 400, 854]], 1, PAL.ink, 'ink', .5);
    const [fx, fy] = fireflies.at(0, t, F), m = mood(t);
    clawd(cx, gy, u, { ...m, lookX: clamp((fx - cx) / 350, -1, 1), lookY: clamp((fy - (gy - 6 * u)) / 250, -1, 1) });
    fireflies(t, F);
    camEnd();
  };
  LOOPS['weather/fireflies'].len = 5;
})();
