// Demo (loads lib/rooms/desk.js): A, from behind at desk.js's at-work staging: the hands type in bursts, the code on
// the screen and the keys follow them (typing.typed / keysK), thinking pauses, a return-key slam at each line's end.
// B, the reverse shot, facing out behind the desk: thinks, types (determined), stops, pleased.
LOOPS['actions/typing'] = t => {
  const d = DESK.layout({ x: 960, floorY: 860, u: 24 }), u = d.u, wall = '#E9DCC6', A = t < 3.6;
  const [cx, cy] = [d.behind[0], d.behind[1] - .9 * u];            // B: behind the desk, on a tall chair
  const S = A ? { top: (d.sit[1] - d.topY) / u, seed: 2 } : { top: (cy - d.topY) / u, t0: 4.3, t1: 6.4, seed: 5 };
  if (A) {
    camBegin(960, d.floorY - 6 * u, lerp(1.75, 1.95, ease(t / 3.6)));
    boilSeed('typing demo bg');
    paint(rectPts(-200, -200, W + 400, d.floorY + 200), { wash: wall, ink: null });
    paint(rectPts(-200, d.floorY - 4, W + 400, 600), { wash: '#C9B391', ink: null });
    const pose = typing(t, { ...feel('determined', t), view: 'back', noLegs: true }, S);
    DESK.set(t, { x: d.x, floorY: d.floorY, u, typing: pose.keysK, content: (x, y, w, h) => DESK.code(typing.typed(t, S), x, y, w, h, { rate: 2.8, seed: 3 }) });
    clawd(d.sit[0], d.sit[1], u, pose);
    camEnd();
  } else {
    camBegin(cx - 2.5 * u, d.topY - 2.2 * u, 2 + .04 * Math.sin(t * .6));
    boilSeed('typing demo bg');
    paint(rectPts(-200, -200, W + 400, d.floorY + 200), { wash: wall, ink: null });
    const mood = emotions(t, [[3.6, 'thinking', { lookX: -.7, lookY: -.3 }], [4.2, 'determined', { lookX: -.6, lookY: -.2 }], [6.55, 'proud']]);
    const pose = typing(t, mood, S);
    clawd(cx, cy, u, pose);
    glow(cx - 3 * u, cy - 6 * u, 6 * u, DESK.C.light, .45);         // the screen lights the side of Clawd's face
    DESK.desk(t, d, { closed: true });
    DESK.monitor(t, d.x - 6 * u, d.topY, u, { back: true });
    DESK.keyboard(t, cx, d.topY, u * 1.7, { typing: pose.keysK });  // a wide keyboard: Clawd's fists land at its ends
    DESK.mug(t, cx + 8.5 * u, d.topY, u);
    camEnd();
  }
};
LOOPS['actions/typing'].len = 7.4;
