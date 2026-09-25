// lib/weather/rain.js: rain in depth, slanted by the wind, with crown splashes where it lands and rings on puddles.
// Use: rain(t, o) paints the rain; call it twice around your characters, o.layer 'far' before them and 'near' after
//   (near drops land on o.surfaces and in front of the ground line, far ones behind it). rain.puddle(p, o) paints a
//   puddle p = [cx, cy, rx, ry]; pass the same p in o.puddles and drops landing in it ring instead of splashing.
//   o: intensity 0..1, or s => 0..1 read at each drop's spawn time (drops already falling finish when it drops);
//      wind: slant (dx per dy, about -.5..5; + blows right), or t => slant; ground: world y of the ground line
//      (omit: drops fall out of the view); band: depth of the ground strip the splashes spread over (60·size);
//      surfaces: [[ax, ay, bx, by], ...] segments near drops land on (a roof, an umbrella, a head);
//      puddles: [[cx, cy, rx, ry], ...]; night: pale streaks for dark skies; col / colFar / splashCol: colours;
//      size: scale of streaks and splashes (1 = a medium shot); speed: px/s (2600·size); density: drops per 1920 px
//      at intensity 1 (220); x0 / x1 / top: the rain's region (default: the view); seed.
// Expects: world space: call it between camBegin/camEnd (or with no camera). The field is periodic in world x (1920 px
//   tiles, each seeded differently), so drops and splashes stay put when the camera pans. 1 paint per streak, 1–3 per
//   splash: ~280 paints at intensity 1 over a 1920 px view (lower density to go cheaper).
// Source: made for the asset library, 2026-09-25, by painter-weather (Claude).
const rain = (() => {
  const TILE = 1920;
  const DAY = { col: '#4A6793', colFar: '#8499B6', splashCol: '#E3EAF1' };
  const NIGHT = { col: '#C9D8F2', colFar: '#6F7FB4', splashCol: '#DCE6F7' };
  const PUDDLE = '#7189AE';

  // the world rectangle the camera sees (the canvas when there's no camera)
  function view() {
    if (!CAM) return [0, 0, W, H];
    const c = Math.cos(CAM.rot), s = Math.sin(CAM.rot), xs = [], ys = [];
    for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
      const dx = (sx - W / 2) / CAM.zoom, dy = (sy - H / 2) / CAM.zoom;
      xs.push(CAM.cx + dx * c + dy * s); ys.push(CAM.cy - dx * s + dy * c);
    }
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }

  // A drop landing on the ground: a two-horned crown that rises, flares and falls back, and on near drops two
  // droplets flung off the horns. k = 0..1 through its life, s = its size in px.
  function crown(x, y, s, k, col, drops) {
    const up = k < .3 ? easeOut(k / .3) : 1 - ease((k - .3) / .7), h = 11 * s * up, b = 2.6 * s, sp = 5 * s * easeOut(k);
    if (h > .8) {
      const j = () => jit(.35 * s);
      paint([[x - b - s, y + s * .6], [x - b - sp + j(), y - h], [x - b * .45, y - h * .42], [x + j(), y - h * .2],
             [x + b * .45, y - h * .42], [x + b + sp + j(), y - h * .9], [x + b + s, y + s * .6]], { wash: col, ink: null });
    }
    if (drops && k > .15) {
      const a = (k - .15) * .22;   // seconds since they tore off
      for (const d of [-1, 1]) {
        const px = x + d * (b + 5 * s + 150 * s * a), py = y - 10 * s - 170 * s * a + 2600 * s * a * a, r = 1.5 * s * (1 - .5 * k);
        if (py < y) paint(ellPts(px, py, r, r * 1.25, 8), { wash: col, ink: null });
      }
    }
  }
  // A ring spreading on a puddle, as two thin wash arcs (pale ink over the dark water would vanish, LESSONS.md).
  function ringOn(x, y, R, k, col, puddleCol, s) {
    const r = R * easeOut(k), c = mixCol(col, puddleCol, k * .85), w = Math.max(.9 * s, 2.6 * s * (1 - k));
    if (r < 1.5) return;
    const arc = (a0, a1, ww, n) => { const P = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r * .3]); } paint(ribbon(P, ww, ww * .7), { wash: c, ink: null }); };
    arc(.15, Math.PI - .15, w, 10);
    arc(Math.PI + .25, TAU - .25, w * .6, 8);
  }

  function rain(t, o = {}) {
    const size = o.size ?? 1, seed = o.seed ?? 0, P0 = o.night ? NIGHT : DAY;
    const col = o.col ?? P0.col, colFar = o.colFar ?? P0.colFar, splashCol = o.splashCol ?? P0.splashCol;
    const I = typeof o.intensity === 'function' ? o.intensity : () => o.intensity ?? .7;
    const slant = typeof o.wind === 'function' ? o.wind(t) : o.wind ?? .12;
    const [vx0, vy0, vx1, vy1] = view();
    const X0 = o.x0 ?? -Infinity, X1 = o.x1 ?? Infinity, top = o.top ?? vy0 - 140 * size;
    const ground = o.ground, band = o.band ?? 60 * size, bottom = ground != null ? ground + band / 2 : vy1 + 160 * size;
    const speed = o.speed ?? 2600 * size, density = o.density ?? 220, fall = bottom - top;
    const zMin = o.layer === 'near' ? .5 : 0, zMax = o.layer === 'far' ? .5 : 1.0001;
    const puddles = o.puddles || [], surfaces = o.surfaces || [], puddleCol = o.puddleCol ?? PUDDLE;
    if (fall <= 0) return;
    const drift = Math.abs(slant) * fall + 60 * size;
    const m0 = Math.floor((vx0 - drift) / TILE), m1 = Math.floor((vx1 + drift) / TILE);
    boilSeed('rain ' + seed + ' ' + (o.layer || 'all'));
    const splashes = [];
    for (let m = m0; m <= m1; m++) for (let i = 0; i < density; i++) {
      const id = seed * 7919 + m * 1009 + i, z = hash(id * .731 + .5);
      if (z < zMin || z >= zMax) continue;
      const v = speed * lerp(.72, 1.08, z), P = fall / v * (1.08 + .35 * hash(id * 1.93 + 4.1)), ph = hash(id * 2.3 + 1.7);
      const w = size * lerp(1.5, 4, z), len = size * lerp(45, 130, z), c = mixCol(colFar, col, z);
      const u = t / P + ph, n0 = Math.floor(u);
      for (const n of [n0, n0 - 1]) {   // this cycle's drop, and the last one's splash if it's still going
        const ts = (n - ph) * P;
        if (hash(id * 3.3 + n * 1.91) >= clamp(I(ts))) continue;
        const xs = m * TILE + hash(id * 1.37 + n * 7.13) * TILE - slant * fall * .5, X = y => xs + (y - top) * slant;
        if (Math.max(X(top), X(bottom)) < vx0 - 60 || Math.min(X(top), X(bottom)) > vx1 + 60) continue;
        // where it lands: the nearest surface on its path (near drops only), else its row of the ground strip
        let yl = ground != null ? ground + (z - .5) * band : Infinity, onSurf = false;
        if (z >= .5) for (const [ax, ay, bx, by] of surfaces) {
          const den = (bx - ax) - (by - ay) * slant; if (Math.abs(den) < 1e-6) continue;
          const q = (xs + (ay - top) * slant - ax) / den; if (q < 0 || q > 1) continue;
          const y = ay + (by - ay) * q; if (y > top && y < yl) { yl = y; onSurf = true; }
        }
        const age = t - ts, yHead = top + age * v, xl = X(yl);
        if (n === n0 && yHead - len < Math.min(yl, vy1 + len)) {   // the streak, cut where it lands
          const yh = Math.min(yHead, yl), yt = Math.max(top, yHead - len);
          if (yh - yt > 2 && yh > vy0 - 10 && X(yh) > Math.max(vx0, X0) - 30 && X(yh) < Math.min(vx1, X1) + 30)
            paint(ribbon([[X(yt), yt], [X((yt + yh) / 2), (yt + yh) / 2], [X(yh), yh]], w * .2, w), { wash: c, ink: null });
        }
        if (!isFinite(yl) || xl < X0 || xl > X1 || xl < vx0 - 60 || xl > vx1 + 60 || yl < vy0 - 60 || yl > vy1 + 60) continue;
        const a = age - (yl - top) / v, pud = !onSurf && puddles.find(([cx, cy, rx, ry]) => ((xl - cx) / rx) ** 2 + ((yl - cy) / ry) ** 2 < .8);
        const life = pud ? .5 : .2, s = size * lerp(.45, 1.1, z);
        if (a >= 0 && a < life) splashes.push({ x: xl, y: yl, k: a / life, s, z, pud, c });
      }
    }
    // splashes after all the streaks, far ones first
    splashes.sort((p, q) => p.z - q.z);
    for (const sp of splashes) {
      if (sp.pud) {
        const [cx, , rx] = sp.pud, room = Math.max(2, Math.min(sp.x - (cx - rx), cx + rx - sp.x) * .9);
        ringOn(sp.x, sp.y, Math.min(20 * sp.s, room), sp.k, splashCol, puddleCol, sp.s);
        if (sp.k < .35) crown(sp.x, sp.y, sp.s * .6, sp.k / .35, splashCol, false);
      } else crown(sp.x, sp.y, sp.s, sp.k, sp.z > .5 ? splashCol : mixCol(colFar, splashCol, .5), sp.z > .75);
    }
  }

  // A puddle on the ground: dark water with a paler band of reflected sky and a thin dark near edge.
  // p = [cx, cy, rx, ry]; o.col: the water; o.sky: the reflection; o.key: its boil seed (default its position).
  rain.puddle = (p, o = {}) => {
    const [cx, cy, rx, ry] = p, col = o.col ?? PUDDLE, sky = o.sky ?? mixCol(col, PAL.cream, .45);
    boilSeed(o.key ?? 'puddle ' + cx + ' ' + cy);
    paint(ellPts(cx, cy, rx, ry, 30, ry * .06), { wash: col, ink: null });
    paint(ellPts(cx - rx * .22, cy - ry * .12, rx * .45, ry * .22, 18, ry * .04, -.04), { wash: sky, ink: null });
    const E = []; for (let i = 0; i <= 14; i++) { const a = .2 + (Math.PI - .4) * i / 14; E.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    inkLine(E, clamp(ry / 30, .4, .9), mixCol(col, PAL.ink, .55), 'inkfine', .5);
  };
  return rain;
})();
