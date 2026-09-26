// lib/rooms/desk.js: a desk with a computer. A desk with drawers, a monitor whose screen glows and types painted,
// text-free code (or its back, for reverse shots), a keyboard whose keys dip, a steaming mug, a pencil cup, and a stool
// or office chair. Everything is sized from Clawd's unit u, so Clawd sits and stands at it at any size.
// Use: const d = DESK.layout({ x, floorY, u }) gives the anchors without drawing: topY (desk surface), seat (stool seat
//   top), sit (the clawd() ground point that rests Clawd's body on the seat, with noLegs), front (standing at the
//   keyboard, back to us), beside, behind (behind the desk, facing out), keys, mug, cup, screen {x, y, w, h}.
//   The desk is 4u high, so a seated Clawd's arms (and a standing Clawd's) sit just below the desk top.
//   DESK.set(t, o) paints the whole set for the "at work" staging (Clawd on the stool, back to us, the screen over its
//   head); paint Clawd after it. o = layout options + light 0..1, typing 0..1, code {...}, glow, mug/cup/stool: false.
//   Pieces: DESK.desk(t, d, o) (o.closed: true = panel down to the floor, hiding legs behind it); DESK.stool(t, x, floorY, u, o) (o.back: true = office chair); DESK.monitor(t, x, y, u, o)
//   (y = the desk top; o.back: true = seen from behind, its light spilling round it: paint Clawd first);
//   DESK.code(t, x, y, w, h, o) (any screen's contents: o.rate lines/s, o.t0, o.stop, o.seed, o.rows, o.start (lines already there),
//   o.status: { t, ok } flashes a pass/fail bar and mark); DESK.keyboard(t, x, y, u, o) (o.typing 0..1);
//   DESK.mug(t, x, y, u, o) (o.steam 0..1); DESK.cup(t, x, y, u, o); DESK.clip(pts, fn).
// Expects: core only (heartPts from clawd.js for the mug). The demo also loads lib/rooms/room.js for its backdrop.
//   World space: works under a camera (checked at zoom 1 and ~2).
// Source: made for the asset library, 2026-09-25, by painter-rooms (Claude).
const DESK = (() => {
  const C = {
    wood: '#C58B57', woodDk: '#8E5B37', woodLt: '#DDA874', brass: '#D6A94E', metal: '#4A4760', metalLt: '#8E8AA6',
    bezel: '#34304A', screen: '#1C2140', gutter: '#3A4170', light: '#A8D8FF', seat: '#4E6A8F', seatDk: '#34496A',
    keys: '#E6DFCF', keysDk: '#B7AC96', mug: '#E27A92', cup: '#3A9C98', ok: '#7ED69A', bad: '#EE6E6E', night: '#262A4C',
    code: ['#7FD1C7', '#F2A6B3', '#F6CD74', '#B7A6E8', '#E8E1D0', '#8EC3E6'],
  };
  const D = { C };
  const S = (c, L) => mixCol(c, C.night, (1 - clamp(L ?? 1)) * .6);
  const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  // p5's clip applies to p5.brush's paint and to glow(); flush first so nothing painted earlier gets clipped
  D.clip = (pts, fn) => {
    flushBrush(); push(); beginClip(); noStroke(); beginShape(); for (const [x, y] of pts) vertex(x, y); endShape(CLOSE); endClip();
    fn(); flushBrush(); pop();
  };
  const MON = { w: 11, h: 6.6, b: .5, neck: 3 };   // monitor screen size, bezel and neck, in u
  const screenOf = (x, y, u, neck = MON.neck) => { const by = y - (neck + .3) * u; return { x: x - MON.w * u / 2, y: by - (MON.b + MON.h) * u, w: MON.w * u, h: MON.h * u }; };

  D.layout = (o = {}) => {
    const u = o.u ?? 24, x = o.x ?? 960, fy = o.floorY ?? 860, w = (o.w ?? 22) * u, topY = fy - 4 * u;
    const stoolFloor = fy + 2.2 * u, seatY = stoolFloor - 3 * u;
    return { u, x, floorY: fy, w, topY, stoolFloor, seat: [x, seatY], sit: [x, seatY + 2 * u], front: [x, stoolFloor],
      beside: [x + w / 2 + 6.5 * u, fy + 1.5 * u], behind: [x + 4 * u, fy - .8 * u], keys: [x, topY],
      mug: [x + 7.5 * u, topY], cup: [x - 8.6 * u, topY], screen: screenOf(x, topY, u) };
  };

  D.desk = (t, d, o = {}) => {
    const { u, x, floorY: fy, w, topY } = d, L = o.light ?? 1, wood = S(o.col || C.wood, L), dk = S(C.woodDk, L), lt = S(mixCol(o.col || C.wood, C.woodLt, .6), L), th = .6 * u;
    boilSeed('desk shadow ' + x);
    paint(ellPts(x, fy + 3, w * .56, .5 * u, 22), { fill: PAL.ink, fillOp: 80, bleed: .2, tex: .3, ink: null });
    boilSeed('desk body ' + x);
    const pl = x - w / 2 + .4 * u, pw = 6.6 * u, bot = fy - topY - th;
    paint(rectPts(pl + pw, topY + th - 2, w - pw - 1.6 * u, o.closed ? bot : 1.6 * u, .5), { wash: mixCol(dk, PAL.ink, .2), ink: PAL.ink, sw: .8 });   // back of the kneehole (closed: to the floor)
    paint(rectPts(x + w / 2 - 1.3 * u, topY + th - 2, .9 * u, bot + 2, .5), { wash: wood, fill: dk, fillOp: 50, tex: .6, ink: PAL.ink, sw: 1 });
    paint(rectPts(pl, topY + th - 2, pw, bot + 2, .6), { wash: wood, fill: dk, fillOp: 50, tex: .6, ink: PAL.ink, sw: 1 });
    const dh = (bot - .4 * u) / 3;
    for (let i = 0; i < 3; i++) {
      boilSeed('desk drawer ' + x + ' ' + i);
      const dy = topY + th + .2 * u + i * dh;
      paint(rectPts(pl + .35 * u, dy + .1 * u, pw - .7 * u, dh - .2 * u, .4), { wash: lt, ink: PAL.ink, sw: .6, br: 'inkfine' });
      paint(rrPts(pl + pw / 2 - .7 * u, dy + dh * .42, 1.4 * u, .32 * u, .15 * u), { wash: S(C.brass, L), ink: PAL.ink, sw: .5 });
    }
    boilSeed('desk top ' + x);
    paint(rectPts(x - w / 2 - .3 * u, topY, w + .6 * u, th, .6), { wash: lt, fill: dk, fillOp: 40, tex: .6, ink: PAL.ink, sw: 1.1 });
  };

  D.stool = (t, x, fy, u, o = {}) => {
    const L = o.light ?? 1, col = S(o.col || C.seat, L), dk = S(C.seatDk, L), metal = S(C.metal, L), seatY = fy - (o.h ?? 3) * u;
    boilSeed('desk stool ' + x);
    paint(ellPts(x, fy + 2, 3 * u, .4 * u, 18), { fill: PAL.ink, fillOp: 80, bleed: .2, tex: .3, ink: null });
    if (o.back) {
      paint(rectPts(x - .25 * u, seatY - 1.3 * u, .5 * u, 1.5 * u, .3), { wash: metal, ink: PAL.ink, sw: .7 });
      paint(rrPts(x - 2.8 * u, seatY - 5.7 * u, 5.6 * u, 4.6 * u, .9 * u), { wash: col, fill: dk, fillOp: 60, tex: .6, ink: PAL.ink, sw: 1 });
    }
    paint(rectPts(x - .25 * u, seatY + .6 * u, .5 * u, fy - .7 * u - seatY - .6 * u, .3), { wash: S(C.metalLt, L), ink: PAL.ink, sw: .7 });
    paint(rectPts(x - 2.6 * u, fy - .8 * u, 5.2 * u, .35 * u, .3), { wash: metal, ink: PAL.ink, sw: .8 });
    for (const cx of [-2.4, 0, 2.4]) paint(ellPts(x + cx * u, fy - .25 * u, .27 * u, .25 * u, 10), { wash: mixCol(metal, PAL.ink, .3), ink: PAL.ink, sw: .6 });
    paint(rrPts(x - 3.2 * u, seatY, 6.4 * u, .8 * u, .35 * u), { wash: col, fill: dk, fillOp: 60, tex: .6, ink: PAL.ink, sw: 1 });
    return seatY;
  };

  // ---------- the screen's contents: painted code, no letters ----------
  // Lines of rounded token bars in syntax colours, indented in blocks; the current line types itself left to right,
  // the text scrolls up smoothly, a cursor leads (solid while typing, blinking on the beat once stopped).
  D.code = (t, x, y, w, h, o = {}) => {
    const rows = o.rows ?? 8, lh = h / (rows + .6), pad = .07 * w, rate = o.rate ?? 2.4, seed = o.seed ?? 1, t0 = o.t0 ?? 0;
    const tt = (o.start ?? rows) + Math.max(0, Math.min(t, o.stop ?? Infinity) - t0) * rate, n = Math.floor(tt), p = tt - n, typing = t < (o.stop ?? Infinity);
    const first = Math.max(0, n - (rows - 1)), scr = first > 0 ? lh * (1 - easeOut(clamp(p * 5))) : 0;
    const st = o.status, sa = st ? t - st.t : -1, good = st ? (st.ok ? C.ok : C.bad) : null, flashK = sa > 0 ? 1 - seg(sa, 0, .7) : 0;
    const tw = w - 1.35 * pad, gap = .025 * tw, bh = lh * .48;
    const line = i => {
      if (hash(i * 7.13 + seed) < .12) return null;
      const ind = Math.floor((Math.sin(i * .83 + seed * 2) + 1) * 1.7), k = 1 + Math.floor(hash(i * 5.71 + seed) * 3.6), segs = [];
      for (let j = 0; j < k; j++) segs.push([(.09 + .25 * hash(i * 11.3 + j * 2.7 + seed)) * tw, Math.floor(hash(i * 3.9 + j * 1.3 + seed) * C.code.length)]);
      return [ind * .07 * tw, segs];
    };
    let cur = null;
    for (let i = Math.max(0, first - 1); i <= n; i++) {
      const yy = y + lh * .6 + (i - first) * lh + scr, ln = line(i);
      boilSeed('code ' + seed + ' ' + i);
      paint(box(x + pad * .25, yy - bh * .18, pad * .42, bh * .36), { wash: C.gutter, ink: null });   // the line-number gutter
      let xx = x + pad + (ln ? ln[0] : 0);
      const tot = ln ? ln[1].reduce((s, [sw]) => s + sw + gap, 0) : 0, end = i < n ? Infinity : xx + p * tot;
      if (ln) for (const [sw0, ci] of ln[1]) {
        const sw = Math.min(sw0, x + w - pad * .35 - xx, end - xx); if (sw < 2) break;
        paint(rrPts(xx, yy - bh / 2, sw, bh, Math.min(bh * .45, sw / 2)), { wash: mixCol(C.code[ci], good || C.code[ci], .7 * flashK), ink: null });
        xx += sw + gap;
      }
      if (i === n) cur = [Math.min(end, xx, x + w - pad * .5), yy];
    }
    if (cur && (typing || frac(bpOf(t)) < .5)) paint(box(cur[0] + 2, cur[1] - bh * .7, bh * .55, bh * 1.4), { wash: PAL.cream, ink: null });
    if (sa > 0) {   // the verdict: a bar sweeps across the bottom and a big mark pops in the middle, then shrinks away
      boilSeed('code status ' + seed);
      paint(box(x - 2, y + h - lh * .75, (w + 4) * easeOut(clamp(sa / .3)), lh * .75 + 2), { wash: good, ink: null });
      const k = backOut(clamp((sa - .12) / .25)) * (1 - easeIn(seg(sa, 1.1, 1.35))), s = h * .28 * k;
      if (s > 2) {
        const cx = x + w / 2, cy = y + h * .45;
        if (st.ok) paint(ribbon([[cx - s, cy], [cx - s * .3, cy + s * .65], [cx + s * 1.05, cy - s * .75]], s * .32, s * .26), { wash: C.ok, ink: PAL.ink, sw: .8 });
        else for (const d of [-1, 1]) paint(ribbon([[cx - s * .8, cy - d * s * .8], [cx, cy], [cx + s * .8, cy + d * s * .8]], s * .3, s * .3), { wash: C.bad, ink: PAL.ink, sw: .8 });
      }
    }
  };

  D.monitor = (t, x, y, u, o = {}) => {
    const L = o.light ?? 1, sc = screenOf(x, y, u, o.neck), b = MON.b * u, by = sc.y + sc.h + b, ga = o.glow ?? lerp(.5, 1, 1 - L), metal = S(C.metal, L);
    boilSeed('desk monitor ' + x);
    if (o.back) glow(x, sc.y + sc.h / 2, sc.w * .95, C.light, ga);   // the screen's light, spilling round the back
    paint([[x - 2.1 * u, y], [x + 2.1 * u, y], [x + 1.4 * u, y - .4 * u], [x - 1.4 * u, y - .4 * u]], { wash: metal, ink: PAL.ink, sw: .9 });
    paint(rectPts(x - .45 * u, by - .5 * u, .9 * u, y - by + .2 * u, .3), { wash: S(C.metalLt, L), fill: metal, fillOp: 60, tex: .4, ink: PAL.ink, sw: .8 });
    const shell = rrPts(sc.x - b, sc.y - b, sc.w + 2 * b, sc.h + 2 * b, (o.back ? .8 : .45) * u);
    if (o.back) {
      paint(shell, { wash: S(C.metalLt, L), fill: metal, fillOp: 50, tex: .5, ink: PAL.ink, sw: 1.1 });
      paint(ellPts(x, sc.y + sc.h * .55, 1.7 * u, 1.7 * u, 18), { wash: S(mixCol(C.metalLt, C.metal, .35), L), ink: PAL.ink, sw: .6 });
      for (let i = 0; i < 4; i++) { const vx = x - 3 * u + i * 2 * u; inkLine([[vx, sc.y + .8 * u], [vx + .5 * u, sc.y + .8 * u], [vx + 1.2 * u, sc.y + .8 * u]], .6, PAL.ink, 'inkfine', 0); }
      return sc;
    }
    paint(shell, { wash: S(C.bezel, L), ink: PAL.ink, sw: 1.1 });
    D.clip(box(sc.x, sc.y, sc.w, sc.h), () => {
      paint(box(sc.x - 4, sc.y - 4, sc.w + 8, sc.h + 8), { wash: o.screenCol || C.screen, ink: null });
      if (o.content) o.content(sc.x, sc.y, sc.w, sc.h, t); else D.code(t, sc.x, sc.y, sc.w, sc.h, o.code || {});
    });
    boilSeed('desk monitor light ' + x);
    glow(x, sc.y + sc.h / 2, sc.w * .8, C.light, ga * .5);
    paint(rectPts(sc.x, sc.y, sc.w, sc.h, .3), { ink: PAL.ink, sw: .6 });
    paint(ellPts(sc.x + sc.w - .3 * u, by - b / 2, .12 * u, .12 * u, 8), { wash: C.ok, ink: null });
    return sc;
  };

  D.keyboard = (t, x, y, u, o = {}) => {
    const L = o.light ?? 1, kw = 8 * u, kh = .5 * u, typing = o.typing ?? 0, n = 9, e = Math.floor(bpOf(t) * 4);
    boilSeed('desk keyboard ' + x);
    paint([[x - kw / 2, y], [x + kw / 2, y], [x + kw / 2 - .3 * u, y - kh], [x - kw / 2 + .3 * u, y - kh]], { wash: S(C.keys, L), fill: S(C.keysDk, L), fillOp: 50, tex: .5, ink: PAL.ink, sw: .9 });
    for (let i = 0; i < n; i++) {   // key caps along the top; while typing, a few dip on every sixteenth note
      const down = typing > 0 && hash(e * 13.1 + i * 7.7) < .25 * typing, kx = x - kw / 2 + .7 * u + i * (kw - 1.4 * u) / (n - 1);
      paint(rectPts(kx - .32 * u, y - kh - .3 * u + (down ? .14 * u : 0), .64 * u, .32 * u, .3), { wash: S(down ? C.keysDk : mixCol(C.keys, '#FFFFFF', .35), L), ink: PAL.ink, sw: .5 });
    }
  };

  D.mug = (t, x, y, u, o = {}) => {
    const L = o.light ?? 1, col = S(o.col || C.mug, L), mw = 1.5 * u, mh = 1.7 * u, steam = o.steam ?? 1;
    boilSeed('desk mug ' + x);
    if (steam > 0) for (let k = 0; k < 3; k++) {   // wisps rise, curl and thin out (by width: a translucent wash would mix muddy)
      const ph = frac(t * .45 + k / 3), a = Math.sin(ph * Math.PI) * steam; if (a < .1) continue;
      const P = []; for (let j = 0; j < 6; j++) { const q = j / 5; P.push([x + (k - 1) * .35 * u + Math.sin(q * 5 + t * 2.2 + k * 2) * .35 * u * q, y - mh - .3 * u - (ph * 2.2 + q * 1.5) * u]); }
      paint(ribbon(P, .26 * u * a, .04 * u), { wash: S(PAL.cream, lerp(L, 1, .5)), ink: null });
    }
    paint(ribbon([[x + mw / 2 - .1 * u, y - mh * .8], [x + mw / 2 + .55 * u, y - mh * .62], [x + mw / 2 + .5 * u, y - mh * .3], [x + mw / 2 - .1 * u, y - mh * .2]], .28 * u, .28 * u), { wash: col, ink: PAL.ink, sw: .7 });
    paint(rrPts(x - mw / 2, y - mh, mw, mh, .3 * u), { wash: col, fill: S(mixCol(o.col || C.mug, PAL.ink, .3), L), fillOp: 50, tex: .5, ink: PAL.ink, sw: .9 });
    paint(heartPts(x, y - mh * .5, .38 * u), { wash: S(PAL.cream, L), ink: null });
  };

  D.cup = (t, x, y, u, o = {}) => {
    const L = o.light ?? 1, cw = 1.2 * u, ch = 1.6 * u;
    boilSeed('desk cup ' + x);
    [[-.28, '#E8AA38', 2.3], [.06, '#E27A92', 2.7], [.32, '#6E9F58', 2.1]].forEach(([a, col, len], k) => {
      push(); translate(x + (k - 1) * .3 * u, y - ch * .4); rotate(a);
      const pw = .24 * u, l = len * u;
      paint([[-pw, 0], [pw, 0], [pw, -l], [0, -l - .45 * u], [-pw, -l]], { wash: S(col, L), ink: PAL.ink, sw: .6 });
      paint([[-pw * .35, -l - .3 * u], [pw * .35, -l - .3 * u], [0, -l - .45 * u]], { wash: PAL.ink, ink: null });
      pop();
    });
    paint(rectPts(x - cw / 2, y - ch, cw, ch, .4), { wash: S(C.cup, L), fill: S(mixCol(C.cup, PAL.ink, .3), L), fillOp: 50, tex: .5, ink: PAL.ink, sw: .9 });
  };

  // the "at work" staging: desk, pencil cup, monitor with code, keyboard, mug, stool. Paint Clawd after it.
  D.set = (t, o = {}) => {
    const d = D.layout(o), L = o.light ?? 1, { u, x, topY } = d;
    D.desk(t, d, { light: L, col: o.deskCol });
    if (o.cup !== false) D.cup(t, d.cup[0], topY, u, { light: L });
    d.screen = D.monitor(t, x, topY, u, { light: L, code: o.code, glow: o.glow, content: o.content });
    D.keyboard(t, x, topY, u, { light: L, typing: o.typing ?? 0 });
    if (o.mug !== false) D.mug(t, d.mug[0], topY, u, { light: L, steam: o.steam });
    if (o.stool !== false) D.stool(t, x, d.stoolFloor, u, { light: L });
    return d;
  };
  return D;
})();
