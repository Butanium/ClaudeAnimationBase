// lib/cast/human.js: a cartoon human in the kit's style (flat wash + ink outline, boiling), posed by targets.
// Use: human(x, y, u, o) with (x, y) = ground point between the feet, u = the same unit as Clawd's (a human is ~20u
//   tall, ~2.5 Clawds). humanRig(x, y, u, o) returns the solved geometry (hands, head, shoulders...) without drawing,
//   for props that must touch a hand.
// Options: outfit 'jersey' | 'ref'; hair 'wavy' | 'bald'; mood (HUMAN_MOODS) or eyes / mouth / brow (-1 furrowed ..
//   1 raised) / lookX / lookY / blush; face (-1..1, 0 = front, 1 = 3/4 toward +x); flip (mirror: faces -x);
//   lean (rad, torso about the hips, + = toward the facing side), tilt (head), sq (squash), dx / dy (whole figure, u),
//   crouch (0..1, hips drop, knees bend), stance (feet apart, u), walk (phase), feet ([[xL, yL], [xR, yR]] world, pins);
//   handL / handR: hand centre relative to that shoulder in body space (u, x toward the facing side, y down), or
//   handLW / handRW: a world point; bendL / bendR (+1 / -1 elbow side); armsBehind: ['L'] etc.;
//   holdL / holdR(u, sw, ang): drawn at the hand centre, rotated along the forearm; emote + emoteK + emoteAge;
//   whistle (0..1, at the mouth); boilKey (a stable id per character).
// Source: made for the film "Catapulte" (2026-10-10, ~/claude-playgrounds/catapulte). Pure function of its arguments; each part boils from its own seed.
const HUMAN_MOODS = {
  neutral:   { eyes: 'normal', mouth: 'smile', brow: 0 },
  happy:     { eyes: 'happy', mouth: 'grin', brow: .35 },
  delighted: { eyes: 'happy', mouth: 'laugh', brow: .6, blush: .5 },
  focused:   { eyes: 'determined', mouth: 'flat', brow: -.45 },
  curious:   { eyes: 'look', mouth: 'o', brow: .45 },
  surprised: { eyes: 'wide', mouth: 'O', brow: 1 },
  stunned:   { eyes: 'blank', mouth: 'o', brow: 1 },
  strain:    { eyes: 'squeeze', mouth: 'teeth', brow: -.7 },
  angry:     { eyes: 'angry', mouth: 'teeth', brow: -1 },
  sheepish:  { eyes: 'look', mouth: 'wobble', brow: .7, blush: .4 },
  playful:   { eyes: 'wink', mouth: 'tongue', brow: .4 },
  proud:     { eyes: 'closed', mouth: 'smile', brow: .2 },
  sad:       { eyes: 'sad', mouth: 'frown', brow: .5 },
};
const HUMAN_COL = {
  skin: '#E8B593', skinDk: '#C98E6E', hair: '#3A2721', hairLt: '#5A4036', pants: '#2E2A36', shoe: '#ECE6DA',
  jersey: '#EFE9DF', jerseyDk: '#CFC7BC', red: '#C8323A', redDk: '#9A2430', ref: '#F0EBE2', refStripe: '#2B2233',
  whistle: '#C9CDD3',
};

function ik2(a, b, L1, L2, bend) {
  let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
  const max = (L1 + L2) * .995;
  if (d > max) { b = [a[0] + dx / d * max, a[1] + dy / d * max]; dx = b[0] - a[0]; dy = b[1] - a[1]; d = max; }
  d = Math.max(d, 1e-3);
  const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), ang = Math.atan2(dy, dx) + bend * A;
  return [[a[0] + Math.cos(ang) * L1, a[1] + Math.sin(ang) * L1], b];
}

function humanRig(x, y, u, o = {}) {
  const f = o.flip ? -1 : 1, sq = o.sq || 0, sx = 1 + .35 * sq, sy = 1 - .35 * sq;
  const bx = x + (o.dx || 0) * u, by = y + (o.dy || 0) * u;
  const hipH = (9.15 - 3.2 * (o.crouch || 0)) * u * (1 - .25 * sq);
  const hip = [bx + (o.hipX || 0) * u * f, by - hipH];
  const lean = (o.lean || 0) * f, cl = Math.cos(lean), sl = Math.sin(lean);
  const B = (lx, ly) => { const X = lx * u * f * sx, Y = ly * u * sy; return [hip[0] + X * cl - Y * sl, hip[1] + X * sl + Y * cl]; };
  const R = {
    f, u, hip, lean, B,
    shL: B(-2.55, -6.6), shR: B(2.55, -6.6), neck: B(0, -7.3), hipL: B(-1.15, .1), hipR: B(1.15, .1),
  };
  // head: centre above the neck, tilted on top of the lean
  const tilt = lean + (o.tilt || 0) * f, ct = Math.cos(tilt), st = Math.sin(tilt);
  const neckTop = B(0, -7.9);
  const hu = u * (o.headK ?? 1.12); R.hu = hu;
  R.Hd = (lx, ly) => { const X = lx * hu * f, Y = ly * hu; return [neckTop[0] + X * ct - Y * st, neckTop[1] + X * st + Y * ct]; };
  R.tilt = tilt; R.head = R.Hd(.15 * (o.face || 0), -2.3);
  // arms: hand targets in body space (relative to the shoulder) or world points
  const hand = (side) => {
    const sh = side === 'L' ? R.shL : R.shR, W_ = side === 'L' ? o.handLW : o.handRW;
    if (W_) return W_;
    const h = (side === 'L' ? o.handL : o.handR) || (side === 'L' ? [-.45, 6.1] : [.45, 6.1]);
    const base = side === 'L' ? [-2.55, -6.6] : [2.55, -6.6];
    return B(base[0] + h[0], base[1] + h[1]);
  };
  for (const s of ['L', 'R']) {
    const sh = s === 'L' ? R.shL : R.shR, tgt = hand(s);
    // default elbow side: outward and down, i.e. away from the body's centre line
    const bend = (s === 'L' ? o.bendL : o.bendR) ?? ((s === 'L' ? -1 : 1) * f);
    const [el, wr] = ik2(sh, tgt, 3.3 * u, 3.2 * u, bend);
    R['el' + s] = el; R['hand' + s] = wr; R['ang' + s] = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
  }
  // legs: feet on the ground (or pinned), knees bend toward the facing side
  const stance = (o.stance ?? 2.6) * u;
  const feet = o.feet || [[bx - stance / 2, by], [bx + stance / 2, by]];
  const legs = feet.map((p, i) => {
    let [fx, fy] = p;
    if (o.walk != null && !o.feet) {
      const ph = (o.walk + i * .5) * TAU;
      fx += Math.sin(ph) * 1.4 * u * f; fy -= Math.max(0, Math.cos(ph)) * .9 * u;
    }
    // knees: outward in a front view, forward (toward the facing side) once the body is turned
    const turned = Math.abs(o.face || 0) > .3 || o.kneesForward, bend = turned ? -f : (i ? -1 : 1);
    const hj = i ? R.hipR : R.hipL, [kn, an] = ik2(hj, [fx, fy - .35 * u], 4.7 * u, 4.6 * u, bend);
    return { hj, kn, an };
  });
  R.legs = legs;
  return R;
}

function human(x, y, u, o = {}) {
  const M = HUMAN_MOODS[o.mood] || {}, mood = { ...M, ...Object.fromEntries(Object.entries(o).filter(([k]) => ['eyes', 'mouth', 'brow', 'blush'].includes(k))) };
  const R = humanRig(x, y, u, o), f = R.f, C = HUMAN_COL, key = o.boilKey || 'human';
  const rs = part => boilSeed(`human ${key} ${part}`);
  const sw = clamp(u / 15, .45, 2.4) * (o.swMul || 1), J = u * .05;
  const ref = o.outfit === 'ref';

  rs('shadow');
  if (!o.noShadow) {
    const lift = Math.max(0, -(o.dy || 0)), k = 1 - Math.min(.5, lift * .05);
    paint(ellPts(x + (o.dx || 0) * u, y + u * .2, u * 4.2 * k, u * .8 * k, 20), { fill: PAL.ink, fillOp: 80, bleed: .2, tex: .3, border: .1, ink: null });
  }

  // ---- legs ----
  R.legs.forEach(({ hj, kn, an }, i) => {
    rs('leg' + i);
    paint(ribbon([hj, kn, an], 2.0 * u, 1.55 * u), { wash: i === (f > 0 ? 0 : 1) ? mixCol(C.pants, PAL.ink, .25) : C.pants, ink: PAL.ink, sw: sw * .8 });
    const toe = f * (i === 0 ? .55 : 1);   // the far foot turns out less
    const sx0 = an[0] - .55 * u * toe, sx1 = an[0] + 1.75 * u * toe, sy = an[1] + .35 * u;
    paint([[sx0, sy - .95 * u], [lerp(sx0, sx1, .55), sy - 1.0 * u], [sx1, sy - .45 * u], [sx1 + .1 * u * toe, sy], [sx0 - .1 * u * toe, sy]],
      { wash: C.shoe, ink: PAL.ink, sw: sw * .75, curv: .35 });
    inkLine([[sx0, sy - .25 * u], [sx1, sy - .2 * u]], sw * .45, PAL.ink, 'inkfine', 0);
  });

  // ---- arms (a function, so they can go behind or in front) ----
  const arm = (s) => {
    rs('arm' + s);
    const sh = s === 'L' ? R.shL : R.shR, el = R['el' + s], hd = R['hand' + s], ang = R['ang' + s];
    const far = (s === 'L') === (f > 0);
    const sleeve = ref ? mixCol(C.refStripe, '#FFFFFF', .08) : (far ? C.jerseyDk : C.jersey);
    const wr = [hd[0] - Math.cos(ang) * .5 * u, hd[1] - Math.sin(ang) * .5 * u];
    paint(ribbon([sh, el, wr], 1.85 * u, 1.35 * u), { wash: sleeve, ink: PAL.ink, sw: sw * .8 });
    if (!ref) {   // red band below the elbow and a red cuff
      const at = k => [lerp(el[0], wr[0], k), lerp(el[1], wr[1], k)];
      paint(ribbon([at(.12), at(.24), at(.36)], 1.6 * u, 1.52 * u), { wash: far ? C.redDk : C.red, ink: null });
      paint(ribbon([at(.8), at(.9), at(1)], 1.42 * u, 1.38 * u), { wash: far ? C.redDk : C.red, ink: null });
    }
    paint(ellPts(hd[0], hd[1], .7 * u, .62 * u, 14, 0, ang), { wash: far ? C.skinDk : C.skin, ink: PAL.ink, sw: sw * .7 });
    const hook = s === 'L' ? o.holdL : o.holdR;
    if (hook) { rs('hold' + s); push(); translate(hd[0], hd[1]); rotate(ang); hook(u, sw, ang); pop(); }
  };
  const behind = o.armsBehind || [];
  behind.forEach(arm);

  // ---- torso ----
  rs('torso');
  const tor = [R.B(-2.95, -6.2), R.B(-2.3, -7.25), R.B(-.8, -7.45), R.B(.8, -7.45), R.B(2.3, -7.25), R.B(2.95, -6.2), R.B(2.75, .7), R.B(-2.75, .7)];
  paint(tor, { wash: ref ? C.ref : C.jersey, ink: null });
  if (ref) {
    for (let k = -2; k <= 2; k++) {
      const x0 = k * 1.15 - .28, x1 = k * 1.15 + .28;
      paint([R.B(x0, -7.35), R.B(x1, -7.35), R.B(x1 * .95, .68), R.B(x0 * .95, .68)], { wash: C.refStripe, ink: null });
    }
    paint([R.B(-.9, -7.45), R.B(.9, -7.45), R.B(.5, -6.7), R.B(-.5, -6.7)], { wash: C.refStripe, ink: null });
  } else {
    paint([R.B(-2.88, -2.6), R.B(2.88, -2.6), R.B(2.75, .7), R.B(-2.75, .7)], { wash: C.red, ink: null });
    paint([R.B(-2.86, -1.6), R.B(2.86, -1.6), R.B(2.84, -1.05), R.B(-2.84, -1.05)], { wash: C.jersey, ink: null });
    paint([R.B(-1.1, -7.42), R.B(1.1, -7.42), R.B(0, -5.9)], { wash: C.red, ink: null });   // the V collar
    paint([R.B(-.62, -7.42), R.B(.62, -7.42), R.B(0, -6.55)], { wash: C.skin, ink: null });
    paint(ellPts(...R.B(-1.2 * f, -4.6), 1.6 * u, 2.2 * u, 14), { fill: C.jerseyDk, fillOp: 35, bleed: .2, tex: .7, border: .7, ink: null });
  }
  // outline as two mirrored strokes (the ink brush tapers along a stroke)
  const T2 = tor.slice(2, 7), T1 = [tor[3], tor[2], tor[1], tor[0], tor[7]];
  inkLine(T1, sw, PAL.ink, 'ink', .25); inkLine(T2.concat([tor[6]]), sw, PAL.ink, 'ink', .25);
  inkLine([tor[6], tor[7]], sw * .9, PAL.ink, 'ink', 0);

  // ---- head ----
  rs('head');
  const Hd = R.Hd, hu = R.hu, fc = o.face || 0, hc = R.head;
  paint(ribbon([R.B(0, -7.1), R.B(0, -7.8), Hd(0, -.6)], 1.25 * hu, 1.15 * hu), { wash: C.skinDk, ink: PAL.ink, sw: sw * .6 });
  for (const s of [-1, 1]) {   // ears, behind the head, the far one hidden when turned
    if (Math.abs(fc) > .5 && s === -Math.sign(fc)) continue;
    const e = Hd(s * 2.0 + .25 * fc, -2.25);
    paint(ellPts(e[0], e[1], .45 * hu, .65 * hu, 12, 0, R.tilt), { wash: C.skin, ink: PAL.ink, sw: sw * .6 });
  }
  const head = []; for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; head.push(Hd(.15 * fc + Math.cos(a) * 2.05, -2.3 + Math.sin(a) * 2.45 * (a > 0 && a < Math.PI ? .96 : 1))); }
  paint(head, { wash: C.skin, ink: null });
  paint(ellPts(...Hd(.15 * fc - .9, -2.9), .9 * hu, 1.1 * hu, 12), { fill: '#F4CFB2', fillOp: 90, bleed: .2, tex: .6, border: .7, ink: null });
  inkLine(head.slice(0, 16), sw, PAL.ink, 'ink', .4); inkLine(head.slice(15).concat([head[0]]), sw, PAL.ink, 'ink', .4);

  // face
  rs('face');
  const fx = .8 * fc, eu = .42 * hu, fo = { lookX: o.lookX || 0, lookY: o.lookY || 0, seed: o.seed || 0 };
  const eyeKinds = Array.isArray(mood.eyes) ? mood.eyes : mood.eyes === 'wink' ? ['happy', 'normal'] : [mood.eyes || 'normal', mood.eyes || 'normal'];
  const narrow = 1 - .22 * Math.abs(fc);
  const sqz = clamp(o.squint || 0);
  for (const s of [-1, 1]) {
    const ec = Hd(fx + s * .82 * narrow, -2.35);
    push(); translate(ec[0], ec[1]); rotate(R.tilt); scale(f * (s * fc > .3 ? .85 : 1), 1 - .8 * sqz);
    eye(eyeKinds[s < 0 ? 0 : 1], s, eu, fo, sw * .75);
    pop();
    // brows: raised (brow > 0) or furrowed (inner end down)
    const b = mood.brow || 0, by_ = -3.2 - .28 * b, inner = b < 0 ? .45 * -b : -.18 * b;
    const p0 = Hd(fx + s * .82 * narrow - s * .45, by_ + inner), p1 = Hd(fx + s * .82 * narrow + s * .45, by_ - .05);
    inkLine([p0, p1], sw * 1.1, C.hair, 'ink', 0);
  }
  if (mood.blush) for (const s of [-1, 1]) { const c = Hd(fx + s * 1.25, -1.55); paint(ellPts(c[0], c[1], .55 * hu, .28 * hu, 12), { fill: PAL.rose, fillOp: 150 * mood.blush, bleed: .2, ink: null }); }
  const nose = Hd(fx + .3 * fc, -1.75);
  inkLine([Hd(fx + .05 + .2 * fc, -2.15), [nose[0] + .25 * hu * f * (fc >= 0 ? 1 : -1), nose[1] + .05 * hu], Hd(fx - .05, -1.55)], sw * .55, PAL.ink, 'inkfine', .5);
  if (o.hair === 'bald') {   // the referee's moustache
    rs('tache');
    const m = Hd(fx, -1.2);
    paint([[m[0] - 1.05 * hu, m[1] + .25 * hu], [m[0] - .5 * hu, m[1] - .25 * hu], [m[0], m[1] - .05 * hu], [m[0] + .5 * hu, m[1] - .25 * hu], [m[0] + 1.05 * hu, m[1] + .25 * hu], [m[0] + .4 * hu, m[1] + .12 * hu], [m[0], m[1] + .2 * hu], [m[0] - .4 * hu, m[1] + .12 * hu]],
      { wash: '#5A3A2E', ink: PAL.ink, sw: sw * .55, curv: .3 });
  }
  rs('mouth');
  const mc = Hd(fx, -.85);
  push(); translate(mc[0], mc[1]); rotate(R.tilt); scale(f, 1); translate(0, 4.3 * .36 * hu); mouth(.36 * hu, o.whistle > .5 ? 'o' : mood.mouth, sw * .8); pop();
  if (o.whistle > 0) {
    rs('whistle');
    const w = Hd(fx + .55 * fc + .3, -.75);
    push(); translate(w[0], w[1]); rotate(R.tilt); scale(f, 1);
    paint(rrPts(-.15 * hu, -.38 * hu, 1.5 * hu * o.whistle, .8 * hu, .3 * hu), { wash: C.whistle, ink: PAL.ink, sw: sw * .6 });
    paint(ellPts(1.1 * hu * o.whistle, 0, .48 * hu, .48 * hu, 12), { wash: C.whistle, ink: PAL.ink, sw: sw * .6 });
    pop();
  }

  // hair
  rs('hair');
  if (o.hair !== 'bald') {
    const P = [];
    for (let i = 0; i <= 26; i++) {
      const a = Math.PI * (1.02 + .98 * i / 26), bump = 1 + .1 * Math.abs(Math.sin(i * 1.7 + 1)) + .05 * Math.sin(i * 3.1);
      P.push(Hd(.15 * fc + Math.cos(a) * 2.35 * bump - .1 * fc, -2.55 + Math.sin(a) * 2.6 * bump));
    }
    // the fringe: wavy locks falling over the forehead, swept toward the facing side
    const fr = [[2.15, -2.4], [1.6, -3.3], [1.0, -2.95], [.35, -3.55], [-.35, -3.15], [-1.0, -3.7], [-1.6, -3.2], [-2.2, -2.3]];
    for (const [a, b] of fr) P.push(Hd(.15 * fc + a + .35 * fc, b));
    paint(P, { wash: C.hair, ink: PAL.ink, sw: sw * .8 });
    for (let i = 0; i < 5; i++) {
      const c = Hd(.15 * fc - 1.6 + i * .8, -4.3 + .25 * Math.sin(i * 2.3));
      paint(ribbon([[c[0] - .3 * hu, c[1] + .25 * hu], [c[0], c[1] - .2 * hu], [c[0] + .35 * hu, c[1] + .15 * hu]], .22 * hu, .08 * hu), { wash: C.hairLt, ink: null });
    }
  } else {
    for (const s of [-1, 1]) {
      const c = Hd(.15 * fc + s * 1.85, -2.9);
      paint(ellPts(c[0], c[1], .55 * hu, 1.0 * hu, 12), { wash: '#8C7A70', ink: PAL.ink, sw: sw * .5 });
    }
    const sh = Hd(.15 * fc - .8, -4.1); paint(ellPts(sh[0], sh[1], .55 * hu, .25 * hu, 10, 0, -.3), { wash: '#F6D9C2', ink: null });
  }

  // arms in front
  ['L', 'R'].filter(s => !behind.includes(s)).forEach(arm);

  rs('emote');
  if (o.emote) {
    const e = Hd(.15 * fc + 2.6, -5.6);
    emote(o.emote, e[0], e[1], u * .85, o.emoteK ?? 1, o.emoteAge ?? T);
  }
  rs('after');
  return R;
}
