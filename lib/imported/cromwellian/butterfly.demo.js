LOOPS['imported/cromwellian/butterfly'] = t => {
  const B = butterfly;
  boilSeed('bfly bg');
  paint(rectPts(-80, -80, W + 160, 900), { wash: '#AFD6EC', ink: null });
  paint(ellPts(900, 1250, 1500, 500, 40, 3), { wash: '#9CC274', ink: PAL.ink, sw: .8 });
  const flowers = [[380, 820, 70, PAL.rose], [640, 760, 60, '#F4B36E'], [900, 840, 66, '#B99BE0']];
  flowers.forEach(([x, y, r, col], i) => {
    boilSeed('bfly flower' + i);
    const sway = 6 * Math.sin(t * 2 + i);
    inkLine([[x - 10, y + 260], [x - 4 + sway * .5, y + 130], [x + sway, y]], 1.4, PAL.sap, 'ink', .5);
    B.bloom(x + sway, y, r, col, 1, i);
  });
  // a looping flight that lands on the middle flower
  const K = [[0, 1500, 300], [.8, 1150, 180], [1.6, 800, 420], [2.4, 420, 260], [3.2, 640, 700]];
  const [x, y] = B.path(t, K), [x2, y2] = B.path(t + .05, K), landed = t >= 3.2;
  const rot = landed ? .15 : Math.atan2(x2 - x, -(y2 - y)) * .6;
  B(x, y + (landed ? 6 * Math.sin(t * 2 + 2) : 0), 44, landed ? .5 + .5 * Math.sin(t * 3) : .5 + .5 * Math.sin(t * 16), rot);
  clawd(1460, 960, 24, { ...feel(landed ? 'love' : 'happy', t), lookX: x < 1460 ? -1 : 1, lookY: -.6, draw: B.wornBloom(seg(t, .2, .6)) });
};
LOOPS['imported/cromwellian/butterfly'].len = 4;
