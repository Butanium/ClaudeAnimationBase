LOOPS['imported/james-banks/living_note'] = t => {
  boilSeed('note bg');
  paint(rectPts(-80, 820, W + 160, 400), { wash: '#E7D3B0', ink: null });
  // a melody: each note hops on its own eighth, lands with a squash, flag fluttering
  const N = [['#FFE39A', 'e', 'open', 'smile'], ['#EE7C86', 'e', 'happy', 'grin'], ['#4FB3A9', 'h', 'open', 'o'],
    ['#2F3C7A', 'e', 'wink', 'smile'], ['#9BCB5A', 'e', 'wide', 'o']];
  N.forEach(([col, kind, eyes, mouth], i) => {
    const e = ((bpOf(t) * 2 - i) % 5 + 5) % 5, hop = e < 1 ? Math.sin(e * Math.PI) : 0, land = e >= 1 ? .25 * Math.exp(-5 * (e - 1)) : 0;   // e: eighths since its hop
    livingNote(240 + i * 260, 840 - 170 * hop, 50, { col, kind, eyes, mouth, key: i, seed: i, flap: .5 + .5 * Math.sin(t * 12 + i),
      sq: land - .12 * hop, wob: .3 * Math.sin(t * 3 + i), blush: eyes === 'happy' ? .8 : 0, glow: i === 0 ? .6 : 0 });
  });
  clawd(1600, 900, 26, { ...feel('love', t), lookX: -1, boilKey: 'fan' });
};
LOOPS['imported/james-banks/living_note'].len = 4;
