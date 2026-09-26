// lib/imported/james-banks/living_note.js: a living music note: an eighth (stem + flag) or half note with a face.
// Use: livingNote(x, y, s, o): (x, y) = the bottom of its head, where it stands; s = the head's half-width. o: col,
//   kind 'e' (eighth, default) | 'h' (half: hollow head, no flag), eyes 'open' | 'shut' | 'happy' | 'wink' | 'wide', lookX,
//   lookY, mouth 'smile' (default) | 'o' | 'grin' | null, blush 0..1, sq (squash; negative stretches), rot, flip, wob (the
//   stem's lean, in s), flap 0..1 (the flag's flutter), glow 0..1 (+ glowCol), seed (blink timing), key (boil key: set it).
// Expects: core only; world or screen space. Open eyes blink on their own, from the global frame time T.
// Source: imported from https://github.com/james-banks/ClaudeAnimationBase@e64e9bd (src/scenes/opus_cast.js, memeNote),
//   MIT, by James Banks; Copyright (c) 2026 James Banks, MIT. Changed: renamed from memeNote, noteFace and lum() folded
//   in, default colour inlined (the film's OPAL.gold), a second boil seed for the head (the flag moves every frame).
const livingNote = (() => {
  const lum = c => { const n = parseInt(c.slice(1), 16); return (.299 * ((n >> 16) & 255) + .587 * ((n >> 8) & 255) + .114 * (n & 255)) / 255; };
  function face(s, o, sw, col) {
    const e = o.eyes || 'open', lx = (o.lookX || 0) * .1 * s, ly = (o.lookY || 0) * .08 * s;
    const dark = o.kind !== 'h' && lum(col) < .42, ink = dark ? PAL.cream : PAL.ink;
    const E = [[-.4 * s, -.72 * s], [.3 * s, -.98 * s]];
    const blink = e === 'open' && ((T * 1.1 + (o.seed || 0) * 2.3) % 3.1) < .11;
    E.forEach(([ex, ey], i) => {
      const kind = e === 'wink' ? (i ? 'happy' : 'open') : blink ? 'shut' : e;
      if (kind === 'shut') inkLine([[ex - .17 * s, ey + .02 * s], [ex + .17 * s, ey - .04 * s]], sw * .7, ink, 'ink', 0);
      else if (kind === 'happy') inkLine([[ex - .18 * s, ey + .08 * s], [ex, ey - .1 * s], [ex + .18 * s, ey + .06 * s]], sw * .7, ink, 'ink', .4);
      else {
        const w = kind === 'wide' ? 1.3 : 1;
        if (kind === 'wide') paint(ellPts(ex, ey, .2 * s * w, .27 * s * w, 12, 0, -.4), { wash: PAL.cream, ink: PAL.ink, sw: sw * .4 });
        paint(ellPts(ex + lx, ey + ly, .12 * s, .18 * s, 10, 0, -.4), { wash: ink, ink: null });
        if (s > 7) paint(ellPts(ex + lx - .04 * s, ey + ly - .07 * s, .045 * s, .05 * s, 6), { wash: dark ? PAL.ink : PAL.cream, ink: null });
      }
    });
    if (o.blush) for (const [bx, by] of [[-.72 * s, -.42 * s], [.62 * s, -.72 * s]]) paint(ellPts(bx, by, .16 * s, .08 * s, 8, 0, -.4), { fill: PAL.rose, fillOp: 160 * o.blush, ink: null });
    const m = o.mouth === undefined ? 'smile' : o.mouth, mx = -.02 * s, my = -.38 * s;
    if (m === 'smile') inkLine([[mx - .16 * s, my - .02 * s], [mx, my + .08 * s], [mx + .15 * s, my - .08 * s]], sw * .55, ink, 'ink', .5);
    else if (m === 'o') paint(ellPts(mx, my, .11 * s, .13 * s, 8), { wash: '#4A1F2A', ink: ink, sw: sw * .3 });
    else if (m === 'grin') paint([[mx - .22 * s, my - .04 * s], [mx + .2 * s, my - .16 * s], [mx + .06 * s, my + .1 * s]], { wash: '#4A1F2A', ink: ink, sw: sw * .35 });
  }
  return function livingNote(x, y, s, o = {}) {
    if (s < 1.5) return;
    const key = 'note ' + (o.key ?? 0);
    boilSeed(key);
    const col = o.col || '#FFE39A', dk = mixCol(col, PAL.ink, .55), sw = clamp(s / 22, .3, 1.4), sq = o.sq || 0;
    if (o.glow > .02) glow(x, y - 1.6 * s, s * 6.5, o.glowCol || '#FFD98A', o.glow);
    push(); translate(x, y); if (o.rot) rotate(o.rot); scale((o.flip ? -1 : 1) * (1 + sq * .6), 1 - sq);
    const hx = .92 * s, top = -4.4 * s, wb = (o.wob || 0) * s;
    paint(ribbon([[hx, -.75 * s], [hx + wb * .25, -2.5 * s], [hx + wb, top]], .38 * s, .3 * s), { wash: dk, ink: PAL.ink, sw: sw * .55 });
    if (o.kind !== 'h') {
      const f = o.flap || 0, fx = hx + wb;
      paint(ribbon([[fx, top + .1 * s], [fx + 1 * s, top + (.75 + .3 * f) * s], [fx + 1.4 * s, top + (1.9 + .25 * f) * s], [fx + .95 * s, top + (2.85 - .15 * f) * s]], .66 * s, .1 * s),
        { wash: col, ink: PAL.ink, sw: sw * .55 });
    }
    boilSeed(key + ' head');
    const ang = -.4;
    paint(ellPts(0, -.74 * s, 1.1 * s, .76 * s, 22, 0, ang), { wash: col, ink: PAL.ink, sw });
    if (o.kind === 'h') paint(ellPts(.04 * s, -.74 * s, .74 * s, .4 * s, 18, 0, ang), { wash: mixCol(col, PAL.cream, .8), ink: PAL.ink, sw: sw * .5 });
    else paint(ellPts(-.5 * s, -1.12 * s, .3 * s, .12 * s, 8, 0, ang), { wash: mixCol(col, PAL.cream, .7), ink: null });
    face(s, o, sw, col);
    pop();
  };
})();
