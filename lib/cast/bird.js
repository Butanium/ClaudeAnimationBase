// lib/cast/bird.js: a songbird for Clawd's world. It hops, pecks, flaps, flies on arcs, lands on things, sings and sleeps,
// and acts with Clawd's own emotions: the same eyes, the beak is its mouth, Clawd's arm raise becomes its wings.
// Use: bird(x, y, u, o): (x, y) = the point between its feet (on the ground, a branch, Clawd's head); u = the same unit as
//   clawd(), so pass Clawd's u (the bird is about 4u long and 4u tall).
//   o.state: idle (twitchy looks, tail flicks) | peck | flap | sing | sleep | fly | glide, all beat-locked; o.seed de-twins.
//   pose (added to the state's): flip, dx, dy (u), sq, rot (screen, at the feet), tilt (pitch at the hip, + = nose down),
//     cock / hx / hy (head turn and offset), wing (raise, + = up) + spread 0..1, tailA, beak 0..1, fly 0..1 (legs tucked),
//     reach (feet forward), ground (y for the shadow when airborne), noShadow.
//   face: eyes, mouth (opens the beak), squint, lookX / lookY, blush, emote / emoteK / emoteAge, tint / tintK.
//   colour: plume, wingCol, lt, belly, beakCol, legCol.  boil: boilKey (default: call order).
//   Acting: bird(x, y, u, { ...bird.act(t, keys), state }), keys as for emotions() (it carries the tint through changes).
//   Moves to spread in: bird.fly(t, t0, t1, p0, p1, { h, hz }) (take-off, flight on an arc, flare, landing; gives x, y),
//   bird.hops(t, t0, x0, x1, n, { every, h }) (gives x), bird.peck(t, [times]).
// Expects: core.js + clawd.js (eye, emote, emotions, EMO, TINT, EMOTE_TOP). World space; fine under a camera (zoom 1–2).
// Source: made for the asset library, 2026-09-25, by painter-cast (Claude Opus 5.5).
const bird = (() => {
  const HIP = 1.05, HC = [1.05, -2.25], TR = [-1.85, -1.5];   // hip height, head centre, tail root (hip-relative, in u)
  // silhouette control points, hip-relative, facing right, in u: [x, y, how much the head moves it, how much the tail does]
  const SIL = [
    [-3.05, -2.2, 0, 1], [-3.2, -1.8, 0, 1], [-1.8, -.72, 0, .15],
    [-.9, .02, 0, 0], [.35, .18, 0, 0], [1.35, -.35, 0, 0], [1.8, -1.15, .25, 0],
    [1.95, -1.9, 1, 0], [1.9, -2.7, 1, 0], [1.05, -3.2, 1, 0], [.05, -2.85, .6, 0],
    [-1.1, -2.05, .1, 0], [-2.05, -1.88, 0, .35]];
  const BEAK = { o: .3, O: .75, open: .6, laugh: .7, wail: .9, yawn: 1, grin: .35, teeth: .2, smile: .12, tongue: .3, cat: .08, smirk: .08, wobble: .12 };
  const DEF = { plume: '#6C9DC6', wingCol: '#44739F', lt: '#B7D6EC', belly: '#F4DFBC', beakCol: PAL.ochre, legCol: '#B8693A' };
  const rotP = (p, c, a) => { const s = Math.sin(a), k = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * k - y * s, c[1] + x * s + y * k]; };
  // closed Catmull-Rom through the control points: one smooth outline
  function loop(C, n = 5) {
    const N = C.length, out = [];
    for (let i = 0; i < N; i++) {
      const p0 = C[(i + N - 1) % N], p1 = C[i], p2 = C[(i + 1) % N], p3 = C[(i + 2) % N];
      for (let k = 0; k < n; k++) {
        const s = k / n, s2 = s * s, s3 = s2 * s;
        out.push([0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * s + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * s2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * s3)));
      }
    }
    return out;
  }
  // a wing, shoulder at the origin, pointing back (-x); s = spread 0 (folded) .. 1 (open, feathers fanned)
  function wingPts(s, u) {
    const L = 1 + .5 * s, D = 1 + .55 * s;
    const lead = through([[.3, -.3], [-.5, -.52], [-1.45, -.44], [-2.25, -.14], [-2.7, .1]], 4);
    const trail = through([[-2.7, .1], [-1.9, .42], [-.9, .5], [.25, .32]], 4).slice(1);
    const pts = lead.concat(trail.map(([x, y], i) => [x, y + (i < 9 ? (i % 2 ? -.1 : .13) * s : 0)]));
    return pts.map(([x, y]) => [x * L * u, y * D * u]);
  }
  // the last event on a beat grid (step in beats; each slot fires with probability rate, seeded), and the next one
  const fires = (i, seed, rate, salt) => hash(i * 1.93 + seed * 11.7 + salt * 5.31) < rate;
  function lastEv(t, step, seed, rate, salt = 0) {
    const j = Math.floor(bpOf(t) / step); let i = j;
    while (i > j - 32 && !fires(i, seed, rate, salt)) i--;
    return OFF + i * step * BEAT;
  }
  function nextEv(t, step, seed, rate, salt = 0) {
    const j = Math.floor(bpOf(t) / step) + 1; let i = j;
    while (i < j + 32 && !fires(i, seed, rate, salt)) i++;
    return OFF + i * step * BEAT;
  }
  // twitchy head: on some eighth notes the head snaps (with a tiny overshoot) to a new look
  function twitch(t, seed, rate = .45) {
    const pose = tj => { const j = Math.round((tj - OFF) / BEAT * 2); return { cock: (hash(j * 3.1 + seed * 17.3) - .5) * .5, hx: (hash(j * 5.7 + seed * 7.1) - .5) * .3, look: (hash(j * 9.3 + seed * 2.9) - .5) * 1.4 }; };
    const t1 = lastEv(t, .5, seed, rate, 1), t0 = lastEv(t1 - .01, .5, seed, rate, 1), k = backOut(seg(t - t1, 0, .08));
    const A = pose(t0), B = pose(t1);
    return { cock: lerp(A.cock, B.cock, k), hx: lerp(A.hx, B.hx, k), lookX: lerp(A.look, B.look, k), crestAge: t - t1 };
  }
  // one peck, a = time since the beak hits the ground: pull back, jab, hold, come back up with a little overshoot
  function peckPose(a) {
    if (a < -.12 || a > .42) return { tilt: 0 };
    if (a < 0) { const j = easeIn(seg(a, -.05, 0)), k = ease(seg(a, -.12, -.05)); return { tilt: lerp(-.14 * k, 1, j), cock: -.12 * k * (1 - j) }; }
    if (a < .07) return { tilt: 1, hit: a };
    return { tilt: 1 - backOut(seg(a, .07, .3)), hit: a };
  }
  // wing beat: fast downstroke, slower upstroke; the body bobs up on the downstroke
  function flapPose(t, hz, seed) {
    const p = frac(t * hz + seed * .37), d = p < .4 ? ease(p / .4) : 1 - ease((p - .4) / .6);   // d: 0 = up, 1 = down
    return { wing: lerp(1.45, -.85, d), spread: .7 + .3 * Math.sin(d * Math.PI), dy: -.22 * Math.sin(p * TAU), tailA: -.1 + .08 * d };
  }
  const STATES = {
    idle: (t, s) => { const w = twitch(t, s), tf = t - lastEv(t, 1, s, .5, 2); return { ...w, tailA: .12 + .35 * Math.exp(-9 * tf) * Math.max(0, Math.cos(tf * 22)), sq: .03 * pulse(t, 5) }; },
    peck: (t, s) => {
      const l = lastEv(t, 1, s, .8, 3), n = nextEv(t, 1, s, .8, 3), P = t - l < .42 ? peckPose(t - l) : peckPose(t - n);
      const w = twitch(t, s, .3);
      return { ...P, cock: (P.cock || 0) + w.cock * .5, lookX: .4 + w.lookX * .3, lookY: .5, tailA: .1 + .15 * P.tilt, crestAge: w.crestAge };
    },
    flap: (t, s) => {   // bursts of flapping on some beats, standing
      const l = lastEv(t, 1, s, .6, 4), a = t - l, on = a < BEAT * .75, f = flapPose(t, 2.5 / BEAT, s), k = on ? Math.sin(Math.PI * clamp(a / (BEAT * .75))) : 0;
      return { wing: f.wing * k + .1, spread: f.spread * k, dy: f.dy * k * 1.5 - .25 * k, tailA: .15 + .2 * k, sq: -.06 * k };
    },
    sing: (t, s) => {
      const bp = bpOf(t) * 2, j = Math.floor(bp), f = bp - j, amp = hash(j * 2.7 + s * 5.3), open = amp > .25 ? amp * Math.sin(Math.PI * Math.min(1, f * 1.5)) : 0;
      return { beak: .85 * open, cock: -.3 - .12 * open, hy: -.08 * open, sq: -.05 * open + .03 * pulse(t), tailA: .12 + .2 * open, emote: 'music', crestAge: t - (OFF + j * BEAT / 2) };
    },
    sleep: (t, s) => { const br = Math.sin((t + s) * TAU * .3); return { hx: -.4, hy: .38, cock: .5, sx: 1.08, sq: .12 + .03 * br, eyes: 'closed', emote: 'zzz', tailA: -.05, wing: -.05 }; },
    fly: (t, s) => ({ ...flapPose(t, 2 / BEAT, s), fly: 1, tilt: -.05 }),
    glide: (t, s) => ({ wing: .55 + .06 * Math.sin((t + s) * 3), spread: 1, dy: .12 * Math.sin((t + s) * 2.2), fly: 1, tilt: .04, tailA: -.12 }),
  };
  const ADD = ['sq', 'dy', 'dx', 'rot', 'tilt', 'cock', 'hx', 'hy', 'tailA', 'lookX', 'lookY', 'wing', 'spread', 'beak', 'fly'];
  const tinted = (c, tint, k) => { const tc = tint && (TINT[tint] || tint); return tc && k > 0 ? mixCol(c, tc, .45 * clamp(k)) : c; };

  function B(x, y, u, o = {}) {
    const id = o.boilKey ?? ('bird' + (++CLAWD_N)), rs = part => boilSeed(`bird ${id} ${part}`);
    const seed = o.seed || 0, time = o.time ?? T;
    const st = (o.state && STATES[o.state] && !(o.fly > .5)) ? STATES[o.state](time, seed) : {};
    const q = { ...st };
    for (const k in o) if (o[k] !== undefined && o[k] !== null && !ADD.includes(k)) q[k] = o[k];
    for (const k of ADD) q[k] = (st[k] || 0) + (o[k] || 0);
    const fly = clamp(q.fly), sq = q.sq, fs = q.flip ? -1 : 1, J = u * .035, sw = clamp(u / 15, .45, 2.4);
    // Clawd's arm raise (aL, aR from feel/emotions) lifts or droops the folded wings
    const arm = ((o.aL ?? .2) + (o.aR ?? .2)) / 2 - .2, wing = q.wing + .08 + (fly > .5 ? 0 : arm * .8), spread = clamp(q.spread + (fly > .5 ? 0 : Math.max(0, arm) * .7));
    const beak = clamp(q.beak + (BEAK[q.mouth] || 0) + (q.mouth === 'wobble' ? .06 * Math.sin(time * 30) : 0));
    // colours, with the mood tint (bird.act cross-fades it through a change)
    const tintAll = c => { const a = tinted(c, q.tint, q.tintK ?? 1); if (!q.tintPrev) return a; const b = tinted(c, q.tintPrev[0], q.tintPrev[1]); return mixCol(b, a, q.tintMix ?? 1); };
    const C = { plume: tintAll(q.plume || DEF.plume), wing: tintAll(q.wingCol || DEF.wingCol), lt: q.lt || DEF.lt, belly: q.belly || DEF.belly, beak: q.beakCol || DEF.beakCol, leg: q.legCol || DEF.legCol };
    const X = x + (q.dx || 0) * u, Y = y + (q.dy || 0) * u, hx = q.hx, hy = q.hy, cock = q.cock, tilt = q.tilt, sx = q.sx ?? 1;
    // hip-relative point (in u) → world, through the same transforms as the drawing below
    const toW = p => {
      let [a, b] = rotP([p[0] * u, p[1] * u], [0, 0], tilt); b -= HIP * u;
      a *= fs * (1 + sq * .6) * sx; b *= 1 - sq;
      const r = q.rot || 0; return [X + a * Math.cos(r) - b * Math.sin(r), Y + a * Math.sin(r) + b * Math.cos(r)];
    };
    const headP = p => { const r = rotP(p, HC, cock); return [r[0] + hx, r[1] + hy]; };

    rs('shadow');
    if (!o.noShadow) {
      const gy = o.ground ?? y, h = Math.max(0, gy - Y), f = 1 - clamp(h / (10 * u)) * .6;
      if (h < 10 * u) paint(ellPts(X, gy + .12 * u, 2.1 * u * f * sx, .42 * u * f, 18), { fill: PAL.ink, fillOp: 85 * f, bleed: .25, tex: .3, border: .1, ink: null });
    }
    push(); translate(X, Y); if (q.rot) rotate(q.rot); scale(fs * (1 + sq * .6) * sx, 1 - sq);
    // legs: stand (knees bend back when crouched), or tuck under the belly in flight; far leg first
    [[-.28, 1], [.22, 0]].forEach(([lx, far], i) => {
      rs('leg' + i);
      const bend = Math.max(0, sq) * 1.6, reach = (q.reach || 0) * .7, col = far ? mixCol(C.leg, PAL.ink, .3) : C.leg;
      const stand = [[lx * u, -1 * u], [(lx - .12 - bend * .5) * u, -.42 * u], [(lx + reach) * u, 0]];
      const tuck = [[lx * u, -1 * u], [(lx - .4) * u, -.62 * u], [(lx - .75) * u, -.55 * u]];
      const L = stand.map((p, j) => [lerp(p[0], tuck[j][0], fly), lerp(p[1], tuck[j][1], fly)]);
      if (fly < .6) { const [fx, fy] = L[2]; L.push([fx + .42 * u, fy + .02 * u]); inkLine([[fx - .22 * u, fy], [fx, fy]], sw * .7, col, 'ink', 0); }
      inkLine(L, sw * .75, col, 'ink', 0);
    });
    push(); translate(0, -HIP * u); rotate(tilt);
    // crest: a little tuft that lags behind the head's snaps
    rs('crest');
    if (q.crest !== false) {
      const lag = .35 * spring(q.crestAge ?? 99, 0, 7, 20), root = headP([.8, -3.05]), c = cock + lag;
      const tuft = [root, [root[0] - .25 + Math.sin(c) * .1, root[1] - .45], [root[0] - .62 + Math.sin(c) * .3, root[1] - .62 + c * .2]];
      paint(ribbon(tuft.map(([a, b]) => [a * u, b * u]), .42 * u, .06 * u), { wash: C.plume, ink: PAL.ink, sw: sw * .55 });
    }
    // far wing, behind the body, only when raised
    const wingAt = (sh, a, s, col, key) => { rs(key); push(); translate(sh[0] * u, sh[1] * u); rotate(a); paint(wingPts(s, u), { wash: col, ink: PAL.ink, sw: sw * .7 }); pop(); };
    if (wing > .3 || fly > .3) wingAt([.15, -1.95], wing * .92 + .12, spread, mixCol(C.wing, PAL.ink, .28), 'wingFar');
    // body and head: one outline
    rs('body');
    const S = SIL.map(([a, b, wh, wt]) => {
      let p = [a, b];
      if (wh) { const h = headP(p); p = [lerp(p[0], h[0], wh), lerp(p[1], h[1], wh)]; }
      if (wt) { const tp = rotP(p, TR, q.tailA); p = [lerp(p[0], tp[0], wt), lerp(p[1], tp[1], wt)]; }
      return [p[0] * u + jit(J), p[1] * u + jit(J)];
    });
    const body = loop(S);
    paint(body, { wash: C.plume, ink: null });
    paint(ellPts(-.2 * u, -2.2 * u, 1.35 * u, .5 * u, 14, 0, -.25), { fill: C.lt, fillOp: 110, bleed: .2, tex: .85, border: .8, ink: null });
    paint(ellPts(.82 * u, -.95 * u, .92 * u, .66 * u, 16, J, -.65), { wash: C.belly, ink: null });
    paint(body, { ink: PAL.ink, sw: sw * .85 });
    // face, in head space: beak, cheek, eye
    push(); translate((HC[0] + hx) * u, (HC[1] + hy) * u); rotate(cock); translate(-HC[0] * u, -HC[1] * u);
    rs('beak');
    const bt = [1.85, -2.58], bb = [1.88, -1.98], bm = [1.9, -2.28], tip = [2.78, -2.26], P = pts => pts.map(([a, b]) => [a * u, b * u]);
    if (beak < .04) paint(P([bt, tip, bb]), { wash: C.beak, ink: PAL.ink, sw: sw * .6 });
    else {
      const up = rotP(tip, bm, -.55 * beak), lo = rotP(tip, bm, .7 * beak);
      paint(P([bm, up, lo]), { wash: '#4A1F2A', ink: null });
      paint(P([bt, up, bm]), { wash: C.beak, ink: PAL.ink, sw: sw * .55 });
      paint(P([bm, lo, bb]), { wash: C.beak, ink: PAL.ink, sw: sw * .55 });
    }
    if (q.blush) { rs('blush'); paint(ellPts(1.3 * u, -1.82 * u, .32 * u, .17 * u, 12), { fill: PAL.rose, fillOp: 170 * clamp(q.blush), bleed: .2, ink: null }); }
    rs('eye');
    const kinds = Array.isArray(q.eyes) ? q.eyes[1] : q.eyes === 'wink' ? 'happy' : q.eyes || 'normal', ue = .32 * u, sqz = clamp(q.squint || 0);
    push(); translate(1.2 * u, -2.42 * u);
    if (sqz > .8) inkLine([[-.8 * ue, .1 * ue], [.8 * ue, .1 * ue]], sw * .8, PAL.ink, 'ink', 0);
    else {
      // draw through the kit's eye(); it adds the catch-light only above u 9, so draw big and scale down when it shows
      const zs = CAM ? CAM.zoom : 1, U = ue * zs > 9 ? Math.max(ue, 9.5) : ue, k = ue / U;
      scale((1 + sqz * .15) * k, (1 - sqz) * k); eye(kinds, 1, U, { ...q, lookX: clamp(q.lookX, -1, 1), lookY: clamp(q.lookY, -1, 1) }, sw * .8 / k);
    }
    pop();
    pop();
    // near wing, over the body
    wingAt([.45, -1.78], wing, spread, C.wing, 'wing');
    pop(); pop();
    // peck contact: two tiny ticks where the beak hits
    if (q.hit != null && q.hit < .14) {
      rs('hit'); const [px, py] = toW(headP([2.7, -2.2])), k = 1 - q.hit / .14;
      for (const s of [-1, 1]) inkLine([[px + s * .25 * u, py - .12 * u], [px + s * (.25 + .35 * k) * u, py - (.2 + .3 * k) * u]], sw * .5, PAL.ink, 'inkfine', 0);
    }
    rs('emote');
    if (q.emote) {
      const top = EMOTE_TOP.includes(q.emote), [ex, ey] = toW(headP(top ? [1, -4.9] : [2.2, -3.9]));
      emote(q.emote, ex, ey, u * .5, q.emoteK ?? 1, q.emoteAge ?? time);
    }
    rs('after');
  }

  // Clawd's emotions() for a bird: same keys and acting, and the mood tint cross-fades through each change.
  B.act = (t, keys, o = {}) => {
    const r = emotions(t, keys, o); let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
    const tintOf = j => { const E = EMO[keys[j][1]] || EMO.neutral, ov = keys[j][2] || {}; return [ov.tint ?? E.tint, ov.tintK ?? E.tintK ?? 1]; };
    delete r.col; delete r.dk; delete r.lt;
    const [tint, tintK] = tintOf(i);
    return { ...r, tint, tintK, tintPrev: i > 0 ? tintOf(i - 1) : null, tintMix: i > 0 ? ease(seg(t - keys[i][0], 0, .3)) : 1 };
  };
  // Flight from p0 to p1 ([x, y] feet points) on an arc h px high: a crouch before t0, a jump into flapping flight, a flare
  // (wings up, body pitched back, feet forward) over the last fifth, then a landing squash and the wings folding.
  B.fly = (t, t0, t1, p0, p1, o = {}) => {
    const dir = p1[0] >= p0[0] ? 1 : -1, flip = dir < 0, h = o.h ?? Math.abs(p1[0] - p0[0]) * .3 + 40, hz = o.hz ?? 2 / BEAT;
    if (t < t0) { const c = ease(seg(t, t0 - .18, t0)); return { x: p0[0], y: p0[1], flip, sq: .22 * c, wing: .45 * c, spread: .3 * c, tilt: -.12 * c }; }
    if (t < t1) {
      const k = seg(t, t0, t1), kk = 1 - Math.pow(1 - k, 1.7), [px, py] = arcPt(p0, p1, h, kk), [qx, qy] = arcPt(p0, p1, h, Math.min(1, kk + .02));
      const f = ease(seg(k, .78, 1)), fl = flapPose(t, hz, o.seed || 0), pitch = clamp(Math.atan2(qy - py, Math.abs(qx - px) + 1e-3) * .6, -.5, .5);
      return { x: px, y: py, flip, fly: clamp(seg(k, 0, .12) - ease(seg(k, .72, .95))), wing: lerp(fl.wing, 1.4, f), spread: lerp(fl.spread, 1, f),
               dy: fl.dy * (1 - f), tilt: lerp(pitch, -.45, f), sq: -.14 * (1 - seg(k, 0, .15)), reach: f, tailA: lerp(fl.tailA, .3, f), noShadow: o.ground == null, ground: o.ground };
    }
    const a = t - t1, k = backOut(seg(a, 0, .35));
    return { x: p1[0], y: p1[1], flip, sq: .26 * Math.exp(-9 * a) * Math.cos(18 * a), wing: 1.4 * (1 - k), spread: 1 - ease(seg(a, 0, .3)), tilt: -.45 * (1 - backOut(seg(a, 0, .3))), tailA: .35 * spring(t, t1, 6, 20), reach: 1 - ease(seg(a, 0, .15)) };
  };
  // n hops from x0 to x1 starting at t0, one every `every` s (default half a beat), h u high.
  B.hops = (t, t0, x0, x1, n = 3, o = {}) => {
    const every = o.every ?? BEAT / 2, air = every * (o.air ?? .62), h = o.h ?? 1.3, flip = x1 < x0, i = Math.floor((t - t0) / every);
    if (t < t0) return { x: x0, flip, sq: .18 * ease(seg(t, t0 - .08, t0)) };
    if (i >= n) { const a = t - (t0 + (n - 1) * every + air); return { x: x1, flip, sq: .22 * Math.exp(-12 * a) * Math.cos(22 * a), tailA: .3 * spring(a, 0, 8, 22) }; }
    const a = t - t0 - i * every, xa = lerp(x0, x1, i / n), xb = lerp(x0, x1, (i + 1) / n);
    if (a < air) { const k = a / air, s = Math.sin(k * Math.PI); return { x: lerp(xa, xb, ease(k)), dy: -h * 4 * k * (1 - k), sq: -.12 * s, flip, wing: .35 * s, spread: .15 * s, tailA: -.12 * s + .1 }; }
    const g = a - air, crouch = i < n - 1 ? ease(seg(g, every - air - .07, every - air)) : 0;
    return { x: xb, flip, sq: .2 * Math.exp(-14 * g) * Math.cos(20 * g) + .16 * crouch, tailA: .3 * Math.exp(-10 * g) };
  };
  // Pecks at the given times (the beak hits the ground at each).
  B.peck = (t, times) => { let best = { tilt: 0 }; for (const t0 of times) { const p = peckPose(t - t0); if (p.tilt || p.hit != null) best = p; } return best; };
  return B;
})();
