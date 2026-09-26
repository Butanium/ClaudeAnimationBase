// Demo (loads lib/rooms/room.js for the backdrop): an evening at the desk. From behind: Clawd on the stool, the code
// types and scrolls, stops, the tests pass (green bar and mark), Clawd cheers, the camera pushes in to zoom ~1.9 on the
// screen. Then the reverse shot: Clawd behind the desk, facing out, lit by the monitor it's looking at.
LOOPS['rooms/desk'] = t => {
  const room = (t, cx) => ROOM.room(t, { tod: .9, floorY: 800, door: false, plant: false, rug: false, clock: { x: 1000, y: 250 },
    lamp: { on: 1, x: 1700 }, window: { x: 1300, w: 330 }, frame: { x: 560 }, shelf: { x: 300, w: 300 } });
  const d = DESK.layout({ x: 960, floorY: 860, u: 24 }), u = d.u;
  if (t < 2.2) {
    camBegin(960, kf(t, [[0, 540], [.9, 540], [1.4, 600]]), kf(t, [[0, 1], [.9, 1], [1.4, 1.9]]));
    const at = room(t);
    DESK.set(t, { x: 960, floorY: 860, u, light: at.light, typing: t < 1.2 ? 1 : 0, code: { rate: 2.6, stop: 1.2, status: { t: 1.3, ok: true } } });
    const e = Math.floor(bpOf(t) * 4), tap = s => t < 1.2 ? -.25 + .18 * (hash(e * 3.1 + s) > .5) : 0;
    const mood = t < 1.45 ? { dy: 0, sq: 0, aL: tap(1), aR: tap(2) } : { ...feel('excited', t), ...take(t, 1.5, .8) };
    clawd(d.sit[0], d.sit[1], u, { ...mood, view: 'back', noLegs: true, tint: '#39406E', tintK: .3 });
    camEnd();
  } else {
    camBegin(1010, 640, 1.35);
    const at = room(t);
    clawd(d.behind[0], d.behind[1], u, { ...emotions(t, [[2.2, 'thinking', { lookX: -.8, lookY: .2 }], [3.05, 'idea'], [3.55, 'happy']]), tint: '#39406E', tintK: .25 });
    DESK.desk(t, d, { light: at.light });
    DESK.monitor(t, d.x - 6 * u, d.topY, u, { light: at.light, back: true });
    DESK.keyboard(t, d.x + 4 * u, d.topY, u, { light: at.light, typing: t > 3.6 ? 1 : 0 });
    DESK.mug(t, d.mug[0] + 2 * u, d.topY, u, { light: at.light });
    DESK.cup(t, d.cup[0], d.topY, u, { light: at.light });
    camEnd();
  }
};
LOOPS['rooms/desk'].len = 4;
