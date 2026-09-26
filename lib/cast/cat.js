// lib/cast/cat.js: a tabby cat for Clawd's world. It sits, walks, stretches, crouches and pounces, and sleeps curled up; its
// face turns to the camera with Clawd's own eyes and mouths, and it acts with Clawd's emotions (ears and tail act too).
// Use: cat(x, y, u, o): (x, y) = the ground point under its middle; u = the same unit as clawd() (sitting, the cat is about
//   3/4 of Clawd's height; o.size scales it).
//   o.pose: sit | stand | stretch | crouch | leap | curl; o.pose2 + o.mix (0..1) blend two poses (cat.moves does it on a
//     timeline). Every pose idles on the beat: tail wave, ear flicks, breathing; crouch wiggles, curl sleeps.
//   pose (added to the idle): flip, dx, dy (u), sq, rot (screen, at the feet), pitch (at the body's centre), walk (leg
//     phase, e.g. from the kit's stroll(); stand pose), tailUp 0..1, tailAmp, tailPuff, earL / earR (+ perk, − flatten),
//     htilt (head tilt), noShadow, ground.
//   face: eyes, mouth (default the cat 'w'), squint, lookX / lookY, blush, emote / emoteK / emoteAge, tint / tintK.
//   colour: fur, furDk, furLt, chest, earIn, stripes (false = plain).  boil: boilKey (default: call order).
//   Acting: cat(x, y, u, { ...cat.act(t, keys), ...cat.moves(t, poseKeys) }); keys as for emotions() (ears, tail and tint
//   follow the mood). Moves: cat.moves(t, [[t0, 'sit'], [t1, 'stretch'], ...]), cat.pounce(t, t0, t1, p0, p1) (wiggle,
//   leap on an arc, land; gives x, y).
// Expects: core.js + clawd.js (eyes, mouth, blush, emote, emotions, EMO, TINT, EMOTE_TOP). World space; fine under a camera.
// Source: made for the asset library, 2026-09-25, by painter-cast (Claude Opus 5.5).
const cat = (() => {
  const K = .8;   // the cat's own unit, as a fraction of Clawd's u
  // Key poses, facing right, in cat units, y up negative. sp: spine rump → chest (3 points) and its widths; legs: near front,
  // far front, near hind, far hind as [top x, top y, foot x, foot y, width]; head: centre; ht: head tilt; tb: tail base;
  // td / tu: tail down / up, relative to its base; tf: the down tail is drawn in front of the body.
  const POSES = {
    sit:     { sp: [[-1.3, -1.45], [-.6, -2.7], [.3, -3.8]], w: [2.9, 2.3, 1.7], head: [.8, -4.85], ht: 0,
               legs: [[.6, -2.4, .8, 0, .62], [.25, -2.4, .4, 0, .56], [-.35, -.5, .2, -.22, .72], [-.6, -.5, -.15, -.22, .62]],
               tb: [-2.72, -.45], td: [[0, 0], [.15, .35], [1.5, .43], [3.3, .33], [4.0, -.05]], tu: [[0, 0], [-.45, -1.1], [-.4, -2.4], [.1, -3.0], [.5, -3.1]], tf: 1 },
    stand:   { sp: [[-1.7, -2.55], [-.2, -2.75], [1.2, -2.85]], w: [2.1, 1.9, 1.8], head: [2.3, -3.9], ht: 0,
               legs: [[1.25, -2.3, 1.35, 0, .55], [.9, -2.3, .95, 0, .5], [-1.45, -2.3, -1.4, 0, .62], [-1.85, -2.3, -1.85, 0, .56]],
               tb: [-2.65, -2.9], td: [[0, 0], [-.55, .55], [-.85, 1.35], [-.6, 2.0], [-.3, 2.2]], tu: [[0, 0], [-.45, -.95], [-.3, -1.95], [.25, -2.4], [.6, -2.3]], tf: 0 },
    stretch: { sp: [[-1.6, -3.1], [-.2, -2.15], [1.1, -1.3]], w: [2.0, 1.7, 1.55], head: [2.15, -1.85], ht: .12,
               legs: [[1.2, -.9, 2.9, -.12, .5], [.95, -.9, 2.55, -.12, .45], [-1.35, -2.6, -1.3, 0, .6], [-1.8, -2.6, -1.8, 0, .55]],
               tb: [-2.5, -3.6], td: [[0, 0], [-.5, -.6], [-.6, -1.5], [-.2, -2.2], [.2, -2.3]], tu: [[0, 0], [-.3, -.9], [-.1, -1.9], [.4, -2.4], [.8, -2.3]], tf: 0 },
    crouch:  { sp: [[-1.5, -1.4], [-.2, -1.3], [1.1, -1.3]], w: [2.1, 1.8, 1.65], head: [2.3, -2.2], ht: 0,
               legs: [[1.2, -.9, 1.75, -.02, .5], [.9, -.9, 1.4, -.02, .45], [-1.1, -.9, -.25, -.12, .66], [-1.4, -.9, -.55, -.12, .6]],
               tb: [-2.5, -1.4], td: [[0, 0], [-.8, .45], [-1.8, .75], [-2.6, .65], [-3.0, .4]], tu: [[0, 0], [-.7, -.5], [-1.4, -.7], [-2.0, -.4], [-2.3, -.1]], tf: 0 },
    leap:    { sp: [[-2.0, -2.4], [-.2, -2.7], [1.6, -2.9]], w: [1.8, 1.7, 1.55], head: [2.65, -3.55], ht: -.1,
               legs: [[1.6, -2.45, 3.1, -2.4, .5], [1.3, -2.45, 2.9, -2.0, .45], [-1.75, -2.2, -3.3, -1.3, .55], [-2.0, -2.2, -3.45, -1.7, .5]],
               tb: [-2.85, -2.6], td: [[0, 0], [-1, -.1], [-2, .05], [-2.8, .35], [-3.2, .5]], tu: [[0, 0], [-1, -.4], [-2, -.5], [-2.8, -.3], [-3.2, -.1]], tf: 0 },
    curl:    { sp: [[-1.3, -1.1], [-.1, -1.75], [1.0, -1.15]], w: [2.3, 2.35, 2.0], head: [1.75, -1.3], ht: .3,
               legs: [[1.3, -.5, 1.9, -.18, .45], [1.1, -.5, 1.6, -.18, .4], [-.8, -.6, -.2, -.2, .55], [-1.1, -.6, -.5, -.2, .5]],
               tb: [-2.35, -.55], td: [[0, 0], [.3, .45], [1.8, .6], [3.3, .45], [4.1, 0]], tu: [[0, 0], [.3, .45], [1.8, .6], [3.3, .45], [4.1, 0]], tf: 1 },
  };
  // head outline, head-local (cat units): bottom, right cheek, right side, right ear (outer base, tip, inner base), top,
  // left ear (inner base, tip, outer base), left side, left cheek
  const EAR = [[1.45, -.72], [1.2, -2.05], [.42, -1.08]], EARC = [.95, -.95];
  const DEF = { fur: '#9DA3B7', furDk: '#6C7188', furLt: '#CDD0DC', chest: '#F3EADC', earIn: '#E7A0A8' };
  // mood → ears (+ perk, − flatten) and tail (up 0..1, lash amplitude, puff); anything not listed is 0 / .5 / .25 / 0
  const MOOD = { happy: [.2, .9, .3], excited: [.7, 1, .5], laugh: [.1, .9, .4], love: [.1, 1, .2], proud: [.4, 1, .15], playful: [.3, .9, .5],
    starstruck: [.7, 1, .3], hopeful: [.4, .8, .2], relieved: [-.1, .6, .2], smug: [.1, .8, .15], cool: [.1, .7, .15],
    sad: [-.7, 0, .1], cry: [-.8, 0, .15], bored: [-.3, .2, .12], sleepy: [-.4, .2, .1], ko: [-.9, 0, 0],
    angry: [-.9, .35, .9], furious: [-1, .4, 1.2], determined: [.3, .6, .4], disgusted: [-.6, .3, .5],
    scared: [-.8, .9, .6, 1], nervous: [-.4, .4, .5], surprised: [1, .9, .3, .6], confused: [[-.4, .6], .5, .2], dizzy: [[-.5, .3], .3, .3],
    suspicious: [-.5, .4, .5], thinking: [[.3, -.1], .5, .2], idea: [.8, .9, .3], mischief: [-.3, .6, .6], shy: [-.5, .3, .15] };
  const moodOf = n => { const m = MOOD[n] || [0, .5, .25, 0], e = Array.isArray(m[0]) ? m[0] : [m[0], m[0]]; return { earL: e[0], earR: e[1], tailUp: m[1], tailAmp: m[2], tailPuff: m[3] || 0 }; };
  const rotP = (p, c, a) => { const s = Math.sin(a), k = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * k - y * s, c[1] + x * s + y * k]; };
  const mix = (a, b, k) => Array.isArray(a) ? a.map((v, i) => mix(v, b[i], k)) : typeof a === 'number' ? lerp(a, b, k) : (k < .5 ? a : b);
  function loop(C, n = 4) {   // closed Catmull-Rom
    const N = C.length, out = [];
    for (let i = 0; i < N; i++) {
      const p0 = C[(i + N - 1) % N], p1 = C[i], p2 = C[(i + 1) % N], p3 = C[(i + 2) % N];
      for (let k = 0; k < n; k++) { const s = k / n, s2 = s * s, s3 = s2 * s; out.push([0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * s + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * s2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * s3))); }
    }
    return out;
  }
  // a tube along a path, widths interpolated along it, both ends rounded: one closed outline (body, legs, tail)
  function tube(P, ws, n = 5) {
    const C = through(P, n), m = C.length, L = [], R = [], nrm = [];
    for (let i = 0; i < m; i++) {
      const a = C[Math.max(0, i - 1)], b = C[Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const f = i / (m - 1) * (ws.length - 1), j = Math.min(ws.length - 2, Math.floor(f)), w = lerp(ws[j], ws[j + 1], f - j) / 2;
      nrm.push([-dy / d, dx / d]); L.push([C[i][0] - dy / d * w, C[i][1] + dx / d * w]); R.push([C[i][0] + dy / d * w, C[i][1] - dx / d * w]);
    }
    const cap = (c, nv, r, from) => { const a0 = Math.atan2(nv[1], nv[0]) + from, out = []; for (let k = 1; k < 6; k++) { const a = a0 - k / 6 * Math.PI; out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); } return out; };
    const w0 = ws[0] / 2, w1 = ws[ws.length - 1] / 2;
    return { pts: L.concat(cap(C[m - 1], nrm[m - 1], w1, 0), R.slice().reverse(), cap(C[0], nrm[0], w0, Math.PI)), C, nrm, L, R };
  }
  // the last event on a beat grid (step in beats; each slot fires with probability rate, seeded)
  function lastEv(t, step, seed, rate, salt = 0) {
    const j = Math.floor(bpOf(t) / step); let i = j;
    while (i > j - 32 && hash(i * 1.93 + seed * 11.7 + salt * 5.31) >= rate) i--;
    return OFF + i * step * BEAT;
  }
  const tinted = (c, tint, k) => { const tc = tint && (TINT[tint] || tint); return tc && k > 0 ? mixCol(c, tc, .45 * clamp(k)) : c; };
  const ADD = ['sq', 'dy', 'dx', 'rot', 'pitch', 'htilt', 'earL', 'earR', 'tailAmp', 'lookX', 'lookY'];

  function C(x, y, u, o = {}) {
    const id = o.boilKey ?? ('cat' + (++CLAWD_N)), rs = part => boilSeed(`cat ${id} ${part}`);
    const time = o.time ?? T, seed = o.seed || 0, c = u * K * (o.size ?? 1), sw = clamp(u / 15, .45, 2.4), J = c * .03;
    const pa = POSES[o.pose] || POSES.sit, pb = POSES[o.pose2] || pa, P = mix(pa, pb, clamp(o.mix ?? 0));
    const curl = (o.pose === 'curl' ? 1 - clamp(o.mix ?? 0) : 0) + (o.pose2 === 'curl' ? clamp(o.mix ?? 0) : 0);
    const crouch = (o.pose === 'crouch' ? 1 - clamp(o.mix ?? 0) : 0) + (o.pose2 === 'crouch' ? clamp(o.mix ?? 0) : 0);
    // idle, on the beat: tail wave, a flick of one ear now and then, breathing, a slow head tilt; crouch wiggles its rear
    const bp = bpOf(time), fl = time - lastEv(time, 1, seed, .35, 1), flickSide = hash(Math.round(bpOf(time - fl)) * 3.7 + seed) < .5;
    const flick = -1.1 * Math.exp(-14 * fl) * Math.max(0, Math.cos(fl * 18)) * (1 - curl);
    const idle = { sq: (.02 + .03 * curl) * Math.sin((time + seed) * TAU * (curl ? .25 : .5)), htilt: .06 * Math.sin(bp * Math.PI / 4 + seed),
                   earL: flickSide ? flick : 0, earR: flickSide ? 0 : flick, dx: crouch * .12 * Math.sin(bp * TAU * 2) };
    const q = { ...o };
    for (const k of ADD) q[k] = (idle[k] || 0) + (o[k] || 0);
    // Clawd's arm raise (aL, aR from feel/emotions) lifts or droops the ears
    q.earL += ((o.aL ?? .2) - .2) * .45; q.earR += ((o.aR ?? .2) - .2) * .45;
    const fs = q.flip ? -1 : 1, sq = q.sq, sx = q.sx ?? 1, X = x + q.dx * u, Y = y + (q.dy || 0) * u;
    const tintAll = cc => { const a = tinted(cc, q.tint, q.tintK ?? 1); if (!q.tintPrev) return a; return mixCol(tinted(cc, q.tintPrev[0], q.tintPrev[1]), a, q.tintMix ?? 1); };
    const F = { fur: tintAll(q.fur || DEF.fur), dk: tintAll(q.furDk || DEF.furDk), lt: q.furLt || DEF.furLt, chest: q.chest || DEF.chest, earIn: q.earIn || DEF.earIn };
    const far = mixCol(F.fur, F.dk, .55);
    const pc = [-.2, -2.4], pitch = q.pitch;   // pitch pivot: the body's middle
    const toW = p => { let [a, b] = rotP(p, pc, pitch); a *= c * fs * (1 + sq * .6) * sx; b *= c * (1 - sq); const r = q.rot || 0; return [X + a * Math.cos(r) - b * Math.sin(r), Y + a * Math.sin(r) + b * Math.cos(r)]; };

    rs('shadow');
    if (!o.noShadow) {
      const gy = o.ground ?? y, h = Math.max(0, gy - Y), f = 1 - clamp(h / (10 * u)) * .6;
      if (h < 10 * u) paint(ellPts(X, gy + .12 * u, 2.9 * c * f * sx, .5 * c * f, 20), { fill: PAL.ink, fillOp: 85 * f, bleed: .25, tex: .3, border: .1, ink: null });
    }
    push(); translate(X, Y); if (q.rot) rotate(q.rot); scale(fs * (1 + sq * .6) * sx, 1 - sq);
    push(); translate(pc[0] * c, pc[1] * c); rotate(pitch); translate(-pc[0] * c, -pc[1] * c);
    const S = pts => pts.map(([a, b]) => [a * c, b * c]);
    // tail: a wave travels from the base to the tip (follow-through); up with a good mood, lashing when angry, puffed in fear
    const tailUp = clamp(q.tailUp ?? .5), amp = q.tailAmp || .25, puff = 1 + .8 * clamp(q.tailPuff || 0);
    let TP = mix(P.td, P.tu, tailUp).map(p => [p[0], p[1]]);
    const ph = bp * Math.PI * (1 + 2 * clamp(amp - .4)) + seed;
    for (let i = 1; i < TP.length; i++) { const a = amp * (curl ? .25 : 1) * Math.sin(ph - i * .9) * (.4 + .25 * i); for (let j = i; j < TP.length; j++) TP[j] = rotP(TP[j], TP[i - 1], a * .35); }
    const TT = tube(S(TP.map(p => [p[0] + P.tb[0], p[1] + P.tb[1]])), [.62, .56, .48, .36, .3].map(v => v * c * puff), 4);
    const tail = () => {
      rs('tail'); const tp = TT.pts.map(([a, b]) => [a + jit(J), b + jit(J)]);
      paint(tp, { wash: F.fur, ink: null });
      if (q.stripes !== false) for (const f of [.35, .6, .82]) { const i = Math.round(f * (TT.L.length - 1)), a = TT.L[i], b = TT.R[i]; paint(ribbon([a, [lerp(a[0], b[0], .5), lerp(a[1], b[1], .5)], b], .26 * c, .22 * c), { wash: F.dk, ink: null }); }
      paint(tp, { ink: PAL.ink, sw: sw * .7 });
    };
    const tailFront = tailUp < .5 && P.tf;
    if (!tailFront) tail();
    // legs: rounded columns; in the stand pose `walk` swings them in diagonal pairs, each foot lifting as it swings forward
    const standK = (o.pose === 'stand' ? 1 - clamp(o.mix ?? 0) : 0) + (o.pose2 === 'stand' ? clamp(o.mix ?? 0) : 0);
    const leg = i => {
      rs('leg' + i);
      const [tx, ty, fx, fy, w] = P.legs[i];
      let ex = fx, ey = fy;
      if (o.walk != null && standK > 0) { const ph2 = (o.walk + [0, .5, .5, 0][i]) * TAU; ex += Math.sin(ph2) * .55 * standK; ey -= Math.max(0, Math.cos(ph2)) * .45 * standK; }
      const shape = tube(S([[tx, ty], [lerp(tx, ex, .5), lerp(ty, ey, .5)], [ex, ey]]), [w * c, w * .95 * c, w * 1.12 * c], 2).pts;
      paint(shape, { wash: i % 2 ? far : F.fur, ink: PAL.ink, sw: sw * .7 });
    };
    leg(3); leg(1);
    // body: one tube; highlight on the back, a pale chest, tabby stripes across the back
    rs('body');
    const B = tube(S(P.sp), P.w.map(v => v * c), 5), bpts = B.pts.map(([a, b]) => [a + jit(J), b + jit(J)]);
    paint(bpts, { wash: F.fur, ink: null });
    const mid = B.C[Math.floor(B.C.length / 2)], nm = B.nrm[Math.floor(B.C.length / 2)];
    paint(ellPts(mid[0] - nm[0] * .3 * P.w[1] * c, mid[1] - nm[1] * .3 * P.w[1] * c, .6 * P.w[1] * c, .28 * P.w[1] * c, 14, 0, Math.atan2(nm[0], -nm[1])), { fill: F.lt, fillOp: 100, bleed: .2, tex: .85, border: .8, ink: null });
    const ce = B.C[B.C.length - 1], cn = B.nrm[B.nrm.length - 1], cw = P.w[2] * c;
    paint(ellPts(ce[0] + cn[0] * .22 * cw, ce[1] + cn[1] * .22 * cw, .34 * cw, .42 * cw, 14, J, Math.atan2(cn[1], cn[0])), { wash: F.chest, ink: null });
    if (q.stripes !== false) for (const f of [.2, .38, .56]) {
      const i = Math.round(f * (B.C.length - 1)), p = B.C[i], nv = B.nrm[i], w = lerp(P.w[0], P.w[2], f) * c / 2;
      paint(ribbon([[p[0] - nv[0] * w * .98, p[1] - nv[1] * w * .98], [p[0] - nv[0] * w * .7, p[1] - nv[1] * w * .7], [p[0] - nv[0] * w * .4, p[1] - nv[1] * w * .4]], .3 * c, .05 * c), { wash: F.dk, ink: null });
    }
    paint(bpts, { ink: PAL.ink, sw: sw * .8 });
    leg(2); leg(0);
    if (tailFront) tail();
    // head, facing the camera; the face shifts a little toward the heading
    rs('head');
    const hx = P.head[0], hy = P.head[1], ht = P.ht + q.htilt, fx = .18;
    push(); translate(hx * c, hy * c); rotate(ht);
    const ear = (sgn, e) => {   // one ear's three points (right ear for sgn 1): perks up, or flattens out sideways
      return EAR.map((p, i) => { let r = [p[0], p[1]]; if (i === 1) { r = e > 0 ? [lerp(p[0], .95, .1 * e), p[1] - .45 * e] : rotP(p, EARC, -e * 1.25); } return [r[0] * sgn, r[1]]; });
    };
    const eR = ear(1, clamp(q.earR, -1, 1)), eL = ear(-1, clamp(q.earL, -1, 1));
    const HO = [[0, 1.12], [1.3, .78], [1.62, -.05], eR[0], eR[1], eR[2], [0, -1.12], eL[2], eL[1], eL[0], [-1.62, -.05], [-1.3, .78]];
    const hpts = loop(S(HO)).map(([a, b]) => [a + jit(J), b + jit(J)]);
    paint(hpts, { wash: F.fur, ink: null });
    for (const [e, s] of [[eR, 1], [eL, -1]]) paint(S([[lerp(e[0][0], e[2][0], .22), lerp(e[0][1], e[2][1], .22) - .05], [lerp(e[1][0], s * .95, .22), lerp(e[1][1], -.95, .22)], [lerp(e[2][0], e[0][0], .22), lerp(e[2][1], e[0][1], .22) - .05]]), { wash: F.earIn, ink: null });
    paint(ellPts(fx * c, .52 * c, .78 * c, .44 * c, 16, J), { wash: F.chest, ink: null });
    if (q.stripes !== false) for (const sx2 of [-.38, 0, .38]) paint(ribbon(S([[sx2, -1.08], [sx2 * 1.1, -.85], [sx2 * 1.15, -.62]]), .26 * c, .05 * c), { wash: F.dk, ink: null });
    paint(hpts, { ink: PAL.ink, sw: sw * .8 });
    // features: Clawd's eyes, mouth and blush, drawn at the cat's scale (drawn big and scaled down when the catch-light shows)
    const ue = .3 * c, zs = CAM ? CAM.zoom : 1, U = ue * zs > 9 ? Math.max(ue, 9.5) : ue, k = ue / U;
    const face = f => { push(); translate(fx * c, -.1 * c); scale(k); translate(0, 6 * U); f(); pop(); };
    if (q.blush) { rs('blush'); face(() => blush(U, sw / k, { sides: [-1, 1], bx: 3.4 }, q.blush === true ? 1 : q.blush)); }
    rs('eyes'); face(() => eyes(U, { ...q, lookX: clamp(q.lookX, -1, 1), lookY: clamp(q.lookY, -1, 1) }, sw * .85 / k, [-1, 1], 0));
    rs('nose'); paint(S([[fx - .15, .16], [fx + .15, .16], [fx, .32]]), { wash: F.earIn, ink: PAL.ink, sw: sw * .4 });
    rs('mouth'); face(() => mouth(U, q.mouth || 'cat', sw * .85 / k));
    rs('whiskers');
    const wd = clamp((q.earL + q.earR) / 2, -1, 1) * .12;
    for (const s of [-1, 1]) for (const [y0, y1] of [[.36, .2 - wd], [.46, .58 - wd]]) inkLine(S([[fx + s * .62, y0], [fx + s * 1.3, (y0 + y1) / 2 - .02], [fx + s * 2.0, y1]]), sw * .4, mixCol(PAL.ink, F.fur, .25), 'inkfine', .5);
    pop();
    pop(); pop();
    rs('emote');
    if (q.emote) {
      const top = EMOTE_TOP.includes(q.emote), [ex, ey] = toW(rotP([hx + (top ? 0 : 1.9), hy + (top ? -3.3 : -2.2)], [hx, hy], ht));
      emote(q.emote, ex, ey, u * .6, q.emoteK ?? 1, q.emoteAge ?? time);
    }
    rs('after');
  }

  // Clawd's emotions() for a cat: same keys and acting; ears and tail follow the mood and the tint cross-fades. The body
  // motion runs o.phase s (default half a beat) off Clawd's so they don't bounce in unison, at o.bodyK (default .5).
  C.act = (t, keys, o = {}) => {
    const r = emotions(t, keys, o); let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
    const ph = o.phase ?? BEAT / 2, bk = o.bodyK ?? .5, age = t - keys[i][0], blend = i > 0 && age < .5, k = backOut(seg(age, 0, .4)), kc = ease(seg(age, 0, .3));
    const bodyD = (j, f) => { const E = EMO[keys[j][1]] || EMO.neutral; if (!E.body || (keys[j][2] && f in keys[j][2])) return 0; return (E.body(t + ph)[f] ?? 0) - (E.body(t)[f] ?? 0); };
    for (const f of ['dy', 'dx', 'rot', 'sq', 'aL', 'aR']) r[f] = (r[f] ?? (f[0] === 'a' ? .2 : 0)) + (blend ? lerp(bodyD(i - 1, f), bodyD(i, f), k) : bodyD(i, f));
    r.dy *= bk; r.dx *= bk;
    const tintOf = j => { const E = EMO[keys[j][1]] || EMO.neutral, ov = keys[j][2] || {}; return [ov.tint ?? E.tint, ov.tintK ?? E.tintK ?? 1]; };
    const M = moodOf(keys[i][1]), Mp = i > 0 ? moodOf(keys[i - 1][1]) : M;
    for (const f in M) r[f] = (keys[i][2] && f in keys[i][2]) ? keys[i][2][f] : blend ? lerp(Mp[f], M[f], f.startsWith('ear') ? k : kc) : M[f];
    delete r.col; delete r.dk; delete r.lt;
    const [tint, tintK] = tintOf(i);
    return { ...r, tint, tintK, tintPrev: i > 0 ? tintOf(i - 1) : null, tintMix: i > 0 ? kc : 1 };
  };
  // A pose timeline: keys = [[t0, 'sit'], [t1, 'stretch'], ...]. Each change takes `dur` s (default .35) from its key time,
  // with a small squash just before (anticipation) and a settle after. Spread it into cat().
  C.moves = (t, keys, o = {}) => {
    const dur = o.dur ?? .35; let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
    const tc = keys[i][0], age = t - tc, tn = i + 1 < keys.length ? keys[i + 1][0] : Infinity;
    const pre = isFinite(tn) ? .07 * ease(seg(t, tn - .12, tn)) : 0, settle = i > 0 ? .08 * spring(t, tc + dur, 7, 16) : 0;
    if (i > 0 && age < dur) return { pose: keys[i - 1][1], pose2: keys[i][1], mix: ease(age / dur), sq: pre + settle };
    return { pose: keys[i][1], sq: pre + settle };
  };
  // A pounce from p0 to p1 ([x, y] ground points): it drops into a crouch `wig` s (default 1) before t0 and wiggles its
  // rear on the eighths, springs at t0 (stretched out on an arc h px high), lands at t1 into a crouch and sits back up.
  C.pounce = (t, t0, t1, p0, p1, o = {}) => {
    const wig = o.wig ?? 1, h = o.h ?? Math.abs(p1[0] - p0[0]) * .35 + 30, flip = p1[0] < p0[0];
    if (t < t0 - wig) return { x: p0[0], y: p0[1], flip, pose: 'sit' };
    if (t < t0) {
      const a = t - (t0 - wig), k = ease(seg(a, 0, .3)), coil = ease(seg(t, t0 - .15, t0));
      return { x: p0[0], y: p0[1], flip, pose: 'sit', pose2: 'crouch', mix: k, sq: .12 * coil, tailAmp: .5, earL: .5, earR: .5, lookX: .6, dx: -.25 * coil };
    }
    if (t < t1) {
      const k = seg(t, t0, t1), [px, py] = arcPt(p0, p1, h, k), [qx, qy] = arcPt(p0, p1, h, Math.min(1, k + .03));
      const pitch = clamp(Math.atan2(qy - py, Math.abs(qx - px) + 1e-3) * .7, -.5, .6), m = ease(seg(k, 0, .15)) * (1 - ease(seg(k, .75, 1)));
      return { x: px, y: py, flip, pose: 'crouch', pose2: 'leap', mix: m, pitch, sq: -.12 * m, earL: .6, earR: .6, lookX: .8, noShadow: o.ground == null, ground: o.ground };
    }
    const a = t - t1, back = ease(seg(a, .35, .8));
    return { x: p1[0], y: p1[1], flip, pose: 'crouch', pose2: 'sit', mix: back, sq: .22 * Math.exp(-9 * a) * Math.cos(16 * a) };
  };
  return C;
})();
