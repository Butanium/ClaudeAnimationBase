// lib/imported/bianbianzhu/ukulele.js: a ukulele, and Clawd playing it (strumming on the beat, hands on the strings).
// Use: UKULELE.player(x, y, u, mood, p): clawd() in FRONT view holding the uke across the body; mood from feel()/emotions();
//   p = { strum, fret (arm angles; default: a strum on every beat), tilt (raises the neck), ring 0..1 (strings shake),
//   reach (strumming arm length, 2.9), mouth (e.g. UKULELE.sing(t)), key (boilKey, default 'uke'), dy, sq, rot, extra
//   (more clawd options), draw (your own draw hook, after the uke) }.
//   UKULELE.held(u, sw, tilt, ring) draws the uke in body space (a draw hook); UKULELE.back(u, sw, view) slings it on the
//   back ('side' and 'q' views; hidden from the front). Beat helpers: strum(t, k), ring(t), fret(t), sing(t, ph).
// Expects: clawd.js (tintCols, and clawd()'s arm geometry and boil keys: the arms are repainted over the uke with the
//   same pivot and seed). The strings' shake reads the global frame time T.
// Source: imported from https://github.com/bianbianzhu/ClaudeAnimationBase@feb20e9 (src/scenes/beach/common.js), MIT,
//   by bianbianzhu; Copyright (c) 2026 bianbianzhu, MIT. Changed: split out of the film's BCH namespace; player() calls
//   clawd() directly instead of the film's costumed buddy(), with its boil key in p.key.
const UKULELE = (() => {
  const C = { uke: '#D8A05A', ukeDk: '#8A5634', head: '#5E3A2A', hole: '#3A2A22' };
  const POS = [3.2, -2.0], ANG = .22;
  // the instrument along its own axis: body at the origin, neck running to -x
  function shape(u, sw, ring = 0) {
    const U = pts => pts.map(([a, b]) => [a * u, b * u]);
    paint(U([[-8.4, -.27], [-2.2, -.3], [-2.2, .3], [-8.4, .25]]), { wash: C.ukeDk, ink: PAL.ink, sw: sw * .7 });                       // neck
    paint(U([[-8.3, -.36], [-9.5, -.55], [-9.6, .52], [-8.3, .36]]), { wash: C.head, ink: PAL.ink, sw: sw * .7 });                      // head
    const B = [];
    for (let a = -2.1; a <= 2.101; a += .15) B.push([1.3 * Math.cos(a), 1.3 * Math.sin(a)]);
    for (let a = 1.05; a <= TAU - 1.05; a += .2) B.push([-1.75 + 1.0 * Math.cos(a), 1.0 * Math.sin(a)]);
    paint(U(B), { wash: C.uke, fill: C.ukeDk, fillOp: 50, bleed: .05, tex: .6, ink: PAL.ink, sw: sw * .9, curv: .3 });                 // body
    paint(ellPts(-.95 * u, 0, .42 * u, .42 * u, 14), { wash: C.hole, ink: null });                                                    // sound hole
    paint(U([[.55, -.5], [.95, -.5], [.95, .5], [.55, .5]]), { wash: C.head, ink: null });                                             // bridge
    for (const fx of [-3, -3.8, -4.6, -5.4, -6.2, -7]) inkLine([[fx * u, -.24 * u], [fx * u, .24 * u]], sw * .3, PAL.cream, 'inkfine', 0);
    for (let j = 0; j < 3; j++) {
      const y = (j - 1) * .13 * u, v = ring * Math.sin(T * 95 + j * 2) * .12 * u;
      inkLine([[.8 * u, y], [-3.5 * u, y + v], [-8.3 * u, y * 1.3]], sw * .26, PAL.cream, 'inkfine', .3);
    }
  }
  // held across the body, front view (body space: call it from a draw hook)
  function held(u, sw, tilt = 0, ring = 0) { push(); translate(POS[0] * u, POS[1] * u); rotate(ANG + tilt); shape(u, sw, ring); pop(); }
  // slung on the back while travelling (body space; side and 3/4 views only: from the front it's hidden)
  function back(u, sw, view) {
    push();
    if (view === 'side' || view === 'q') { translate((view === 'side' ? -2.9 : -4.6) * u, -3.4 * u); rotate(1.2); scale(.62); shape(u, sw / .62 * .8); }
    pop();
  }
  // Repaint a front-view arm over the uke so the hands sit on it (same pivot, angle and boil seed as the arm clawd() drew).
  function armOver(u, sw, which, a, len, col, dk, id) {
    const dir = which === 'L' ? -1 : 1;
    boilSeed(`clawd ${id} arm${which}`);
    push(); translate(dir * (4.9 + .55 * clamp((Math.abs(a) - .7) / .9)) * u, -4.5 * u); rotate(dir < 0 ? a : -a);
    paint(rectPts(dir < 0 ? -len * u : 0, -.5 * u, len * u, u, u * .07 * .6), { wash: col, washOp: 255, fill: dk, fillOp: 60, tex: .5, ink: PAL.ink, sw: sw * .8 });
    pop();
  }
  // strumming on every beat: a quick downstroke on the beat, an easy upstroke after it
  const strum = (t, k = 1) => { const f = frac(bpOf(t) * k); return f < .18 ? lerp(-2.5, -2.02, easeOut(f / .18)) : lerp(-2.02, -2.5, ease((f - .18) / .82)); };
  const ring = t => Math.exp(-frac(bpOf(t)) * 4);
  const fret = t => .02 + .08 * (Math.floor(bpOf(t) / 4) % 2) + .03 * wob(t, .7);
  // wordless singing: a new mouth shape each beat, a breath at the end of each bar
  const SING = ['open', 'O', 'o', 'smile', 'open', 'O', 'cat', 'open'];
  const sing = (t, ph = 0) => { const b = bpOf(t) + ph, n = Math.floor(b); return (((n % 4) + 4) % 4 === 3 && frac(b) > .55) ? 'smile' : SING[((n % 8) + 8) % 8]; };

  function player(x, y, u, mood, p = {}) {
    const st = p.strum ?? strum(T), fr = p.fret ?? fret(T), key = p.key ?? 'uke';
    const o = { ...mood, view: 'front', aL: fr, aR: st, dy: (mood.dy || 0) + (p.dy || 0), sq: (mood.sq || 0) + (p.sq || 0), rot: (mood.rot || 0) + (p.rot || 0), boilKey: key, ...(p.extra || {}) };
    if (p.mouth !== undefined) o.mouth = p.mouth;
    o.draw = (u, sw) => {
      const c = tintCols(o);
      held(u, sw, p.tilt || 0, p.ring ?? ring(T));
      armOver(u, sw, 'L', fr, 2.0, c.col, c.dk, key);
      armOver(u, sw, 'R', st, p.reach ?? 2.9, c.col, c.dk, key);
      if (p.draw) p.draw(u, sw);
    };
    clawd(x, y, u, o);
  }

  return { shape, held, back, player, strum, ring, fret, sing };
})();
