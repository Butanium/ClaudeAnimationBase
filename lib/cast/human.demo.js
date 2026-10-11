// lib/cast/human.demo.js: the human rig's key poses (stand, cup, slap, haul, look up, catch with an orange, the referee).
(() => {
  const orange = (u, sw) => {
    paint(ellPts(0, -.9 * u, 1.05 * u, 1.0 * u, 18), { wash: '#F08A24', ink: PAL.ink, sw: sw * .7 });
    paint(ribbon([[0, -1.9 * u], [.3 * u, -2.3 * u], [.8 * u, -2.4 * u]], .35 * u, .12 * u), { wash: '#4E7A3A', ink: PAL.ink, sw: sw * .5 });
  };
  const POSES = [
    ['stand', { mood: 'neutral' }],
    ['cup', { mood: 'curious', face: .5, lean: .12, handL: [3.6, 3.2], handR: [-.4, 3.4], tilt: .15, lookY: .6 }],
    ['slap', { mood: 'happy', face: .8, lean: .25, handR: [4.2, 2.2], handL: [-.8, 5.6], stance: 4.4 }],
    ['haul', { mood: 'strain', face: .6, lean: -.25, crouch: .45, handL: [3.0, 5.4], handR: [3.6, 4.8], stance: 5 }],
    ['look up', { mood: 'stunned', face: .2, tilt: -.35, lookY: -1, handL: [-1.3, 5.2], handR: [1.3, 5.2] }],
    ['catch', { mood: 'delighted', face: .5, lean: -.1, tilt: -.25, handR: [.6, -6.0], handL: [-1.4, 4.4], holdR: orange }],
    ['ref whistle', { outfit: 'ref', hair: 'bald', mood: 'angry', whistle: 1, face: -.3, handR: [-1.2, 1.4], handL: [-4.6, 1.4] }],
    ['ref cross', { outfit: 'ref', hair: 'bald', mood: 'angry', face: 0, handL: [3.6, 1.8], handR: [-3.6, 1.8], bendL: 1, bendR: -1 }],
  ];
  LOOPS['cast/human'] = t => {
    const i = Math.min(POSES.length - 1, Math.floor(t));
    paint(rectPts(-100, -100, W + 200, H + 200), { wash: '#1B1822', ink: null });
    paint(rectPts(-100, 760, W + 200, 500), { wash: '#34303D', ink: null });
    glow(960, 700, 700, '#FFD9A0', .5);
    const [name, o] = POSES[i];
    human(820, 940, 30, { boilKey: 'c', ...o });
    clawd(1330, 940, 22, { ...feel('happy', t), boilKey: 'clawd' });
  };
  LOOPS['cast/human'].len = POSES.length;
})();
