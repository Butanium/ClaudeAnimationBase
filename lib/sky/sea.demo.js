// Demo (loads parallax.js, daysky.js and landscape.js too): a beach from dawn through day and dusk into night, the
// glitter path following the sun and then the moon; then a calm lake below a forest edge, mirrored in it, with a push
// in to zoom 2 on Clawd at the water's edge.
LOOPS['sky/sea'] = t => {
  if (t < 6.5) {
    const tod = lerp(.24, .98, t / 6.5);
    camBegin(960 + 60 * Math.sin(t * .5), 540, 1.03);
    const sky = { horizon: 640, clouds: 3 };
    DaySky.draw(t, tod, sky);
    Sea.draw(t, { tod, sky, horizon: 640, shore: 870 });
    Sea.shore(t, { tod, sky, horizon: 640, shore: 870 });
    clawd(880, 975, 22, emotions(t, [[0, 'hopeful', { lookX: -.6, lookY: -.3 }], [1.2, 'happy'], [3.9, 'relieved', { lookX: .6 }], [5.4, 'sleepy']]));
    camEnd();
  } else {
    const lt = t - 6.5, tod = .42, L = DaySky.light(tod), x = 1000;
    const bank = { light: L, layers: [{ kind: 'meadow', d: 1, y: 300, amp: 26, col: PAL.sap, seed: 4 }] }, gy = Landscape.groundY(x, bank);
    camBegin(kf(lt, [[0, 900], [1, 900], [2.3, x]]), kf(lt, [[0, 620], [1, 620], [2.3, gy - 110]]), kf(lt, [[0, 1], [1, 1], [2.3, 2]]));
    DaySky.draw(t, tod);
    Landscape.draw(t, { light: L, layers: Landscape.DEFAULT.slice(0, 3) });
    Sea.draw(t, { tod, kind: 'lake', horizon: 835, farDepth: .6, reflect: { col: Landscape.tone('#3E6B58', .6, { night: L.zen, dim: L.dim, haze: L.hor }), h: 46 } });
    Landscape.draw(t, bank);
    clawd(x, gy, 22, emotions(lt, [[0, 'happy', { lookX: -.5 }], [1.6, 'excited']]));
    camEnd();
  }
};
LOOPS['sky/sea'].len = 10;
