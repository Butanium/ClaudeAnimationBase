// Demo (loads lib/weather/rain.js): A, a rain shower: Clawd under the umbrella, the drops splash on the canopy (held.canopy
// → rain surfaces) and it's dry underneath; a gust leans the umbrella over. B, a sunny walk with a balloon: it trails
// behind while Clawd walks, bobs when it stops, and jerks and bounces back when Clawd hops.
LOOPS['actions/held'] = t => {
  const u = 24, gy = 860, A = t < 3.4;
  if (A) {
    camBegin(960, 560, 1.25);
    boilSeed('held demo A bg');
    paint(rectPts(-300, -300, W + 600, gy + 300), { wash: '#B4BFCE', ink: null });
    paint(ellPts(500, gy - 40, 800, 150, 30, 3), { wash: mixCol(PAL.teal, '#B4BFCE', .55), ink: null });
    paint(rectPts(-300, gy - 4, W + 600, 700, 3), { wash: mixCol(PAL.sap, '#56645F', .45), ink: null });
    inkLine([[-300, gy], [W / 2, gy - 4], [W + 300, gy + 2]], 1, PAL.ink, 'ink', .5);
    const puddle = [1180, gy + 50, 150, 26];
    rain.puddle(puddle);
    const wind = Math.max(0, Math.sin(Math.PI * seg(t, 1.6, 2.9)));      // a gust
    const mood = emotions(t, [[0, 'happy'], [1.75, 'surprised', { emote: null }], [2.7, 'relieved']], { take: .5 });
    const o = held.umbrella(t, mood, { col: PAL.rose, wind });
    const R = { intensity: .9, wind: .1 + .6 * wind, ground: gy, puddles: [puddle], seed: 3, surfaces: held.canopy(900, gy, u, o) };
    rain(t, { ...R, layer: 'far' });
    clawd(900, gy, u, o);
    rain(t, { ...R, layer: 'near' });
    camEnd();
  } else {
    const lt = t - 3.4;
    const xAt = s => lerp(560, 1180, ease(seg(s, .2, 2)));
    const vx = (xAt(lt + .03) - xAt(lt - .03)) / .06 / u;
    camBegin(lerp(860, 1060, ease(seg(lt, 0, 2.4))), 520, 1.3);
    boilSeed('held demo B bg');
    paint(rectPts(-300, -300, W + 600, gy + 300), { wash: '#BFDDF0', ink: null });
    paint(ellPts(1300, gy - 30, 900, 170, 30, 3), { wash: mixCol(PAL.sap, '#BFDDF0', .45), ink: null });
    paint(rectPts(-300, gy - 4, W + 600, 700, 3), { wash: mixCol(PAL.sap, '#E8D9A8', .35), ink: null });
    inkLine([[-300, gy], [W / 2, gy - 3], [W + 300, gy + 2]], 1, PAL.ink, 'ink', .5);
    const walk = stroll(lt, .2, 2, 560, 1180, u), hop = jump(lt, 2.35, 2.75, 2.5);
    const mood = feel(lt < 2.1 ? 'happy' : 'excited', lt);
    const o = { ...mood, ...walk, dy: (mood.dy || 0) * .4 + walk.dy + hop.dy, sq: (mood.sq || 0) + hop.sq };
    const vy = (jump(lt + .02, 2.35, 2.75, 2.5).dy - jump(lt - .02, 2.35, 2.75, 2.5).dy) / .04;
    clawd(walk.x, gy, u, held.balloon(lt, o, { col: PAL.rose, vx, vy, tugs: [2.75], seed: 1 }));
    camEnd();
  }
};
LOOPS['actions/held'].len = 6.8;
