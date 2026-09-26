// dust demo: on a dirt track, Clawd hops and lands (landing puff), winds up with spinning feet (kick), launches
// (the cloud left behind), dashes right and skids to a stop (skid), then turns to camera, proud.
(() => {
  const u = 24, gy = 800, X0 = 470, V = 1400, A = .07;
  const tJ0 = .25, tJ1 = .85, tW = 1.35, tGo = 1.95, tSk = 2.45, SK = .6, tStop = tSk + SK;
  const dashEnd = X0 + V * (tSk - tGo - A * (1 - Math.exp(-(tSk - tGo) / A)));
  // Clawd's x: still, a dash with a quick start, then a skid that decelerates evenly from the dash speed
  const xAt = t => {
    if (t < tGo) return X0;
    if (t < tSk) { const s = t - tGo; return X0 + V * (s - A * (1 - Math.exp(-s / A))); }
    const k = seg(t, tSk, tStop); return dashEnd + V * SK / 2 * (1 - (1 - k) ** 2);
  };

  function backdrop() {
    boilSeed('dust demo sky');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: mixCol(PAL.sky, PAL.cream, .35), ink: null });
    boilSeed('dust demo mesas');
    paint([[-300, 700], [-100, 520], [260, 500], [420, 600], [700, 610], [820, 700]], { wash: mixCol(PAL.clayLt, PAL.cream, .45), ink: null });
    paint([[1100, 700], [1250, 470], [1650, 455], [1760, 560], [2200, 580], [2250, 700]], { wash: mixCol(PAL.clay, PAL.cream, .55), ink: null });
    boilSeed('dust demo ground');
    paint(rectPts(-400, 690, W + 800, 800, 3), { wash: '#A98A64', ink: null });
    paint(rectPts(-400, 850, W + 800, 600, 3), { wash: '#977856', ink: null });
    inkLine([[-400, 692], [W / 2, 686], [W + 400, 694]], 1, PAL.ink, 'ink', .5);
  }

  LOOPS['weather/dust'] = t => {
    camBegin(960 + 8 * Math.sin(t * .7), 520, 1.02);
    backdrop();
    const x = xAt(t);
    const mood = emotions(t, [[0, 'happy'], [tW, 'determined'], [tSk + .08, 'surprised', { emote: null }], [tStop + .25, 'proud']]);
    let pose = {};
    if (t < tW) pose = jump(t, tJ0, tJ1, 4);
    else if (t < tGo) {   // wind-up: turn to the right, crouch, lean back, feet spinning in place
      const k = ease(seg(t, tW, tW + .2));
      pose = { ...turn(t, tW, tW + .12, 0, .25), sq: .14 * k, rot: -.1 * k + .02 * Math.sin(t * 60), walk: (t - tW) * 9, aL: -.6 };
    } else if (t < tSk) {   // the dash: lean in, stretch, smear
      const k = seg(t, tGo, tGo + .1);
      pose = { view: 'side', rot: .13 * k, sq: -.12 * k, smear: .7 * k, smearDir: 1, walk: (x - X0) / (3 * u), aL: .9, dy: -.4 * Math.abs(Math.sin((x - X0) / (1.5 * u))) };
    } else if (t < tStop) {   // the skid: feet planted, leaning back hard
      const k = seg(t, tSk, tSk + .08);
      pose = { view: 'side', rot: -.2 * k, sq: .12 * k, aL: 1.2, smear: .4 * (1 - seg(t, tSk, tSk + .25)), smearDir: 1 };
    } else {   // stop: rock forward and settle, then turn to camera
      const a = t - tStop;
      pose = { ...(t < 3.55 ? { view: 'side' } : turn(t, 3.55, 3.7, .25, 0)), rot: .14 * Math.exp(-5 * a) * Math.sin(12 * a + .3) - .2 * Math.exp(-14 * a) };
    }
    clawd(x, gy, u, { ...mood, ...pose, sq: (mood.sq || 0) + (pose.sq || 0), dy: (mood.dy || 0) * (t > tW && t < tStop ? .2 : 1) + (pose.dy || 0) });
    dust.land(t, tJ1, X0, gy, { spread: 100 });
    dust.kick(t, tW + .15, tGo, [X0 - 1.5 * u, gy], 1);
    dust.skid(t, tSk, tStop, s => [xAt(s) + 1.6 * u, gy]);
    camEnd();
  };
  LOOPS['weather/dust'].len = 4.2;
})();
