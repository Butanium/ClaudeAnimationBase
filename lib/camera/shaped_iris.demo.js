// Demo: four short shots, each seam a different shaped iris closing on Clawd and opening on the next Clawd:
// love in a rose garden → heart → starstruck under the night sky (zoom 1.3) → star → suspicious at a door → keyhole →
// taking a bow on a stage (zoom 1.6) → Clawd's own silhouette → back to the garden.
(() => {
  const D = 1.2, S = 2, G = 840;
  const ground = (key, col, y = G) => { boilSeed(key); paint(rectPts(-300, y - 8, W + 600, 600, 2), { wash: col, ink: null }); inkLine([[-300, y - 6], [960, y - 10], [W + 300, y - 5]], 1, PAL.ink, 'ink', .4); };
  const shotsList = [
    { kind: 'heart', cam: [960, 540, 1], x: 820, u: 26, draw(t) {
        boilSeed('g sky'); paint(rectPts(-300, -300, W + 600, H + 600), { wash: mixCol(PAL.rose, PAL.cream, .55), ink: null });
        ground('g ground', mixCol(PAL.sap, PAL.cream, .2));
        for (let i = 0; i < 7; i++) { boilSeed('g fl' + i); const x = 150 + i * 270 + 60 * hash(i), y = G + 40 + 50 * hash(i + 5), s = 1 + .08 * wob(t, .5, i * .3);
          inkLine([[x, y], [x + 4 * wob(t, .4, i * .2), y - 50]], .8, mixCol(PAL.sap, PAL.ink, .3), 'inkfine', .3);
          paint(ellPts(x, y - 56, 16 * s, 14 * s, 12, 1), { wash: i % 2 ? PAL.rose : PAL.cream, ink: PAL.ink, sw: .6 }); }
      }, feel: t => feel('love', t) },
    { kind: 'star', cam: [960, 560, 1.3], x: 900, u: 22, draw(t) {
        boilSeed('n sky'); paint(rectPts(-300, -300, W + 600, H + 600), { wash: PAL.night, ink: null });
        for (let i = 0; i < 20; i++) { boilSeed('n st' + i); const tw = .6 + .4 * Math.sin(t * 3 + i); paint(starPts(hash(i) * W, hash(i + 40) * 520, (4 + 5 * hash(i + 9)) * tw, .35, 4), { wash: PAL.cream, washOp: 200, ink: null }); }
        ground('n ground', mixCol(PAL.teal, PAL.night, .5));
      }, feel: t => feel('starstruck', t, { lookY: -.8 }) },
    { kind: 'keyhole', cam: [960, 540, 1], x: 1000, u: 26, draw(t) {
        boilSeed('d wall'); paint(rectPts(-300, -300, W + 600, H + 600), { wash: mixCol(PAL.ochre, PAL.cream, .5), ink: null });
        boilSeed('d door'); paint(rectPts(1300, 300, 300, 548, 2), { wash: mixCol(PAL.clayDk, PAL.ink, .15), ink: PAL.ink, sw: 1.1 });
        paint(ellPts(1340, 590, 14, 14, 12, 1), { wash: PAL.ochre, ink: PAL.ink, sw: .7 });
        ground('d floor', mixCol(PAL.clayDk, PAL.ochre, .4));
      }, feel: t => feel('suspicious', t) },
    { kind: 'clawd', cam: [960, 600, 1.6], x: 960, u: 18, draw(t) {
        boilSeed('s back'); paint(rectPts(-300, -300, W + 600, H + 600), { wash: mixCol(PAL.violet, PAL.night, .35), ink: null });
        glow(960, 640, 380, '#FFE0A0', .7);
        boilSeed('s curtain');
        for (const s of [-1, 1]) paint(ribbon([[960 + s * 700, 180], [960 + s * 560, 520], [960 + s * 610, 900]], 260, 380), { wash: mixCol(PAL.rose, PAL.clayDk, .5), ink: PAL.ink, sw: 1 });
        ground('s stage', mixCol(PAL.clayDk, PAL.ochre, .25));
      }, feel: t => feel('proud', t) },
  ];
  // Clawd's body centre on screen for shot i at time t (the iris aims there)
  const centreOf = (i, t) => { const s = shotsList[i], cx = s.cam[0] + 10 * Math.sin(t * .7); camBegin(cx, s.cam[1], s.cam[2]); const c = toScreen(s.x, G - 4 * s.u); camEnd(); return c; };
  function shot(i, t) {
    const s = shotsList[i];
    camBegin(s.cam[0] + 10 * Math.sin(t * .7), s.cam[1], s.cam[2]);
    s.draw(t);
    clawd(s.x, G, s.u, s.feel(t));
    camEnd();
  }
  LOOPS['camera/shaped_iris'] = t => {
    const i = Math.floor(t / S) % 4, lt = t - i * S, prev = (i + 3) % 4;
    shot(i, t);
    const zoomOf = k => shotsList[k].cam[2], holdOf = k => shotsList[k].u * zoomOf(k) * { heart: 9, star: 11, keyhole: 11, clawd: 7.5 }[shotsList[k].kind];
    if (lt > S - D / 2) {   // closing on this shot's Clawd, with this shot's shape
      const s = shotsList[i];
      shapedIris.wipe(seg(lt, S - D / 2, S + D / 2), { kind: s.kind, a: centreOf(i, t), hold: holdOf(i) });
    }
    if (lt < D / 2) {       // opening on this shot's Clawd, with the previous seam's shape
      shapedIris.wipe(.5 + lt / D, { kind: shotsList[prev].kind, a: centreOf(i, t), hold: holdOf(prev) });
    }
  };
  LOOPS['camera/shaped_iris'].len = 4 * S;
})();
