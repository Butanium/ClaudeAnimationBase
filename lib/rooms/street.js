// lib/rooms/street.js: an endless town street at dusk or night, in parallax layers: a far skyline with a blinking mast,
// mid-town blocks whose lit windows switch on and off (seeded), a row of shops and houses at street level (lit windows,
// striped awnings, a neon sign that pulses on the beat), the pavement, the road, and streetlamps with glow.
// Use: STREET.draw(t, o) paints everything behind the characters; stand them at STREET.groundY(o); then
//        STREET.front(t, o) paints the lamp posts at the kerb, which pass in front of them (before camEnd()).
//      o: night 0..1 (1 = full night: sky, colours, windows; default 1), lampsOn (time the lamps come on, one after
//        another down the street, with a flicker; default: on when night > .45), lamps 0..1 (override their brightness),
//        groundY (the walking line, default 880), lampEvery (px, default 760), seed, sky (fn(t) instead of the built-in
//        sky, e.g. t => DaySky.draw(t, .95); false = none), far / mid (false to skip a layer), lite (fewer marks).
//      STREET.lamps(x0, x1, o) → the lamp x positions in [x0, x1] (to stand someone under one).
// Expects: core only (heartPts from clawd.js for a neon sign). World space under camBegin; the far layers slide by
//   parallax (same depth convention as lib/sky/landscape.js: d = 0 pinned to the screen, 1 = the world).
// Source: made for the asset library, 2026-09-25, by painter-rooms (Claude).
const STREET = (() => {
  const C = {
    skyTop: ['#8FC1E4', '#161B44'], skyLow: ['#E6D9C8', '#4A3F7A'], far: ['#9AA6C2', '#2B2E5C'], mid: ['#7E8BA8', '#23284F'],
    fronts: ['#A0604F', '#62739A', '#C09058', '#55857F', '#80607F', '#C9B08E'], trim: '#EDE0C6', glass: ['#9CBBD0', '#2A2D4E'],
    warm: '#F6CD74', shop: '#F2B866', pave: ['#A9A3B0', '#5B5670'], kerb: ['#CFC8C8', '#7D778C'], road: ['#6B6A78', '#2E3148'],
    line: '#E8DFC4', post: '#2F2C42', lamp: '#FFE3A0', neon: ['#FF8FB8', '#7FE0D8', '#F6CD74'], night: '#1B1F42',
    awning: [['#C8524A', '#EFE3CB'], ['#3F7F8A', '#EFE3CB'], ['#6E5AA0', '#F2D9A6']],
  };
  const S = { C };
  const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const at = (pair, n) => mixCol(pair[0], pair[1], n);                                   // a day/night pair at night n
  const dim = (c, n, k = .55) => mixCol(c, C.night, n * k);                              // a day colour, darkened for night
  const opts = o => { const n = clamp(o.night ?? 1), gy = o.groundY ?? 880; return { n, gy, base: gy - 60, kerb: gy + 50, seed: o.seed ?? 0, lite: !!o.lite, every: o.lampEvery ?? 760 }; };
  S.groundY = (o = {}) => o.groundY ?? 880;

  // Parallax: draw at depth d (0 = pinned to the screen, 1 = the world) under the active camera; returns the visible
  // range in the layer's coordinates. Pair with pop(). The same formula as lib/sky/landscape.js, so layers line up.
  function layer(d, ref = [W / 2, H / 2]) {
    const c = CAM || { cx: W / 2, cy: H / 2, zoom: 1, rot: 0 }, zd = 1 + (c.zoom - 1) * d;
    const lx = c.cx * d + ref[0] * (1 - d), ly = c.cy * d + ref[1] * (1 - d);
    push(); translate(c.cx, c.cy); scale(zd / c.zoom); translate(-lx, -ly);
    const cs = Math.abs(Math.cos(c.rot)), sn = Math.abs(Math.sin(c.rot)), hw = (W / 2 * cs + H / 2 * sn) / zd, hh = (W / 2 * sn + H / 2 * cs) / zd;
    return { x0: lx - hw, x1: lx + hw, y0: ly - hh, y1: ly + hh };
  }
  // A window's light, as a pure function of t: each window keeps its state for 6–20 s, then may switch, flickering
  // for a few frames as it does. More windows are lit the darker it is.
  const litAt = (t, id, n) => {
    if (n < .05) return false;
    const per = 6 + 14 * hash(id * 1.31), u = t + hash(id * 2.17) * per, k = Math.floor(u / per), p = .1 + .45 * n;
    const on = hash(id * 3.7 + k * 1.9) < p, was = hash(id * 3.7 + (k - 1) * 1.9) < p, a = u - k * per;
    return on !== was && a < .15 ? (Math.floor(a / .04) % 2 ? on : was) : on;
  };
  // Lamp brightness: a cascade down the street from lampsOn (each lamp a beat-ish later, with a flicker); one lamp in
  // five is a bit broken and blinks off now and then, on the beat.
  const lampK = (t, i, x, O, o) => {
    if (o.lamps != null) return clamp(o.lamps);
    let v;
    if (o.lampsOn == null) v = O.n > .45 ? 1 : 0;
    else { const a = t - o.lampsOn - Math.max(0, i) * .18; v = a < 0 ? 0 : a < .3 ? [1, 0, .3, 0, 1, .5, 1][Math.floor(a / .045)] ?? 1 : 1; }
    if (v > 0 && hash(i * 7.3 + O.seed) < .2) { const b = bpOf(t), f = frac(b); if (hash(Math.floor(b) * 3.1 + i) < .3 && f < .12) v *= f < .05 ? .15 : .6; }
    return v;
  };
  S.lamps = (x0, x1, o = {}) => { const e = o.lampEvery ?? 760, off = e * .35, out = []; for (let i = Math.ceil((x0 - off) / e); i * e + off <= x1; i++) out.push(i * e + off); return out; };

  function sky(t, O) {
    const V = layer(.04), top = at(C.skyTop, O.n), low = at(C.skyLow, O.n);
    boilSeed('street sky');
    paint(box(V.x0 - 60, V.y0 - 60, V.x1 - V.x0 + 120, V.y1 - V.y0 + 120), { wash: top, ink: null });
    paint(ellPts((V.x0 + V.x1) / 2, O.base - 60, (V.x1 - V.x0) * .75, 380, 28), { fill: low, fillOp: 190, bleed: .25, tex: .5, ink: null });
    if (O.n > .3) {
      const T0 = Math.floor(V.x0 / 2400), N = O.lite ? 12 : 26;
      for (let tile = T0; tile * 2400 < V.x1; tile++) for (let i = 0; i < N; i++) {
        boilSeed('street star ' + tile + ' ' + i);
        const id = tile * 97 + i, sx = tile * 2400 + hash(id * 1.7) * 2400, sy = V.y0 + hash(id * 2.9) * (O.base - 360 - V.y0);
        if (sx < V.x0 || sx > V.x1) continue;
        const tw = .55 + .45 * Math.sin(t * (2 + 2 * hash(id + 5)) + id);
        paint(starPts(sx, sy, (2.5 + 4 * hash(id * 3.3)) * tw, .35, 4), { wash: PAL.cream, washOp: Math.min(255, (140 + 110 * tw) * clamp((O.n - .3) / .5)), ink: null });
      }
      boilSeed('street moon');
      const mx = V.x0 + (V.x1 - V.x0) * .78, my = V.y0 + 170, r = 46, k = clamp((O.n - .4) / .4);
      glow(mx, my, r * 3.6, '#E6E2FF', .5 * k);
      paint(ellPts(mx, my, r, r, 20), { wash: mixCol(top, '#FFF3DA', k), ink: null });
      paint(ellPts(mx + r * .45, my - r * .3, r * .85, r * .85, 20), { wash: top, ink: null });
    }
    pop();
  }
  // The far skyline: flat silhouettes in the haze, a few lit dots, a mast whose red light blinks on the beat.
  function far(t, O) {
    const d = .22, V = layer(d), slot = 170, col = at(C.far, O.n), hz = O.base - 120;
    for (let k = Math.floor((V.x0 - slot) / slot); k * slot < V.x1 + slot; k++) {
      boilSeed('street far ' + k);
      const id = k * 13 + O.seed, bw = slot * (.8 + .5 * hash(id)), bx = k * slot + (hash(id + 1) - .5) * 40, bh = 160 + 320 * Math.pow(hash(id + 2), 1.6), top = hz - bh;
      const P = hash(id + 3) < .25 ? [[bx, hz + 200], [bx, top], [bx + bw * .5, top - bh * .18], [bx + bw, top], [bx + bw, hz + 200]] : box(bx, top, bw, bh + 200);
      paint(P, { wash: col, ink: null });
      if (hash(id + 4) < .12) {   // a radio mast
        const mx = bx + bw / 2, mt = top - 130;
        inkLine([[mx, top], [mx, top - 65], [mx, mt]], 1.2, mixCol(col, PAL.ink, .4), 'ink', 0);
        if (O.n > .3) { const on = frac(bpOf(t) / 2) < .25; if (on) glow(mx, mt, 34, '#FF5A5A', .8 * O.n); paint(ellPts(mx, mt, 4, 4, 8), { wash: on ? '#FF6B6B' : '#7A3440', ink: null }); }
      }
      if (O.n > .3 && !O.lite) for (let j = 0; j < 3; j++) if (litAt(t, id * 5 + j, O.n)) paint(box(bx + bw * (.2 + .6 * hash(id * 5 + j)), top + bh * (.15 + .6 * hash(id * 7 + j)), 6, 7), { wash: mixCol(C.warm, col, .25), ink: null });
    }
    pop();
  }
  // Mid-town blocks: silhouettes with window grids (only the lit windows are painted) and rooftop bits.
  function mid(t, O) {
    const d = .5, V = layer(d), slot = 300, col = at(C.mid, O.n), hz = O.base - 40, dk = mixCol(col, PAL.ink, .25);
    for (let k = Math.floor((V.x0 - slot) / slot); k * slot < V.x1 + slot; k++) {
      boilSeed('street mid ' + k);
      const id = k * 31 + 7 + O.seed, bw = slot * (.62 + .3 * hash(id)), bx = k * slot + hash(id + 1) * (slot - bw), bh = 330 + 380 * hash(id + 2), top = hz - bh;
      const c = mixCol(col, k % 2 ? dk : col, .5), stepped = hash(id + 3) < .3;
      const P = stepped ? [[bx, hz + 200], [bx, top + 60], [bx + bw * .3, top + 60], [bx + bw * .3, top], [bx + bw, top], [bx + bw, hz + 200]] : box(bx, top, bw, bh + 200);
      paint(P, { wash: c, ink: PAL.ink, sw: .6 });
      if (hash(id + 4) < .3) {   // a water tower on legs
        const tx = bx + bw * (.25 + .5 * hash(id + 5)), ty = top - 70;
        for (const s of [-1, 1]) inkLine([[tx + s * 22, top], [tx + s * 20, top - 20], [tx + s * 18, ty + 38]], .8, dk, 'ink', 0);
        paint([[tx - 26, ty + 38], [tx - 26, ty + 8], [tx, ty - 10], [tx + 26, ty + 8], [tx + 26, ty + 38]], { wash: dk, ink: PAL.ink, sw: .6 });
      }
      if (O.n < .1) continue;
      const cols = Math.max(2, Math.floor(bw / (O.lite ? 110 : 76))), rows = Math.floor((bh - 60) / (O.lite ? 130 : 96)), ww = 16, wh = 22;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const wid = id * 101 + r * 13 + q, wx = bx + (q + .5) * bw / cols - ww / 2, wy = top + (stepped && q < cols * .3 ? 90 : 34) + r * (bh - 60) / rows;
        if (litAt(t, wid, O.n)) paint(box(wx, wy, ww, wh), { wash: mixCol(C.warm, c, .15 + .3 * hash(wid)), ink: null });
      }
    }
    pop();
  }
  // Street-level fronts (the world, d = 1): shops with awnings and lit interiors, houses with doors, windows above.
  function fronts(t, O, V) {
    const slot = 520, n = O.n, glows = [];
    for (let k = Math.floor((V.x0 - slot) / slot); k * slot < V.x1 + slot; k++) {
      const id = k * 57 + 11 + O.seed, gap = hash(id) < .45 ? 70 + 90 * hash(id + 1) : 0, bx = k * slot + gap / 2, bw = slot - gap;
      const floors = hash(id + 2) < .4 ? 2 : 1, gh = 290, fh = 150, bh = gh + floors * fh + 30, top = O.base - bh, gable = hash(id + 3) < .4;
      const col = dim(C.fronts[Math.floor(hash(id + 4) * C.fronts.length)], n), dk = mixCol(col, PAL.ink, .3), trim = dim(C.trim, n);
      boilSeed('street front ' + k);
      const P = gable ? [[bx, O.base], [bx, top], [bx + bw / 2, top - bw * .28], [bx + bw, top], [bx + bw, O.base]] : box(bx, top, bw, bh);
      if (gable) paint(box(bx + bw * .68, top - bw * .26, 34, bw * .22), { wash: dk, ink: PAL.ink, sw: .8 });   // chimney
      paint(P, { wash: col, fill: O.lite ? null : dk, fillOp: 40, tex: .5, ink: PAL.ink, sw: 1 });
      if (!gable) paint(rectPts(bx - 10, top - 6, bw + 20, 20, .6), { wash: trim, ink: PAL.ink, sw: .8 });   // cornice
      paint(rectPts(bx - 4, O.base - gh - 14, bw + 8, 14, .5), { wash: trim, ink: PAL.ink, sw: .7 });           // the ground-floor band
      // upper windows
      const cols = Math.max(2, Math.floor(bw / 170));
      for (let f = 0; f < floors; f++) for (let q = 0; q < cols; q++) {
        const wid = id * 17 + f * 5 + q, ww = 64, wh = 92, wx = bx + (q + .5) * bw / cols - ww / 2, wy = O.base - gh - 14 - (f + 1) * fh + 28, lit = litAt(t, wid, n);
        paint(rectPts(wx, wy, ww, wh, .6), { wash: lit ? C.warm : at(C.glass, n), ink: PAL.ink, sw: .8 });
        if (lit) { inkLine([[wx + ww / 2, wy + 2], [wx + ww / 2, wy + wh / 2], [wx + ww / 2, wy + wh - 2]], .6, dim('#8A5A3A', n * .5), 'inkfine', 0); }
        if (!O.lite) paint(rectPts(wx - 8, wy + wh, ww + 16, 10, .4), { wash: trim, ink: PAL.ink, sw: .6 });
      }
      // ground floor: a shop (window, awning, door, maybe a neon sign) or a house (door and a window)
      const shop = hash(id + 5) < .6, doorW = 110, doorH = 230, dx = bx + (hash(id + 6) < .5 ? bw * .14 : bw * .86 - doorW);
      const doorLit = litAt(t, id * 3 + 1, n * .7);
      paint(rectPts(dx, O.base - doorH, doorW, doorH, .6), { wash: doorLit && shop ? mixCol(C.shop, dk, .3) : dim(mixCol(C.fronts[(k + 2) % 6], PAL.ink, .25), n), ink: PAL.ink, sw: .9 });
      paint(ellPts(dx + doorW * .8, O.base - doorH * .48, 5, 5, 8), { wash: dim('#D6A94E', n), ink: null });
      const sx = dx < bx + bw / 2 ? dx + doorW + 30 : bx + 30, sw = bw - doorW - 90, sy = O.base - 250, sh = 170;
      if (shop) {
        const lit = n > .15;
        paint(rectPts(sx, sy, sw, sh, .6), { wash: dim(C.shop, n * .25), ink: PAL.ink, sw: 1 });
        if (!O.lite) {   // shelves and jars in the lit window
          for (const f of [.42, .75]) inkLine([[sx + 10, sy + sh * f], [sx + sw / 2, sy + sh * f + 1], [sx + sw - 10, sy + sh * f]], .9, dim('#8A5A3A', n * .4), 'ink', 0);
          for (let j = 0; j < 4; j++) { const jx = sx + sw * (.15 + .22 * j), f = j % 2 ? .75 : .42, jh = 26 + 16 * hash(id * 3 + j); paint(rrPts(jx - 12, sy + sh * f - jh, 24, jh, 7), { wash: dim(['#B85A55', '#5E7FA0', '#6E9F58', '#E8DCC0'][j], n * .3), ink: PAL.ink, sw: .5 }); }
        }
        if (lit) glows.push([sx + sw / 2, sy + sh / 2, sw * .8, .8], [sx + sw / 2, O.base + 40, sw * .7, .5, .25]);
        // the awning: stripes, each with its own scalloped edge
        const A = C.awning[Math.floor(hash(id + 7) * C.awning.length)], ns = O.lite ? 4 : 5, ax = sx - 20, aw = sw + 40, ay = sy - 50, ad = 60;
        for (let j = 0; j < ns; j++) {
          const x0 = ax + aw * j / ns, x1 = ax + aw * (j + 1) / ns, Q = [[x0 + (j / ns - .5) * 16, ay], [x1 + ((j + 1) / ns - .5) * 16, ay]];
          for (let q = 0; q <= 4; q++) { const a = q / 4 * Math.PI; Q.push([lerp(x1, x0, q / 4), ay + ad + Math.sin(a) * 12]); }
          paint(Q, { wash: dim(A[j % 2], n), ink: PAL.ink, sw: .7 });
        }
        if (hash(id + 8) < .6) {   // a neon sign above the awning, pulsing on the beat
          const nx = sx + sw / 2, ny = ay - 58, nc = C.neon[Math.floor(hash(id + 9) * 3)], kind = hash(id + 10) < .5 ? 0 : 1;
          const on = n < .2 ? 0 : .55 + .45 * pulse(t, 5) * (hash(beatN(t) * 7.1 + k) < .12 ? 0 : 1);
          const shape = kind === 0 ? heartPts(nx, ny, 32) : starPts(nx, ny, 40, .45, 5);
          if (on > 0) glows.push([nx, ny, 110, on * .9, 1, nc]);
          paint(ribbon([...shape, shape[0], shape[1]], 7, 7), { wash: on > 0 ? mixCol(nc, '#FFFFFF', .35 * on) : dim(nc, .7), ink: null });
        }
      } else {
        const lit = litAt(t, id * 3 + 2, n);
        paint(rectPts(sx + sw * .2, sy + 20, sw * .6, sh - 40, .6), { wash: lit ? C.warm : at(C.glass, n), ink: PAL.ink, sw: .9 });
        if (lit) glows.push([sx + sw / 2, sy + sh / 2, 110, .5]);
        paint(rectPts(sx + sw * .2 - 10, sy + sh - 20, sw * .6 + 20, 12, .4), { wash: trim, ink: PAL.ink, sw: .6 });
      }
    }
    return glows;
  }

  S.draw = (t, o = {}) => {
    const O = opts(o), n = O.n;
    if (o.sky !== false) { if (typeof o.sky === 'function') o.sky(t); else sky(t, O); }
    if (o.far !== false) far(t, O);
    if (o.mid !== false) mid(t, O);
    const V = layer(1); pop();   // the visible world range
    const glows = fronts(t, O, V);
    // pavement, kerb and road
    boilSeed('street pavement');
    const pv = at(C.pave, n), jc = mixCol(pv, PAL.ink, .3);
    paint(box(V.x0 - 50, O.base, V.x1 - V.x0 + 100, O.kerb - O.base), { wash: pv, ink: null });
    paint(box(V.x0 - 50, O.base, V.x1 - V.x0 + 100, 10), { wash: mixCol(pv, PAL.ink, .25), ink: null });
    const slab = 170;
    for (let k = Math.floor(V.x0 / slab); k * slab < V.x1; k++) inkLine([[k * slab, O.base + 10], [k * slab - 6, (O.base + O.kerb) / 2], [k * slab - 12, O.kerb]], .5, jc, 'inkfine', 0);
    for (let x = V.x0 - 50; x < V.x1 + 50; x += 900) inkLine([[x, O.base + 1], [x + 450, O.base], [x + 904, O.base + 1]], .9, PAL.ink, 'ink', .5);
    boilSeed('street road');
    paint(box(V.x0 - 50, O.kerb, V.x1 - V.x0 + 100, 16), { wash: at(C.kerb, n), ink: null });
    paint(box(V.x0 - 50, O.kerb + 16, V.x1 - V.x0 + 100, Math.max(60, V.y1 - O.kerb)), { wash: at(C.road, n), ink: null });
    for (let x = V.x0 - 50; x < V.x1 + 50; x += 900) { inkLine([[x, O.kerb], [x + 450, O.kerb - 1], [x + 904, O.kerb]], .9, PAL.ink, 'ink', .5); inkLine([[x, O.kerb + 16], [x + 450, O.kerb + 16], [x + 904, O.kerb + 17]], .7, PAL.ink, 'ink', .5); }
    for (let k = Math.floor(V.x0 / 260); k * 260 < V.x1; k++) paint(box(k * 260, O.kerb + 120, 130, 9), { wash: dim(C.line, n * .6), ink: null });
    // light: windows and shops glow onto the street, lamps light the pavement round them
    boilSeed('street light');
    if (n > .15) for (const [x, y, r, a, sy = 1, col = '#FFD27A'] of glows) {
      if (sy === 1) glow(x, y, r, col, a * n); else { push(); translate(x, y); scale(1, sy); glow(0, 0, r, col, a * n); pop(); }
    }
    S.lamps(V.x0 - 100, V.x1 + 100, o).forEach((lx, i) => {
      const li = Math.round((lx - O.every * .35) / O.every), k = lampK(t, li, lx, O, o); if (k <= 0) return;
      glow(lx + 46, O.kerb - 480, 260, '#FFD58A', k);
      push(); translate(lx + 30, O.gy + 10); scale(1, .22); glow(0, 0, 330, '#FFCF86', k * .9); pop();
    });
  };

  // Lamp posts at the kerb, in front of whoever walks along the pavement: a crook-topped post and a lantern.
  S.front = (t, o = {}) => {
    const O = opts(o), V = layer(1); pop();
    S.lamps(V.x0 - 100, V.x1 + 100, o).forEach(lx => {
      const li = Math.round((lx - O.every * .35) / O.every), k = lampK(t, li, lx, O, o), post = dim(C.post, O.n * .3), y0 = O.kerb - 2, top = O.kerb - 540;
      boilSeed('street lamp ' + li);
      paint(ellPts(lx, y0 + 2, 34, 7, 14), { fill: PAL.ink, fillOp: 80, bleed: .2, tex: .3, ink: null });
      paint(rectPts(lx - 16, y0 - 50, 32, 50, .5), { wash: post, ink: PAL.ink, sw: .9 });
      paint(ribbon([[lx, y0 - 40], [lx, lerp(y0, top, .5)], [lx, top + 50], [lx + 8, top + 8], [lx + 30, top - 4], [lx + 46, top + 12]], 11, 7), { wash: post, ink: PAL.ink, sw: .9 });
      const hx = lx + 46, hy = top + 12;
      paint([[hx - 16, hy + 8], [hx + 16, hy + 8], [hx + 22, hy + 58], [hx - 22, hy + 58]], { wash: k > 0 ? mixCol('#E8D9B0', C.lamp, k) : dim('#B7B2A6', O.n * .5), ink: PAL.ink, sw: .8 });
      paint([[hx - 20, hy + 10], [hx, hy - 8], [hx + 20, hy + 10]], { wash: post, ink: PAL.ink, sw: .8 });
      paint(rectPts(hx - 24, hy + 56, 48, 8, .3), { wash: post, ink: PAL.ink, sw: .7 });
      if (k > 0) glow(hx, hy + 34, 90, '#FFE7B0', k);
    });
  };
  return S;
})();
