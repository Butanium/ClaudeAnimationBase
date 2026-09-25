// lib/rooms/room.js: a room kit. Back wall with wainscot, wood floor, a window onto any sky, a door that swings open,
// a picture frame, a clock, a shelf of books, a floor lamp, a potted plant and a rug.
// Use: ROOM.room(t, o) paints a whole room and returns its anchors ({ floorY, standY, light, window, door, shelf, lamp });
//   o.window / o.door / o.frame / o.clock / o.shelf / o.lamp / o.plant / o.rug are each piece's options (false = leave it
//   out). Or paint the pieces yourself, in this order: wall, floor, window, door, frame, clock, shelf, rug, lamp, plant.
//   Shared options: light 0..1 (1 = day, 0 = night: every colour darkens toward night blue), tod 0..1 (time of day for
//   the window's sky: 0 = midnight, .25 = dawn, .5 = noon, .75 = dusk; ROOM.lightOf(tod) gives the matching light).
//   window: { x, y, w, h (the glass), tod, sky: fn(x, y, w, h, t) instead of the built-in sky, view: 'roofs'|'hills'|null,
//             curtains: open 0..1 (null = none), wind 0..1 }
//   door: { x, floorY, w, h, open 0..1 (ROOM.swing), hinge: 'left'|'right', lit 0..1 (light beyond), beyond: fn }
//   frame: { x, y (nail), w, h, pic: 'hills'|'clawd'|fn, nudge: time of a knock (it swings) }; clock: { x, y, r, time
//   (hours shown at t = 0), rate (clock seconds per film second) }, its second hand ticks on the beat; shelf: { x, y, w,
//   seed }; lamp: { x, y, h, on 0..1 (ROOM.flick) }; plant: { x, y, s, seed }; rug: { x, y, w, h }.
//   ROOM.clip(pts, fn): paint fn() only inside a polygon (world space; p5 beginClip). Don't nest clips.
// Expects: core only. World space: works under a camera (checked at zoom 1 and 2). Colours in ROOM.C.
// Source: made for the asset library, 2026-09-25, by painter-rooms (Claude).
const ROOM = (() => {
  const C = {
    wall: '#A9C5B4', wallDk: '#86A596', wains: '#6E948B', wainsDk: '#4F7770', trim: '#F0E4CA',
    floor: '#C29F78', floorDk: '#946F50', wood: '#A8744E', woodDk: '#7A5035', brass: '#D6A94E', brassDk: '#A57A2E',
    door: '#5F7FA8', curtain: '#E2AE55', curtainDk: '#B0823A', shade: '#F3D9A4', pot: '#C97A58', leaf: '#6E9F58',
    leafLt: '#8DB86A', leafDk: '#46703E', rug: ['#B85A55', '#E8C27A', '#5E7FA0'], night: '#262A4C',
    books: ['#B85A55', '#5E7FA0', '#E0B45A', '#6E9F58', '#7B5CA8', '#E8DCC0', '#3F5E86', '#C9764F'],
  };
  const R = { C };
  const S = (c, L) => mixCol(c, C.night, (1 - clamp(L ?? 1)) * .6);   // a colour at a light level

  // p5's clip applies to p5.brush's washes, fills and strokes and to glow(); flush before so nothing earlier is clipped
  R.clip = (pts, fn) => {
    flushBrush(); push(); beginClip(); noStroke(); beginShape(); for (const [x, y] of pts) vertex(x, y); endShape(CLOSE); endClip();
    fn(); flushBrush(); pop();
  };
  const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  // long straight edges as inkLines no longer than ~800 px (LESSONS: huge strokes lose their outline under zoom)
  const hline = (x0, x1, y, sw, col = PAL.ink, br = 'ink') => {
    const n = Math.max(1, Math.ceil((x1 - x0) / 800));
    for (let i = 0; i < n; i++) { const a = lerp(x0, x1, i / n) - (i ? 4 : 0), b = lerp(x0, x1, (i + 1) / n); inkLine([[a, y + jit(1)], [(a + b) / 2, y + jit(1.2)], [b, y + jit(1)]], sw, col, br, .5); }
  };
  const vline = (x, y0, y1, sw, col = PAL.ink, br = 'ink') => inkLine([[x + jit(1), y0], [x + jit(1.2), (y0 + y1) / 2], [x + jit(1), y1]], sw, col, br, .5);

  // ---------- time of day, switches, swings ----------
  const dayness = tod => clamp((Math.cos((frac(tod) - .5) * TAU) + .3) / .9);
  R.lightOf = tod => lerp(.3, 1, dayness(tod));
  // a lamp switched on at t0 (with a flicker) and off at t1: 0..1
  R.flick = (t, t0, t1 = Infinity) => {
    if (t < t0) return 0;
    const P = [1, 0, 0, 1, .25, 1], a = t - t0;
    return (a < .3 ? P[Math.min(P.length - 1, Math.floor(a / .05))] : 1) * (t > t1 ? 1 - seg(t, t1, t1 + .08) : 1);
  };
  // a door flung open at t0: it cracks open, hesitates, swings (accelerating), hits its stop and bounces back a little
  R.swing = (t, t0, dur = .55, from = 0, to = 1) => {
    if (t < t0) return from;
    const a = t - t0, v = a < .22 ? .1 * easeOut(a / .12) : a < dur ? lerp(.1, 1, easeIn(seg(a, .22, dur))) : 1 - .14 * Math.abs(spring(t, t0 + dur, 6, 22));
    return lerp(from, to, v);
  };

  // ---------- wall and floor ----------
  const span = o => ({ L: o.light ?? 1, x0: o.x0 ?? -400, x1: o.x1 ?? W + 400, fy: o.floorY ?? 800 });
  R.wall = (t, o = {}) => {
    const { L, x0, x1, fy } = span(o), top = o.top ?? -300, dado = o.dado ?? 250, col = o.col || C.wall, wcol = o.wains || C.wains;
    boilSeed('room wall');
    paint(box(x0, top, x1 - x0, fy - top), { wash: S(col, L), ink: null });
    for (let i = 0; i < 7; i++) {   // watercolour blotches, so the wall isn't a flat digital colour
      const bx = lerp(x0, x1, (i + .5) / 7) + (hash(i + 3) - .5) * 220, by = lerp(top + 300, fy - dado, .15 + .7 * hash(i + 9));
      paint(ellPts(bx, by, 230 + 120 * hash(i + 5), 160 + 90 * hash(i + 7), 20), { fill: S(i % 2 ? C.wallDk : mixCol(col, C.trim, .5), L), fillOp: 45, bleed: .12, tex: .6, border: .3, ink: null });
    }
    if (dado > 0) {
      const dy = fy - dado, pw = o.panel ?? 200;
      boilSeed('room wainscot');
      paint(box(x0, dy, x1 - x0, dado), { wash: S(wcol, L), ink: null });
      for (let x = x0 + 24, i = 0; x + pw - 24 < x1; x += pw, i++) {
        boilSeed('room panel ' + i);
        paint(rectPts(x, dy + 40, pw - 48, dado - 104, 1), { wash: S(mixCol(wcol, C.trim, .1), L), ink: S(C.wainsDk, L), sw: .7, br: 'inkfine' });
      }
      boilSeed('room dado');
      paint(box(x0, dy - 16, x1 - x0, 18), { wash: S(C.trim, L), ink: null });
      hline(x0, x1, dy - 16, .8); hline(x0, x1, dy + 2, .6);
    }
    boilSeed('room skirting');
    paint(box(x0, fy - 36, x1 - x0, 37), { wash: S(C.trim, L), ink: null });
    hline(x0, x1, fy - 36, .8);
  };
  R.floor = (t, o = {}) => {
    const { L, x0, x1, fy } = span(o), bottom = o.bottom ?? H + 300, col = o.col || C.floor, dk = S(C.floorDk, L), ph = o.plank ?? 58;
    boilSeed('room floor');
    paint(box(x0, fy, x1 - x0, bottom - fy), { wash: S(col, L), ink: null });
    for (let i = 0; i < 6; i++) paint(ellPts(lerp(x0, x1, (i + .5) / 6) + (hash(i + 40) - .5) * 200, lerp(fy + 60, bottom - 200, hash(i + 41)), 300, 50, 18), { fill: S(i % 2 ? C.floorDk : mixCol(col, C.trim, .5), L), fillOp: 40, bleed: .1, tex: .6, ink: null });
    for (let i = 0; i < 5; i++) paint(ellPts(lerp(x0, x1, (i + .5) / 5), fy + 8, (x1 - x0) / 8, 24, 20), { fill: dk, fillOp: 80, bleed: .06, tex: .4, ink: null });   // shade along the wall
    for (let y = fy + ph, row = 0; y < bottom; y += ph, row++) {
      boilSeed('room plank ' + row);
      hline(x0, x1, y, .6, dk, 'inkfine');
      for (let k = 0; k < 6; k++) { const jx = lerp(x0, x1, (k + hash(row * 7 + k)) / 6); inkLine([[jx, y - ph + 4], [jx + 1, y - ph / 2], [jx, y - 4]], .55, dk, 'inkfine', 0); }
    }
    boilSeed('room floorline');
    hline(x0, x1, fy, 1);
  };

  // ---------- the window and its sky ----------
  // tod keys: [tod, top colour, horizon colour, cloud colour]
  const SKY = [[0, '#1B2150', '#35407C', '#3A4272'], [.2, '#26306A', '#5A4E8E', '#4A4A7C'], [.28, '#8A86C0', '#F2B09A', '#F6D2C0'],
    [.38, '#8FC1E4', '#E4EEE6', '#FBF4E6'], [.62, '#8FC1E4', '#E4EEE6', '#FBF4E6'], [.72, '#7672AE', '#F2A774', '#F6C7A0'],
    [.8, '#34397A', '#C06F80', '#7D5B86'], [.88, '#1B2150', '#35407C', '#3A4272'], [1, '#1B2150', '#35407C', '#3A4272']];
  const skyAt = tod => {
    tod = frac(tod); let i = 0; while (i < SKY.length - 2 && tod > SKY[i + 1][0]) i++;
    const [a, ...ca] = SKY[i], [b, ...cb] = SKY[i + 1], k = ease((tod - a) / (b - a));
    return ca.map((c, j) => mixCol(c, cb[j], k));
  };
  R.skyAt = skyAt;
  const cloudPts = (cx, cy, w, h, sd) => {
    const P = []; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, up = Math.sin(a) < 0, b = up ? 1 + .35 * Math.pow(Math.abs(Math.sin(a * 3 + sd)), .6) : 1; P.push([cx + Math.cos(a) * w / 2, cy + Math.sin(a) * (up ? h * .55 * b : h * .28)]); }
    return P;
  };
  // the built-in sky, painted into (x, y, w, h); R.window clips it to the glass
  R.sky = (t, x, y, w, h, o = {}) => {
    const tod = o.tod ?? .5, [top, low, cloud] = skyAt(tod), day = dayness(tod), night = 1 - day, m = Math.min(w, h);
    boilSeed('room sky ' + x);
    paint(box(x - 20, y - 20, w + 40, h + 40), { wash: top, ink: null });
    paint(ellPts(x + w / 2, y + h * 1.05, w * .95, h * .62, 24), { fill: low, fillOp: 190, bleed: .25, tex: .5, ink: null });
    if (night > .08) for (let i = 0; i < 16; i++) {
      boilSeed('room star ' + i);
      const tw = .55 + .45 * Math.sin(t * (2 + 2 * hash(i + 300)) + i * 1.7);
      paint(starPts(x + hash(i * 3.1 + 1) * w, y + hash(i * 5.7 + 2) * h * .6, (2.5 + 3 * hash(i + 200)) * tw * m / 360, .35, 4), { wash: PAL.cream, washOp: Math.min(255, (150 + 100 * tw) * night), ink: null });
    }
    const fT = frac(tod);
    if (fT > .23 && fT < .77) {   // the sun on its arc
      const p = (fT - .23) / .54, sx = x + w * (.12 + .76 * p), sy = y + h * (1.04 - .8 * Math.sin(Math.PI * p)), r = m * .08;
      boilSeed('room sun');
      glow(sx, sy, r * 4.5, '#FFD9A0', .6 + .4 * (1 - Math.sin(Math.PI * p)));
      paint(ellPts(sx, sy, r, r, 18), { wash: mixCol('#FFB36E', '#FFF0C4', Math.sin(Math.PI * p)), ink: PAL.ink, sw: .6 });
    }
    if (night > .3) {   // a crescent moon: a cream disc, bitten by a disc of sky
      const mx = x + w * .72, my = y + h * .24, r = m * .075, k = clamp((night - .3) / .4);
      boilSeed('room moon');
      glow(mx, my, r * 3.5, '#E6E2FF', .45 * k);
      paint(ellPts(mx, my, r, r, 18), { wash: mixCol(top, '#FFF3DA', k), ink: null });
      paint(ellPts(mx + r * .45, my - r * .3, r * .85, r * .85, 18), { wash: top, ink: null });
    }
    for (let k = 0; k < 2; k++) {   // two clouds drifting across
      boilSeed('room cloud ' + k);
      const cw = w * (.42 + .15 * hash(k + 60)), cx = x - cw / 2 + frac(t * .018 * (1 + hash(k + 61)) + hash(k + 62)) * (w + cw), cy = y + h * (.2 + .22 * k + .1 * hash(k + 63));
      paint(cloudPts(cx, cy, cw, cw * .32, k * 2), { wash: cloud, ink: PAL.ink, sw: .55, curv: .3 });
    }
    if (o.view === 'roofs' || o.view === 'hills') {
      const far = mixCol(mixCol('#7E8CA3', '#232849', night), top, .25);
      if (o.view === 'hills') {
        boilSeed('room hills');
        paint(ellPts(x + w * .25, y + h * 1.12, w * .6, h * .3, 24), { wash: mixCol(far, low, .35), ink: null });
        paint(ellPts(x + w * .8, y + h * 1.18, w * .55, h * .32, 24), { wash: far, ink: PAL.ink, sw: .5 });
      } else for (let i = 0; i < 5; i++) {
        boilSeed('room roof ' + i);
        const bw = w / 4.2, bx = x - 14 + i * w / 4.4 + (hash(i + 70) - .5) * 16, bh = h * (.13 + .16 * hash(i + 71)), by = y + h - bh, kind = Math.floor(hash(i + 72) * 3);
        const col = mixCol(far, PAL.ink, .12 * (i % 2)), P = [[bx, y + h + 20], [bx, by]];
        if (kind === 1) P.push([bx + bw / 2, by - bh * .45]);   // a pitched roof
        P.push([bx + bw, by], [bx + bw, y + h + 20]);
        if (kind === 2) paint(box(bx + bw * .62, by - bh * .3, bw * .14, bh * .32), { wash: col, ink: null });   // a chimney
        paint(P, { wash: col, ink: PAL.ink, sw: .5 });
        if (night > .4) for (let j = 0; j < 2; j++) {
          const lit = hash(i * 13 + j * 7 + Math.floor(t * .5 + hash(i + j * 3) * 4)) > .35, wx = bx + bw * (.22 + .4 * j), wy = by + bh * .35;
          if (!lit) continue;
          glow(wx + 5, wy + 6, 18, '#FFD27A', .5 * night);
          paint(box(wx, wy, 10, 12), { wash: '#F6CD74', ink: null });
        }
      }
    }
  };
  R.window = (t, o = {}) => {
    const L = o.light ?? 1, x = o.x ?? 1150, y = o.y ?? 230, w = o.w ?? 380, h = o.h ?? 360, F = o.frameW ?? 20, [cols, rows] = o.panes || [2, 2];
    const tod = o.tod ?? .5, trim = S(o.frameCol || C.trim, L);
    R.clip(box(x, y, w, h), () => { if (o.sky) o.sky(x, y, w, h, t); else R.sky(t, x, y, w, h, { tod, view: o.view === undefined ? 'roofs' : o.view }); });
    // glints on the glass: pale full-opacity washes (a translucent pale wash would mix muddy)
    const top = o.sky ? '#8FC1E4' : skyAt(tod)[0];
    boilSeed('room glass ' + x);
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const px = x + c * w / cols, py = y + r * h / rows, pw = w / cols, ph = h / rows;
      paint(ribbon([[px + pw * .14, py + ph * .42], [px + pw * .42, py + ph * .12]], 7, 3), { wash: mixCol(top, '#FFFFFF', .3), ink: null });
      paint(ribbon([[px + pw * .16, py + ph * .6], [px + pw * .3, py + ph * .45]], 4, 2), { wash: mixCol(top, '#FFFFFF', .25), ink: null });
    }
    boilSeed('room window ' + x);
    for (const b of [box(x - F, y - F, w + 2 * F, F), box(x - F, y + h, w + 2 * F, F), box(x - F, y, F, h), box(x + w, y, F, h)]) paint(b, { wash: trim, ink: null });
    for (let c = 1; c < cols; c++) paint(rectPts(x + c * w / cols - 5, y - 2, 10, h + 4, .6), { wash: trim, ink: PAL.ink, sw: .6 });
    for (let r = 1; r < rows; r++) paint(rectPts(x - 2, y + r * h / rows - 5, w + 4, 10, .6), { wash: trim, ink: PAL.ink, sw: .6 });
    paint(rectPts(x - F, y - F, w + 2 * F, h + 2 * F, 1), { ink: PAL.ink, sw: 1.1 });
    paint(rectPts(x, y, w, h, .6), { ink: PAL.ink, sw: .75 });
    // the sill, with its shadow on the wall
    const sy = y + h + F - 4;
    paint(ellPts(x + w / 2, sy + 30, w * .55, 12, 18), { fill: S(C.wainsDk, L), fillOp: 90, bleed: .1, tex: .4, ink: null });
    paint(rectPts(x - F - 18, sy, w + 2 * F + 36, 22, 1), { wash: trim, ink: PAL.ink, sw: 1 });
    const at = { x, y, w, h, sill: sy };
    if (o.curtains != null) curtains(t, x - F, y - F, w + 2 * F, h + 2 * F, clamp(o.curtains), L, o);
    return at;
  };
  // Two curtains on a rod. open 0 = drawn shut, 1 = tied back at the sides. They breathe on the beat, more with wind.
  function curtains(t, x, y, w, h, open, L, o) {
    const ry = y - 30, bot = y + h + 70, col = S(o.curtainCol || C.curtain, L), dk = S(o.curtainDk || C.curtainDk, L), wind = o.wind ?? 0;
    for (const s of [-1, 1]) {
      boilSeed('room curtain ' + s);
      const ox = s < 0 ? x - 34 : x + w + 34, closed = x + w / 2 + s * 4, gathered = s < 0 ? x + 30 : x + w - 30, ix = lerp(closed, gathered, open);
      const pinch = open * Math.abs(ix - ox) * .4, sway = k => (wob(t, .23 + .1 * wind, s * .3) * (3 + 22 * wind) + 4 * Math.sin(bpOf(t) * Math.PI / 2 + s)) * k * k;
      const inner = [], outer = [], N = 9;
      for (let i = 0; i <= N; i++) {
        const k = i / N, yy = lerp(ry, bot, k), p = pinch * Math.exp(-Math.pow((k - .62) / .2, 2));
        inner.push([ix + s * p + sway(k), yy]);
        outer.push([ox + sway(k) * .4, yy]);
      }
      const hem = []; for (let i = 1; i < 6; i++) { const k = i / 6; hem.push([lerp(inner[N][0], outer[N][0], k), bot + 5 * Math.sin(k * 9 + s)]); }
      const P = [...inner, ...hem, ...outer.reverse()];
      paint(P, { wash: col, fill: dk, fillOp: 60, bleed: .05, tex: .6, border: .5, ink: PAL.ink, sw: .9, curv: .2 });
      outer.reverse();
      for (const f of [.3, .55, .8]) {   // folds, following the curtain's shape
        const F = []; for (let i = 1; i <= N; i++) F.push([lerp(outer[i][0], inner[i][0], f), outer[i][1]]);
        inkLine(F, .6, dk, 'inkfine', .5);
      }
      if (open > .3) { const k = 6; paint(ribbon([inner[k], [lerp(inner[k][0], outer[k][0], .5), inner[k][1] + 4], outer[k]], 9, 9), { wash: dk, ink: PAL.ink, sw: .6 }); }
    }
    boilSeed('room rod');
    paint(ribbon([[x - 60, ry], [x + w / 2, ry + 1], [x + w + 60, ry]], 7, 7), { wash: S(C.brass, L), ink: PAL.ink, sw: .8 });
    for (const s of [-1, 1]) paint(ellPts(s < 0 ? x - 64 : x + w + 64, ry, 9, 9, 12), { wash: S(C.brass, L), ink: PAL.ink, sw: .8 });
  }

  // ---------- the door ----------
  R.door = (t, o = {}) => {
    const L = o.light ?? 1, x = o.x ?? 170, fy = o.floorY ?? 800, w = o.w ?? 230, h = o.h ?? 440, top = fy - h, F = 22, open = clamp(o.open ?? 0), right = o.hinge === 'right';
    const trim = S(C.trim, L), lit = clamp(o.lit ?? 0);
    R.clip(box(x, top, w, h), () => {
      if (o.beyond) { o.beyond(x, top, w, h, t); return; }
      boilSeed('room hall ' + x);
      const hall = S(mixCol('#3B3553', '#EFCB8E', lit), L);
      paint(box(x - 10, top - 10, w + 20, h + 20), { wash: hall, ink: null });
      paint(box(x - 10, fy - h * .14, w + 20, h * .16), { wash: mixCol(hall, '#1E1B2E', .35), ink: null });
      paint(rectPts(x + w * .3, top + h * .18, w * .4, h * .68, 1), { wash: mixCol(hall, '#1E1B2E', .2), ink: PAL.ink, sw: .5 });   // a far doorway
      if (lit > 0) glow(x + w / 2, top + h * .4, w * .9, '#FFD9A0', lit);
    });
    boilSeed('room door ' + x);
    for (const b of [box(x - F, top - F, F, h + F), box(x + w, top - F, F, h + F), box(x - F, top - F, w + 2 * F, F)]) paint(b, { wash: trim, ink: null });
    paint([[x - F, fy], [x - F, top - F], [x + w + F, top - F], [x + w + F, fy]], { ink: PAL.ink, sw: 1.1 });
    paint([[x, fy], [x, top], [x + w, top], [x + w, fy]], { ink: PAL.ink, sw: .8 });
    // the panel: a flat drawing that narrows toward the hinge as it swings open, showing its edge (no 3D projection)
    const pw = w * lerp(1, .1, open), ed = 16 * Math.sin(Math.min(1, open * 2) * Math.PI / 2), col = S(mixCol(o.col || C.door, '#1E1C33', open * .3), L);
    const px = right ? x + w - pw : x, ex = right ? px - ed : px + pw;
    if (ed > 1) paint(rectPts(ex, top + 2, ed, h - 2, .5), { wash: S(mixCol(o.col || C.door, '#1E1C33', .45), L), ink: PAL.ink, sw: .8 });
    paint(rectPts(px, top, pw, h, .5), { wash: col, ink: PAL.ink, sw: 1 });
    if (pw > 30) for (const [py, ph] of [[.08, .38], [.52, .4]]) paint(rectPts(px + pw * .15, top + h * py, pw * .7, h * ph, .5), { wash: mixCol(col, '#1E1C33', .12), fill: mixCol(col, '#FFFFFF', .2), fillOp: 50, tex: .5, ink: PAL.ink, sw: .6, br: 'inkfine' });
    const kx = right ? px + pw * .13 : px + pw * .87, ky = fy - h * .47, kr = 9 * Math.max(.4, pw / w);
    if (pw > 20) { paint(ellPts(kx, ky, kr * .8, kr * 2.2, 12), { wash: S(C.brassDk, L), ink: null }); paint(ellPts(kx, ky, kr, kr, 12), { wash: S(C.brass, L), ink: PAL.ink, sw: .7 }); }
    return { x, w, h, top, floorY: fy, open, threshold: [x + w / 2, fy] };
  };

  // ---------- picture frame, clock, shelf ----------
  R.frame = (t, o = {}) => {
    const L = o.light ?? 1, x = o.x ?? 610, y = o.y ?? 290, w = o.w ?? 170, h = o.h ?? 130, rot = (o.tilt ?? .025) + (o.nudge != null ? .16 * spring(t, o.nudge, 2.6, 8) : 0);
    boilSeed('room frame ' + x);
    push(); translate(x, y); rotate(rot);
    const fy0 = 34, fw = 16;
    inkLine([[-w * .32, fy0 + 6], [0, 0], [w * .32, fy0 + 6]], .5, PAL.ink, 'inkfine', 0);
    paint(ellPts(0, 0, 4, 4, 8), { wash: S(C.brass, L), ink: PAL.ink, sw: .5 });
    paint(ellPts(0, fy0 + h / 2 + 12, w * .5, h * .45, 18), { fill: S(C.wallDk, L), fillOp: 70, bleed: .1, tex: .4, ink: null });   // its shadow
    paint(rectPts(-w / 2, fy0, w, h, 1), { wash: S(o.col || C.wood, L), fill: S(C.woodDk, L), fillOp: 60, tex: .6, ink: PAL.ink, sw: 1 });
    paint(rectPts(-w / 2 + fw, fy0 + fw, w - 2 * fw, h - 2 * fw, .5), { wash: S(C.trim, L), ink: PAL.ink, sw: .6 });
    const px = -w / 2 + fw + 9, py = fy0 + fw + 9, pw = w - 2 * fw - 18, ph = h - 2 * fw - 18;
    R.clip(box(px, py, pw, ph), () => {
      if (typeof o.pic === 'function') return o.pic(px, py, pw, ph, t);
      if (o.pic === 'clawd') {
        paint(box(px, py, pw, ph), { wash: S('#E8C27A', L), ink: null });
        clawd(px + pw / 2, py + ph + pw * .12, pw * .085, { eyes: 'happy', mouth: 'smile', blush: .4, noShadow: true, aL: -.3, aR: -.3, boilKey: 'room portrait ' + x, col: S(PAL.clay, L), dk: S(PAL.clayDk, L) });
        return;
      }
      paint(box(px, py, pw, ph), { wash: S('#BFDCE8', L), ink: null });
      paint(ellPts(px + pw * .7, py + ph * .35, pw * .1, pw * .1, 14), { wash: S('#F6CD74', L), ink: PAL.ink, sw: .4 });
      paint(ellPts(px + pw * .2, py + ph * 1.05, pw * .55, ph * .45, 20), { wash: S('#8DB86A', L), ink: PAL.ink, sw: .45 });
      paint(ellPts(px + pw * .85, py + ph * 1.1, pw * .5, ph * .4, 20), { wash: S('#5E8F57', L), ink: PAL.ink, sw: .45 });
    });
    pop();
  };
  R.clock = (t, o = {}) => {
    const L = o.light ?? 1, x = o.x ?? 1000, y = o.y ?? 300, r = o.r ?? 56, h0 = o.time ?? 10.15, hrs = h0 + t * (o.rate ?? 1) / 3600;
    boilSeed('room clock ' + x);
    paint(ellPts(x + 6, y + 8, r, r, 20), { fill: S(C.wallDk, L), fillOp: 80, bleed: .1, tex: .4, ink: null });
    paint(ellPts(x, y, r, r, 24, .6), { wash: S(o.col || C.wood, L), fill: S(C.woodDk, L), fillOp: 50, tex: .6, ink: PAL.ink, sw: 1.1 });
    paint(ellPts(x, y, r * .8, r * .8, 24, .4), { wash: S(PAL.cream, L), ink: PAL.ink, sw: .6 });
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, r0 = r * (i % 3 ? .66 : .58), r1 = r * .74, c = Math.cos(a), s = Math.sin(a);
      inkLine([[x + c * r0, y + s * r0], [x + c * (r0 + r1) / 2, y + s * (r0 + r1) / 2], [x + c * r1, y + s * r1]], i % 3 ? .45 : .8, PAL.ink, 'inkfine', 0);
    }
    const hand = (a, len, w0, w1, col) => { const c = Math.sin(a), s = -Math.cos(a); paint(ribbon([[x - c * len * .15, y - s * len * .15], [x + c * len * .5, y + s * len * .5], [x + c * len, y + s * len]], w0, w1), { wash: col, ink: null }); };
    hand(frac(hrs / 12) * TAU, r * .42, 7, 3, PAL.ink);
    hand(frac(hrs) * TAU, r * .64, 5, 2, PAL.ink);
    // the second hand ticks on every beat, with a little overshoot
    const b = bpOf(t), sec = Math.floor(b) + backOut(clamp(frac(b) / .14)) + Math.floor(frac(h0 * 60) * 60);
    hand(sec / 60 * TAU, r * .7, 2.5, 1.5, S('#C8324A', L));
    paint(ellPts(x, y, 4, 4, 10), { wash: S(C.brass, L), ink: PAL.ink, sw: .5 });
  };
  R.shelf = (t, o = {}) => {
    const L = o.light ?? 1, x = o.x ?? 470, y = o.y ?? 520, w = o.w ?? 340, seed = o.seed ?? 1;
    boilSeed('room shelf ' + x);
    paint(ellPts(x + w / 2, y + 30, w * .5, 16, 18), { fill: S(C.wainsDk, L), fillOp: 70, bleed: .1, tex: .4, ink: null });
    for (const bx of [x + 30, x + w - 30]) paint([[bx - 6, y + 14], [bx + 6, y + 14], [bx + 1, y + 52]], { wash: S(C.woodDk, L), ink: PAL.ink, sw: .7 });
    // what stands on it: mostly books, a leaning one, a small plant, a jar
    let cx = x + 16, i = 0;
    const items = [];
    while (cx < x + w - 40 && i < 30) {
      const k = hash(seed * 31 + i * 1.37), bw = 15 + 13 * hash(seed * 17 + i), bh = 62 + 44 * hash(seed * 13 + i * 2.1);
      if (k > .9 && cx < x + w - 110) { items.push(['plant', cx + 32]); cx += 72; }
      else if (k > .8 && cx < x + w - 80) { items.push(['jar', cx + 22]); cx += 50; }
      else if (k > .72 && cx < x + w - 90) { items.push(['lean', cx, bw, bh, i]); cx += bh * .45 + bw; }
      else { items.push(['book', cx, bw, bh, i]); cx += bw + 1; }
      i++;
    }
    for (const it of items) {
      boilSeed('room shelf item ' + x + ' ' + it[1]);
      if (it[0] === 'plant') R.plant(t, { x: it[1], y, s: .42, seed: seed + it[1], light: L });
      else if (it[0] === 'jar') {
        paint(rrPts(it[1] - 17, y - 44, 34, 44, 8), { wash: S('#9CC7C4', L), fill: S('#6E9FA0', L), fillOp: 50, tex: .5, ink: PAL.ink, sw: .7 });
        paint(rectPts(it[1] - 13, y - 52, 26, 9, .4), { wash: S(C.woodDk, L), ink: PAL.ink, sw: .6 });
      } else {
        const [, bx, bw, bh, j] = it, col = S(C.books[Math.floor(hash(seed * 7 + j * 3.3) * C.books.length)], L), band = mixCol(col, S('#F6EEDD', L), .55);
        push(); translate(bx + (it[0] === 'lean' ? bh * .45 : 0), y);
        if (it[0] === 'lean') rotate(-.42);
        paint(rectPts(0, -bh, bw, bh, .4), { wash: col, ink: PAL.ink, sw: .7 });
        paint(box(2, -bh * .84, bw - 4, 4), { wash: band, ink: null });
        paint(box(2, -bh * .2, bw - 4, 4), { wash: band, ink: null });
        pop();
      }
    }
    boilSeed('room shelf board ' + x);
    paint(rectPts(x, y, w, 15, .6), { wash: S(C.wood, L), fill: S(C.woodDk, L), fillOp: 60, tex: .6, ink: PAL.ink, sw: 1 });
    return { x, y, w };
  };

  // ---------- rug, lamp, plant ----------
  R.rug = (t, o = {}) => {
    const L = o.light ?? 1, x = o.x ?? 900, y = o.y ?? 960, w = o.w ?? 600, h = o.h ?? 96, c = o.cols || C.rug;
    boilSeed('room rug ' + x);
    paint(ellPts(x, y, w / 2, h / 2, 36, 1), { wash: S(c[0], L), fill: S(mixCol(c[0], PAL.ink, .3), L), fillOp: 50, tex: .6, ink: PAL.ink, sw: 1 });
    paint(ellPts(x, y, w / 2 - 22, h / 2 - 9, 36, 1), { wash: S(c[1], L), ink: S(mixCol(c[0], PAL.ink, .4), L), sw: .5, br: 'inkfine' });
    paint(ellPts(x, y, w / 2 - 50, h / 2 - 21, 30, 1), { wash: S(c[2], L), fill: S(mixCol(c[2], PAL.ink, .3), L), fillOp: 40, tex: .5, ink: S(mixCol(c[0], PAL.ink, .4), L), sw: .5, br: 'inkfine' });
    for (let i = 0; i < 18; i++) {   // the braid, as short strokes around the outer ring
      const a = i / 18 * TAU, rx = w / 2 - 11, ry = h / 2 - 4.5;
      inkLine([[x + Math.cos(a) * (rx - 5), y + Math.sin(a) * (ry - 2)], [x + Math.cos(a + .05) * rx, y + Math.sin(a + .05) * ry], [x + Math.cos(a + .1) * (rx + 5), y + Math.sin(a + .1) * (ry + 2)]], .45, S(mixCol(c[0], PAL.ink, .45), L), 'inkfine', 0);
    }
  };
  R.lamp = (t, o = {}) => {
    const L = o.light ?? 1, x = o.x ?? 1720, y = o.y ?? 850, h = o.h ?? 430, on = clamp(o.on ?? 1), top = y - h, by = top + 104;
    const a = on * lerp(.3, 1, 1 - L);
    boilSeed('room lamp ' + x);
    if (a > 0) {   // light on the wall around the shade, and a pool on the floor
      glow(x, by - 10, 330, '#FFD58A', a);
      push(); translate(x, y); scale(1, .22); glow(0, 0, 320, '#FFCF86', a * .8); pop();
    }
    paint(ellPts(x, y + 4, 60, 11, 16), { fill: PAL.ink, fillOp: 70, bleed: .2, tex: .3, ink: null });
    paint(ellPts(x, y - 6, 46, 13, 16, .5), { wash: S(C.brassDk, L), ink: PAL.ink, sw: .9 });
    paint(ribbon([[x, y - 8], [x + 1, lerp(y, by, .5)], [x, by - 4]], 10, 8), { wash: S(C.brass, L), fill: S(C.brassDk, L), fillOp: 60, tex: .4, ink: PAL.ink, sw: .8 });
    const shade = [[x - 46, top], [x, top - 3], [x + 46, top], [x + 78, by], [x, by + 6], [x - 78, by]];
    paint(shade, { wash: S(mixCol(o.shadeCol || C.shade, '#FFF4D8', on * .6), lerp(L, 1, on * .7)), fill: S(C.brass, L), fillOp: 50, bleed: .05, tex: .6, border: .6, ink: PAL.ink, sw: 1, curv: .15 });
    if (on > 0) { paint(ellPts(x, by + 2, 72, 8, 18), { wash: mixCol(S(C.shade, L), '#FFF1CF', on), ink: null }); glow(x, by + 6, 110, '#FFE7B0', on * .8); }
    return { x, y, bulb: [x, by] };
  };
  // a lens-shaped leaf along a quadratic curve p0 → p2 (bent by p1), wmax wide
  const leafPts = (p0, p1, p2, wmax, n = 10) => {
    const Cv = []; for (let i = 0; i <= n; i++) { const s = i / n, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s; Cv.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]); }
    const Lp = [], Rp = [];
    for (let i = 0; i <= n; i++) {
      const A = Cv[Math.max(0, i - 1)], B = Cv[Math.min(n, i + 1)], dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, wv = wmax / 2 * Math.pow(Math.sin(Math.PI * i / n), .75);
      Lp.push([Cv[i][0] - dy / d * wv, Cv[i][1] + dx / d * wv]); Rp.push([Cv[i][0] + dy / d * wv, Cv[i][1] - dx / d * wv]);
    }
    return { pts: Lp.concat(Rp.reverse()), vein: Cv.slice(1, n - 1) };
  };
  R.plant = (t, o = {}) => {
    const L = o.light ?? 1, x = o.x ?? 1010, y = o.y ?? 830, s = o.s ?? 1, seed = o.seed ?? 3, n = o.leaves ?? 7, pt = y - 58 * s;
    boilSeed('room plant ' + x + ' ' + seed);
    if (s > .6) paint(ellPts(x, y + 2, 52 * s, 9 * s, 14), { fill: PAL.ink, fillOp: 70, bleed: .2, tex: .3, ink: null });
    const leaves = [];
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) * 2 - 1 : 0, a = u * 1.15 + (hash(seed + i * 2.3) - .5) * .25 + .06 * Math.sin(bpOf(t) * Math.PI / 2 + i * 1.3 + seed);
      const len = (95 + 55 * hash(seed + i * 4.1)) * s * (1 - .25 * Math.abs(u)), base = [x + u * 12 * s, pt + 4 * s];
      const tip = [base[0] + Math.sin(a) * len, base[1] - Math.cos(a) * len * .85 + Math.abs(u) * len * .3];
      const mid = [base[0] + Math.sin(a) * len * .35, base[1] - Math.cos(a * .7) * len * .75];
      leaves.push({ lf: leafPts(base, mid, tip, (30 + 10 * hash(seed + i)) * s), i, u });
    }
    leaves.sort((p, q) => Math.abs(q.u) - Math.abs(p.u));
    for (const { lf, i } of leaves) {
      boilSeed('room leaf ' + x + ' ' + seed + ' ' + i);
      paint(lf.pts, { wash: S(i % 2 ? C.leaf : C.leafLt, L), fill: S(C.leafDk, L), fillOp: 45, tex: .5, ink: PAL.ink, sw: .8 * Math.min(1, s * 1.4) });
      inkLine(lf.vein, .5 * Math.min(1, s * 1.4), S(C.leafDk, L), 'inkfine', .5);
    }
    boilSeed('room pot ' + x + ' ' + seed);
    const pc = S(o.potCol || C.pot, L);
    paint([[x - 32 * s, pt + 10 * s], [x + 32 * s, pt + 10 * s], [x + 25 * s, y], [x - 25 * s, y]], { wash: pc, fill: S(mixCol(C.pot, PAL.ink, .3), L), fillOp: 60, tex: .6, ink: PAL.ink, sw: .9 * Math.min(1, s * 1.4) });
    paint(rectPts(x - 37 * s, pt, 74 * s, 13 * s, .5), { wash: S(mixCol(C.pot, C.trim, .2), L), ink: PAL.ink, sw: .9 * Math.min(1, s * 1.4) });
  };

  // ---------- a whole room ----------
  R.room = (t, o = {}) => {
    const tod = o.tod ?? .5, L = o.light ?? R.lightOf(tod), fy = o.floorY ?? 800, c = { light: L, floorY: fy, x0: o.x0, x1: o.x1 };
    const at = { floorY: fy, standY: fy + 140, light: L, tod };
    R.wall(t, { ...c, ...o.wall });
    R.floor(t, { ...c, ...o.floorOpts });
    if (o.window !== false) at.window = R.window(t, { tod, curtains: .85, ...c, ...o.window });
    if (o.door !== false) at.door = R.door(t, { ...c, ...o.door });
    if (o.frame !== false) R.frame(t, { pic: 'clawd', ...c, ...o.frame });
    if (o.clock !== false) R.clock(t, { ...c, ...o.clock });
    if (o.shelf !== false) at.shelf = R.shelf(t, { ...c, ...o.shelf });
    if (o.rug !== false) R.rug(t, { ...c, y: fy + 160, ...o.rug });
    if (o.lamp !== false) at.lamp = R.lamp(t, { on: 0, ...c, y: fy + 50, ...o.lamp });
    if (o.plant !== false) R.plant(t, { ...c, y: fy + 34, ...o.plant });
    return at;
  };
  return R;
})();
