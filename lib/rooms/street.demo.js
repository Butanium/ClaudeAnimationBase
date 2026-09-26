// Demo: dusk turns to night on a town street. The lamps come on one after another down the street, windows switch on
// and off, a neon sign pulses on the beat, Clawd strolls along the pavement behind a lamp post while the camera pans
// (the skyline slides by parallax), then the camera pushes in to zoom ~1.9.
LOOPS['rooms/street'] = t => {
  const o = { night: lerp(.5, 1, ease(seg(t, 0, 1.6))), lampsOn: .8 };
  camBegin(kf(t, [[0, 820], [3.3, 1480], [3.9, 1250]]), kf(t, [[0, 540], [3.3, 540], [3.9, 650]]), kf(t, [[0, 1], [3.3, 1], [3.9, 1.9]]));
  STREET.draw(t, o);
  const w = stroll(t, .3, 3.1, 640, 1300, 24), moving = t > .3 && t < 3.1;
  clawd(w.x, STREET.groundY(o), 24, { ...feel(t < 3.2 ? 'neutral' : 'happy', t), ...(moving ? { view: 'side', walk: w.walk, dy: w.dy } : {}), tint: '#39406E', tintK: .3 * o.night });
  STREET.front(t, o);
  camEnd();
};
LOOPS['rooms/street'].len = 4;
