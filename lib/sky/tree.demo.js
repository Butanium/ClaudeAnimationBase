// Demo (loads parallax.js, daysky.js and landscape.js too, for the setting): the six kinds in a row on the meadow, with
// Clawd among them, swaying on the beat; a push in to zoom 2 on the oak; then a dusk row of oaks and firs of mixed seeds
// and sizes, the seeded variety.
LOOPS['sky/tree'] = t => {
  const dusk = t >= 6, tod = dusk ? .75 : .45, L = DaySky.light(tod), land = { light: L, flowers: .6 };
  const z = dusk ? 1 : kf(t, [[0, 1], [4, 1], [5, 2]]);
  camBegin(dusk ? 960 : kf(t, [[4, 960], [5, 330]]), dusk ? 540 : kf(t, [[4, 540], [5, 700]]), z);
  DaySky.draw(t, tod, { clouds: 3 });
  Landscape.draw(t, land);
  const at = (x, o) => Tree.draw(t, x, Landscape.groundY(x) + 6, { light: L, ...o });
  if (!dusk) {
    at(230, { kind: 'oak', h: 440, seed: 1 });
    at(540, { kind: 'fir', h: 480, seed: 2 });
    at(800, { kind: 'birch', h: 460, seed: 3 });
    at(1300, { kind: 'willow', h: 400, seed: 4 });
    at(1580, { kind: 'blossom', h: 380, seed: 5 });
    at(1830, { kind: 'bare', h: 420, seed: 6 });
    const x = 1040;
    clawd(x, Landscape.groundY(x), 20, emotions(t, [[0, 'happy', { lookX: -.6 }], [2.4, 'excited', { lookX: .6 }]]));
  } else {
    [[140, 'oak', 380, 11], [400, 'fir', 520, 12], [620, 'oak', 300, 13], [1250, 'fir', 380, 14], [1480, 'oak', 460, 15], [1770, 'fir', 440, 16]]
      .forEach(([x, kind, h, seed]) => at(x, { kind, h, seed }));
    const x = 950;
    clawd(x, Landscape.groundY(x), 20, feel('relieved', t, { lookX: .5 }));
  }
  Landscape.front(t, land);
  camEnd();
};
LOOPS['sky/tree'].len = 8;
