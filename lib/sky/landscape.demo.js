// Demo (loads lib/sky/daysky.js too, for the sky and its light): the camera pans across the landscape and back, then
// pushes in to zoom ~1.9 on Clawd, while the day runs from late morning to dusk. Far layers barely move, the meadow
// moves with Clawd, the foreground grass slides past fastest.
LOOPS['sky/landscape'] = t => {
  const tod = lerp(.4, .77, ease(seg(t, .5, 7.5))), L = DaySky.light(tod), x = 1000, gy = Landscape.groundY(x);
  const cx = kf(t, [[0, 560], [2.4, 1440], [3.4, 1440], [4.8, x], [7.4, 560]]), cy = kf(t, [[0, 540], [3.4, 540], [4.8, gy - 90], [6.2, gy - 90], [7.4, 540]]);
  camBegin(cx, cy, kf(t, [[0, 1], [3.4, 1], [4.8, 1.9], [6.2, 1.9], [7.4, 1]]));
  DaySky.draw(t, tod);
  Landscape.draw(t, { light: L });
  clawd(x, gy, 22, emotions(t, [[0, 'happy', { lookX: .5 }], [2.2, 'excited', { lookX: .8 }], [4.7, 'starstruck'], [6.4, 'relieved']]));
  Landscape.front(t, { light: L });
  camEnd();
};
LOOPS['sky/landscape'].len = 8;
