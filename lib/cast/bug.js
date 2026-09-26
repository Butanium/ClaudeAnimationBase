// lib/cast/bug.js: a little beetle, the "bug" of Claude Code films: it scuttles on six legs, hides under its shell with one
// eye peeking out, gets squashed flat and pops back dizzy, opens its shell and buzzes off, and can be caught in a glass jar.
// Its face is Clawd's eyes and mouths; it acts with Clawd's emotions (Clawd's arm raise becomes its antennae).
// Use: bug(x, y, u, o): (x, y) = the ground point under its middle; u = the same unit as clawd() (the bug is about 3.7u
//   long and 2u tall; o.size scales it).
//   state (all 0..1 or phases, add to the idle): walk (leg phase; bug.scuttle gives it), hide, flat, open (shell up, wings
//     buzzing: flight), flip, dx, dy (u), sq, rot (screen, at the feet), antL / antR (antenna raise), noShadow, ground.
//   face: eyes, mouth, squint, lookX / lookY, blush, emote / emoteK / emoteAge, tint / tintK.
//   colour: shell, shellDk, shellLt, face, legCol, spots (true = ladybug spots, or [[x, y, r], ...]), spotCol.
//   boil: boilKey (default: call order).
//   Acting: bug(x, y, u, { ...bug.act(t, keys), ... }), keys as for emotions(). Moves (spread them in):
//   bug.scuttle(t, t0, t1, x0, x1, { step }) (gives x; a step cycle per `step` px, default 18), bug.squash(t, t0, t1) (flat from t0, pops back at t1, dizzy),
//   bug.fly(t, t0, t1, p0, p1, { h }) (opens the shell, buzzes along a wobbly arc, lands; gives x, y).
//   Jar: bug.jar(x, y, h, 'back' | 'front', { down, lid, rot, w (width / height, default .76) }) around the bug: 'back' before it, 'front' after it;
//   (x, y) = the middle of the jar's bottom (down: its mouth) on the ground, h its height.
// Expects: core.js + clawd.js (eye, mouth, emote, emotions, EMO, TINT, EMOTE_TOP). World space; fine under a camera.
// Source: made for the asset library, 2026-09-25, by painter-cast (Claude Opus 5.5).
const bug = (() => {
  const K = 1;   // the bug's own unit, as a fraction of Clawd's u
  // bug units, facing right, y up negative
  const SHELL = [[-1.6, -.5], [-1.45, -1.25], [-.8, -1.75], [0, -1.9], [.7, -1.65], [1.05, -1.1], [1.05, -.55], [.3, -.42], [-.7, -.4]];
  const HINGE = [.75, -1.55], HEAD = [1.42, -.95], HR = .72, HIDDEN = [1.12, -.52];
  const HIPS = [-.85, -.1, .6], REACH = [-.6, -.1, .5];
  const SPOTS = [[-.95, -1.15, .2], [-.2, -1.55, .18], [.45, -1.2, .2], [-.45, -.78, .16], [-1.3, -.75, .13]];
  const DEF = { shell: PAL.sap, shellDk: '#4A7440', shellLt: '#B9D69E', face: '#EFD99C', legCol: '#3B3346', spotCol: PAL.ink };
  const rotP = (p, c, a) => { const s = Math.sin(a), k = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * k - y * s, c[1] + x * s + y * k]; };
  const tinted = (c, tint, k) => { const tc = tint && (TINT[tint] || tint); return tc && k > 0 ? mixCol(c, tc, .45 * clamp(k)) : c; };
  const ADD = ['sq', 'dy', 'dx', 'rot', 'antL', 'antR', 'lookX', 'lookY'];

  function B(x, y, u, o = {}) {
    const id = o.boilKey ?? ('bug' + (++CLAWD_N)), rs = part => boilSeed(`bug ${id} ${part}`);
    const time = o.time ?? T, seed = o.seed || 0, b = u * K * (o.size ?? 1), sw = clamp(b / 15, .4, 2.4) * .85, J = b * .025;   // line weights from the bug's own size: it's small
    const hide = clamp(o.hide || 0), flat = o.flat || 0, open = clamp(o.open || 0), walking = o.walk != null;
    // idle, on the beat: the antennae twitch in turn, a breath
    const bi = Math.floor(bpOf(time)), tw = spring(time, OFF + bi * BEAT, 7, 22) * .35;
    const idle = { sq: .02 * Math.sin((time + seed) * TAU * .5), antL: bi % 2 ? tw : 0, antR: bi % 2 ? 0 : tw };
    const q = { ...o };
    for (const k of ADD) q[k] = (idle[k] || 0) + (o[k] || 0);
    q.antL += ((o.aL ?? .2) - .2) * .6; q.antR += ((o.aR ?? .2) - .2) * .6;
    const fs = q.flip ? -1 : 1, sq = q.sq, X = x + q.dx * u, Y = y + (q.dy || 0) * u;
    const tintAll = c => { const a = tinted(c, q.tint, q.tintK ?? 1); if (!q.tintPrev) return a; return mixCol(tinted(c, q.tintPrev[0], q.tintPrev[1]), a, q.tintMix ?? 1); };
    const C = { shell: tintAll(q.shell || DEF.shell), dk: tintAll(q.shellDk || DEF.shellDk), lt: q.shellLt || DEF.shellLt, face: tintAll(q.face || DEF.face), leg: q.legCol || DEF.legCol, spot: q.spotCol || DEF.spotCol };
    const S = pts => pts.map(([a, c]) => [a * b, c * b]);
    // flat squashes about the ground and splays; hide lowers the shell onto the ground
    const fx = (1 + sq * .6) * (1 + .7 * Math.max(0, flat)), fy = (1 - sq) * (1 - .68 * flat);
    const drop = .3 * hide + (walking ? -.05 * Math.abs(Math.sin(o.walk * TAU * 2)) : 0) - .35 * open;
    const toW = p => { let a = p[0] * b * fs * fx, c = (p[1] + drop) * b * fy; const r = q.rot || 0; return [X + a * Math.cos(r) - c * Math.sin(r), Y + a * Math.sin(r) + c * Math.cos(r)]; };

    rs('shadow');
    if (!o.noShadow) {
      const gy = o.ground ?? y, h = Math.max(0, gy - Y), f = 1 - clamp(h / (8 * u)) * .6;
      if (h < 8 * u) paint(ellPts(X, gy + .08 * u, 1.9 * b * f * fx, .32 * b * f, 16), { fill: PAL.ink, fillOp: 80 * f, bleed: .25, tex: .3, border: .1, ink: null });
    }
    push(); translate(X, Y); if (q.rot) rotate(q.rot); scale(fs * fx, fy);
    // legs: tripods alternate (near front + near back with the far middle); feet lift as they swing forward; they fold
    // in to hide, splay when squashed, dangle in flight
    const leg = (i, far) => {
      rs('leg' + i + far);
      const hx = HIPS[i] + (far ? .18 : 0), hy = -.45, ph = ((o.walk || 0) + ((i + far) % 2 ? .5 : 0)) * TAU;
      if (hide > .9) return;
      let footX = hx + REACH[i] * (1 + .6 * Math.max(0, flat)), footY = 0;
      if (walking) { footX += .28 * Math.sin(ph); footY -= .22 * Math.max(0, Math.cos(ph)); }
      footX = lerp(footX, hx + REACH[i] * .3, Math.max(hide, open * .7));
      footY = lerp(lerp(footY, hy + drop + .15, hide), drop + .2, open);   // hips move with the body; feet stay on the ground
      const knee = [lerp(hx, footX, .55) + (i - 1) * .08, lerp(-.72 + drop, (hy + drop + footY) / 2 - .1, Math.max(hide, open))];
      inkLine(S([[hx, hy + drop], knee, [footX, footY]]), sw * (far ? .32 : .42), far ? mixCol(C.leg, C.dk, .45) : C.leg, 'ink', .3);
    };
    for (let i = 0; i < 3; i++) leg(i, 1);
    translate(0, drop * b);
    // wings: out from under the lifted shell, two drawings alternating every frame (the buzz), with speed arcs
    if (open > .05) {
      rs('wings');
      const up = frac(time * 12) < .5;
      for (const [k, dx2] of [[0, .15], [1, 0]]) {
        push(); translate((.45 + dx2) * b, -1.35 * b); rotate(open * (up ? .75 : .2) + k * .12);
        paint(S(through([[0, -.05], [-.9, -.32], [-2.1, -.26], [-2.55, 0], [-2.0, .22], [-.8, .2], [0, .05]], 3)).map(([a, c]) => [a * open, c]), { wash: '#E6EFEC', ink: PAL.ink, sw: sw * .35 });
        pop();
      }
      for (let k = 0; k < 3; k++) inkLine(S([[-1.7 - .2 * k, -2.0 - .3 * k], [-2.1 - .2 * k, -1.7 - .3 * k], [-2.3 - .2 * k, -1.3 - .3 * k]]), sw * .3 * open, mixCol(PAL.ink, PAL.paper, .4), 'inkfine', .5);
    }
    // underside
    rs('belly'); paint(ellPts(-.2 * b, -.45 * b, 1.25 * b, .3 * b, 14), { wash: mixCol(C.dk, C.leg, .5), ink: null });
    // head (tucked under the shell's front edge; it slides in to hide) with its antennae
    const hc = [lerp(HEAD[0], HIDDEN[0], hide), lerp(HEAD[1], HIDDEN[1], hide)], hr = HR * (1 - .12 * hide);
    rs('antennae');
    for (const [s, root, th0, key] of [[-1, [-.28, -.6], -.3, 'antL'], [1, [.18, -.65], .5, 'antR']]) {
      const a = clamp(q[key], -1.5, 1.5), th = (a > 0 ? th0 * (1 - .7 * a) : th0 + Math.sign(th0) * -a * .9) + (walking ? .12 * Math.sin(o.walk * TAU * 2 + s) : 0);
      const L = lerp(1.25, .4, hide), r0 = [hc[0] + root[0] * hr / HR, hc[1] + root[1] * hr / HR], dir = [Math.sin(th - hide * 1.4), -Math.cos(th - hide * 1.4)];
      const tip = [r0[0] + dir[0] * L, r0[1] + dir[1] * L], mid = [r0[0] + dir[0] * L * .5 - dir[1] * .15, r0[1] + dir[1] * L * .5 + dir[0] * .15];
      inkLine(S([r0, mid, tip]), sw * .32, C.leg, 'ink', .5);
      paint(ellPts(tip[0] * b, tip[1] * b, .12 * b, .12 * b, 10), { wash: PAL.ochre, ink: PAL.ink, sw: sw * .2 });
    }
    rs('head');
    paint(ellPts(hc[0] * b, hc[1] * b, hr * b, hr * .94 * b, 18, J), { wash: C.face, ink: PAL.ink, sw: sw * .6 });
    if (q.blush) paint(ellPts((hc[0] + .25) * b, (hc[1] + .3) * b, .2 * b, .1 * b, 10), { fill: PAL.rose, fillOp: 170 * clamp(q.blush), bleed: .2, ink: null });
    // eyes: Clawd's, one call per eye (drawn big and scaled down when the catch-light shows)
    rs('eyes');
    const kinds = Array.isArray(q.eyes) ? q.eyes : q.eyes === 'wink' ? ['happy', 'normal'] : [q.eyes || 'normal', q.eyes || 'normal'];
    const ue = .27 * b * hr / HR, zs = CAM ? CAM.zoom : 1, U = ue * zs > 9 ? Math.max(ue, 9.5) : ue, kk = ue / U, sqz = clamp(q.squint || 0);
    [[-.2, 0], [.3, 1]].forEach(([ex, i]) => {
      push(); translate((hc[0] + ex * hr / HR) * b, (hc[1] - .1) * b);
      if (sqz > .8) inkLine([[-.8 * ue, 0], [.8 * ue, 0]], sw * .6, PAL.ink, 'ink', 0);
      else { scale((1 + sqz * .15) * kk, (1 - sqz) * kk); eye(kinds[i], i ? 1 : -1, U, { ...q, lookX: clamp(q.lookX, -1, 1), lookY: clamp(q.lookY, -1, 1) }, sw * .6 / kk); }
      pop();
    });
    if (q.mouth) { rs('mouth'); const mu = .19 * b * hr / HR, M = Math.max(mu, 9.5), km = mu / M; push(); translate((hc[0] + .08) * b, (hc[1] + .32) * b); scale(km); translate(0, 4.3 * M); mouth(M, q.mouth, sw * .6 / km); pop(); }
    // shell: one dome (it lifts on its hinge to fly), a shine, spots, and its outline
    rs('shell');
    push(); translate(HINGE[0] * b, HINGE[1] * b); rotate(-.85 * open); translate(-HINGE[0] * b, -HINGE[1] * b);
    const sh = through([...SHELL, SHELL[0]], 4).map(([a, c]) => [a * b + jit(J), c * b + jit(J)]);
    paint(sh, { wash: C.shell, ink: null });
    paint(ellPts(-.25 * b, -1.45 * b, .85 * b, .24 * b, 14, 0, -.12), { fill: C.lt, fillOp: 120, bleed: .15, tex: .8, border: .7, ink: null });
    paint(S([[-1.5, -.62], [-.6, -.5], [.4, -.52], [1.0, -.64], [1.0, -.52], [.3, -.43], [-.7, -.41], [-1.55, -.5]]), { wash: C.dk, ink: null });
    const spots = q.spots === true ? SPOTS : q.spots || [];
    for (const [sx, sy, r] of spots) paint(ellPts(sx * b, sy * b, r * b, r * .85 * b, 10, J * .5), { wash: C.spot, ink: null });
    paint(sh, { ink: PAL.ink, sw: sw * .75 });
    inkLine(S([[1.0, -1.2], [.6, -1.62], [0, -1.8]]), sw * .3, mixCol(C.dk, PAL.ink, .3), 'inkfine', .5);
    pop();
    translate(0, -drop * b);
    for (let i = 0; i < 3; i++) leg(i, 0);
    pop();
    rs('emote');
    if (q.emote) {
      const top = EMOTE_TOP.includes(q.emote), [ex, ey] = toW(top ? [hc[0], hc[1] - 2.6] : [hc[0] + 1.1, hc[1] - 1.7]);
      emote(q.emote, ex, ey, u * .5, q.emoteK ?? 1, q.emoteAge ?? time);
    }
    rs('after');
  }

  // Clawd's emotions() for a bug: same keys and acting; the tint cross-fades through each change. The body motion runs
  // o.phase s (default half a beat) off Clawd's so they don't bounce in unison, at o.bodyK (default .35) of Clawd's size.
  B.act = (t, keys, o = {}) => {
    const r = emotions(t, keys, o); let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
    const ph = o.phase ?? BEAT / 2, bk = o.bodyK ?? .35, age = t - keys[i][0], blend = i > 0 && age < .5, k = backOut(seg(age, 0, .4));
    const bodyD = (j, f) => { const E = EMO[keys[j][1]] || EMO.neutral; if (!E.body || (keys[j][2] && f in keys[j][2])) return 0; return (E.body(t + ph)[f] ?? 0) - (E.body(t)[f] ?? 0); };
    for (const f of ['dy', 'dx', 'rot', 'sq', 'aL', 'aR']) r[f] = (r[f] ?? (f[0] === 'a' ? .2 : 0)) + (blend ? lerp(bodyD(i - 1, f), bodyD(i, f), k) : bodyD(i, f));
    r.dy *= bk; r.dx *= bk;
    const tintOf = j => { const E = EMO[keys[j][1]] || EMO.neutral, ov = keys[j][2] || {}; return [ov.tint ?? E.tint, ov.tintK ?? E.tintK ?? 1]; };
    delete r.col; delete r.dk; delete r.lt;
    const [tint, tintK] = tintOf(i);
    return { ...r, tint, tintK, tintPrev: i > 0 ? tintOf(i - 1) : null, tintMix: i > 0 ? ease(seg(age, 0, .3)) : 1 };
  };
  // Scuttle from x0 to x1 between t0 and t1: a tiny crouch, a quick start, legs a blur of steps, a skid and a settle.
  B.scuttle = (t, t0, t1, x0, x1, o = {}) => {
    const flip = x1 < x0, stepLen = o.step ?? 18;
    if (t < t0) return { x: x0, flip, sq: .15 * ease(seg(t, t0 - .08, t0)) };
    const k = seg(t, t0, t1), x = lerp(x0, x1, .4 * ease(k) + .6 * (1 - Math.pow(1 - k, 2)));
    if (t < t1) return { x, flip, walk: Math.abs(x - x0) / stepLen, rot: (flip ? .06 : -.06) * Math.sin(k * Math.PI) };
    return { x: x1, flip, rot: (flip ? -.1 : .1) * spring(t, t1, 7, 20), sq: .12 * spring(t, t1, 8, 22) };
  };
  // Squashed flat at t0 (by whatever lands on it), flat until t1, then it pops back up with an elastic overshoot and
  // stays dizzy for a second.
  B.squash = (t, t0, t1) => {
    if (t < t0) return {};
    if (t < t1) return { flat: 1 + .15 * Math.exp(-12 * (t - t0)) * Math.cos(30 * (t - t0)), eyes: 'x', mouth: null };
    const a = t - t1, f = 1 - elasticOut(seg(a, 0, .7));
    return { flat: f, eyes: a < 1.4 ? 'swirl' : undefined, emote: a < 1.4 ? 'stars' : undefined, emoteK: seg(a, .1, .3) * (1 - seg(a, 1.2, 1.4)), emoteAge: a };
  };
  // Flight from p0 to p1 ([x, y] ground points): the shell opens and the wings buzz (.2 s), it rises, wobbles along an arc
  // h px high, lands and folds its wings away.
  B.fly = (t, t0, t1, p0, p1, o = {}) => {
    const flip = p1[0] < p0[0], h = o.h ?? Math.abs(p1[0] - p0[0]) * .3 + 60;
    if (t < t0 - .2) return { x: p0[0], y: p0[1], flip };
    if (t < t0) return { x: p0[0], y: p0[1], flip, open: ease(seg(t, t0 - .2, t0)), sq: .1 };
    if (t < t1) {
      const k = seg(t, t0, t1), kk = ease(k), [px, py] = arcPt(p0, p1, h, kk), wob = Math.sin(k * TAU * 2.5) * Math.sin(k * Math.PI);
      return { x: px + wob * 12, y: py - 14 * Math.abs(Math.sin(k * TAU * 3)) * Math.sin(k * Math.PI), flip, open: 1, rot: .15 * wob, noShadow: o.ground == null, ground: o.ground };
    }
    const a = t - t1;
    return { x: p1[0], y: p1[1], flip, open: 1 - ease(seg(a, .05, .3)), sq: .2 * Math.exp(-10 * a) * Math.cos(20 * a) };
  };
  // A glass jar. Draw 'back' before the bug and 'front' after it. down: upside down, its mouth on the ground (caught!);
  // lid (default on, unless down); rot tilts it about its base.
  B.jar = (x, y, h, layer, o = {}) => {
    boilSeed('jar ' + (o.key ?? '') + layer);
    const sw = o.sw ?? clamp(h / 110, .6, 2), w = (o.w ?? .76) * h, glass = o.glass ?? '#CFE3E1';
    push(); translate(x, y); if (o.rot) rotate(o.rot); if (o.down) { translate(0, -h); scale(1, -1); }
    const body = rrPts(-w / 2, -.88 * h, w, .88 * h, .16 * h);
    if (layer === 'back') paint(body, { wash: glass, washOp: 90, ink: null });
    else {
      paint(ribbon([[-w * .35, -.74 * h], [-w * .39, -.46 * h], [-w * .34, -.2 * h]], .06 * h, .035 * h), { wash: PAL.cream, ink: null });
      paint(ribbon([[w * .3, -.72 * h], [w * .33, -.58 * h]], .035 * h, .025 * h), { wash: PAL.cream, ink: null });
      paint(body, { ink: PAL.ink, sw });
      paint(rrPts(-w * .43, -.98 * h, w * .86, .1 * h, .04 * h), { ink: PAL.ink, sw: sw * .7 });
      if (o.lid ?? !o.down) {
        paint(rrPts(-w * .46, -1.1 * h, w * .92, .14 * h, .05 * h), { wash: '#B8B2A4', fill: '#8E8778', fillOp: 70, tex: .6, ink: PAL.ink, sw: sw * .8 });
        for (const k of [-1, 0, 1]) paint(ellPts(k * w * .2, -1.03 * h, .018 * h, .018 * h, 8), { wash: PAL.ink, ink: null });
      }
    }
    pop();
  };
  return B;
})();
