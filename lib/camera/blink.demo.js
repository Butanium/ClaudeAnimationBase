// Demo: night, a sleepy Clawd by a lamp; Clawd-coloured lids flutter and close (Clawd's point of view) → morning in the
// same room: the lids crack open, droop, and open on a happy, stretching Clawd. At the loop's seam, a plain blink
// (flutter: false) with dark lids.
(() => {
  const D = 1.2, S = 1.6, LEN = 3.2, G = 860;
  function room(t, night) {
    camBegin(960 + 8 * Math.sin(t * .6), 540, night ? 1.08 : 1.02);
    boilSeed('wall');
    paint(rectPts(-100, -100, W + 200, G + 100), { wash: night ? mixCol(PAL.indigo, PAL.night, .4) : mixCol(PAL.cream, PAL.ochre, .35), ink: null });
    boilSeed('window');
    paint(rectPts(1180, 170, 420, 330, 2), { wash: night ? PAL.night : PAL.sky, ink: PAL.ink, sw: 1.1 });
    if (night) { glow(1300, 260, 110, '#FFF1C8', .6); paint(ellPts(1300, 260, 34, 34, 18, 1), { wash: PAL.cream, ink: PAL.ink, sw: .6 }); }
    else { glow(1480, 280, 200, '#FFD27A', .5); paint(ellPts(1480, 280, 46, 46, 20, 1), { wash: PAL.ochre, ink: PAL.ink, sw: .7 }); }
    inkLine([[1390, 172], [1390, 498]], 1.1, PAL.ink, 'ink', 0); inkLine([[1182, 335], [1598, 335]], 1.1, PAL.ink, 'ink', 0);
    boilSeed('floor');
    paint(rectPts(-100, G - 8, W + 200, 400, 2), { wash: night ? mixCol(PAL.clayDk, PAL.night, .5) : mixCol(PAL.clayDk, PAL.ochre, .35), ink: null });
    inkLine([[-100, G - 6], [960, G - 10], [W + 100, G - 5]], 1, PAL.ink, 'ink', .4);
    boilSeed('lamp');
    inkLine([[430, G - 4], [430, G - 330]], 2.2, PAL.ink, 'ink', 0);
    paint([[360, G - 320], [500, G - 320], [465, G - 420], [395, G - 420]], { wash: night ? PAL.ochre : mixCol(PAL.ochre, PAL.cream, .4), ink: PAL.ink, sw: 1 });
    if (night) glow(430, G - 330, 260, '#FFC766', .8);
    clawd(860, G, 28, night ? feel('sleepy', t) : { ...feel('happy', t), ...move('roof', t) });
    camEnd();
  }
  LOOPS['camera/blink'] = t => {
    const o1 = { col: mixCol(PAL.clay, PAL.clayDk, .25) }, o2 = { flutter: false };
    if (t < S) {
      room(t, true);
      if (t < D / 4) blinkWipe(.5 + t / (D / 2), o2);                 // plain blink: .6 s long
      if (t > S - D / 2) blinkWipe(seg(t, S - D / 2, S + D / 2), o1);
    } else {
      room(t, false);
      if (t < S + D / 2) blinkWipe(seg(t, S - D / 2, S + D / 2), o1);
      if (t > LEN - D / 4) blinkWipe(seg(t, LEN - D / 4, LEN + D / 4), o2);
    }
  };
  LOOPS['camera/blink'].len = LEN;
})();
