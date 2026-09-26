// Demo: a day passes in the room. The sky outside runs noon → dusk → night and the room darkens with it, the clock
// time-lapses, the lamp flicks on, the door swings open with a lit hall behind it, the knock swings the picture, and the
// camera pushes in to zoom 2 on the window.
LOOPS['rooms/room'] = t => {
  const tod = lerp(.5, .93, ease(seg(t, .2, 2.4)));
  const zoom = kf(t, [[0, 1], [3.35, 1], [3.9, 2]]);
  camBegin(kf(t, [[0, 960], [3.35, 960], [3.9, 1330]]), kf(t, [[0, 540], [3.35, 540], [3.9, 400]]), zoom);
  const at = ROOM.room(t, {
    tod,
    lamp: { on: ROOM.flick(t, 1.9) },
    door: { open: ROOM.swing(t, 2.55, .5), lit: .9 },
    frame: { nudge: 3.05 },
    clock: { rate: 1800 },
    window: { wind: .2 },
  });
  const mood = emotions(t, [[0, 'happy'], [1.2, 'sleepy'], [2.75, 'surprised', { lookX: -.9 }]]);
  clawd(820, at.standY, 24, { ...mood, ...(t > 2.9 ? { view: 'q', flip: true } : {}), tint: '#39406E', tintK: (1 - at.light) * .6 });
  camEnd();
};
LOOPS['rooms/room'].len = 4;
