// lib/camera/whip_pan.js: a whip pan: the camera flicks sideways, the frame smears into speed streaks, and the cut
// hides in the blur.
// Use: p runs 0 → 1 across the seam and the cut is at p = .5 (the frame is fully smeared for p ≈ .44–.56). Both shots
//   call both parts with the same options; D = the whip's length (≈ .4–.6 s):
//     end of shot A:   const p = seg(lt, dur - D / 2, dur + D / 2);   start of shot B:   const p = .5 + lt / D;
//     const w = whipPan.cam(p, o);  camBegin(cx + w.dx, cy + w.dy, zoom * w.zoom, w.rot);  ...  camEnd();  whipPan(p, o);
//   whipPan.cam(p, o) → { dx, dy, zoom, rot }: a small counter-move (anticipation), the flick, and in shot B the arrival
//     from the other side with a slight overshoot and settle. dx/dy are world px (pass o.zoom = the shot's zoom).
//   whipPan(p, o) paints the smear in SCREEN space: speed lines first, then streaks of the scenes' own colours that
//     thicken into full cover; their colours drift from shot A's to shot B's across the cut.
//   o: dir 'right' | 'left' | 'up' | 'down' (where the camera goes; default 'right'), dist (screen px the camera
//     travels on each side, 1400), zoom (1), a / b: the two shots' colours across the streaks, as stops
//     [[0, top], [.6, horizon], [1, bottom]] (left → right for 'up'/'down'), n (streak bands, 11), antic (.05),
//     roll (.025), ink (speed-line colour), seed.
// Expects: nothing beyond core. Screen-space overlay; the camera part works at any zoom.
// Source: made for the asset library, 2026-09-25, by painter-camera (Claude).
function whipPan(p, o = {}) {
  if (p <= 0 || p >= 1) return;
  const horiz = !['up', 'down'].includes(o.dir), s = ['left', 'up'].includes(o.dir) ? -1 : 1, seed = o.seed || 0;
  const L = horiz ? W : H, A = horiz ? H : W, n = o.n || 11, pitch = A / n;
  const at = (u, v) => horiz ? [W / 2 + u, v] : [v, H / 2 + u];            // u along the motion (from the centre), v across
  const profA = o.a || [[0, PAL.sky], [.62, PAL.cream], [.66, PAL.sap], [1, PAL.sap]], profB = o.b || profA;
  const colAt = (prof, v) => {
    const k = clamp(v / A); let i = 0; while (i + 1 < prof.length - 1 && k > prof[i + 1][0]) i++;
    const [k0, c0] = prof[i], [k1, c1] = prof[Math.min(i + 1, prof.length - 1)];
    return k1 > k0 ? mixCol(c0, c1, (k - k0) / (k1 - k0)) : c0;
  };
  // each streak takes shot A's or shot B's colour (never their average, which goes muddy), flipping one by one
  const mixAB = ease(seg(p, .3, .7)), col = (v, h) => colAt(h < mixAB ? profB : profA, v);
  // coverage 0..1: rises through shot A's half, full around the cut, falls away in shot B's half
  const c = p < .5 ? ease(seg(p, .1, .44)) : 1 - ease(seg(p, .56, .9));
  const lines = p < .5 ? seg(p, .02, .3) : 1 - seg(p, .72, .98);        // speed lines lead in and trail out
  const q = p - .5;                                                      // the image slides against the camera
  boilSeed('whipPan');

  // speed lines: thin dark strokes, under the streaks (they show before the smear and as it clears)
  const nl = Math.round(16 * lines), inkC = o.ink || PAL.ink;
  for (let i = 0; i < nl; i++) {
    const v = hash(seed + i * 7.3) * A, len = L * (.18 + .35 * hash(seed + i * 3.1)) * (.6 + .8 * lines);
    const u0 = (hash(seed + i * 5.9) - .5) * L * 1.2 - s * q * L * 2.2;
    inkLine([at(u0 - len / 2, v), at(u0, v + jit(1.5)), at(u0 + len / 2, v)], .45 + .5 * hash(seed + i), mixCol(inkC, col(v, hash(seed + i * 4.4)), .35), 'inkfine', .2);
  }
  // streak bands: spindles that lengthen and thicken until they fuse into full cover
  for (let i = 0; i < n; i++) {
    const th = .6 * hash(seed + i * 1.37 + 5), k = clamp((c - th) / (1 - th));
    if (k <= .02) continue;
    const v = (i + .5) * pitch + (hash(seed + i * 2.1) - .5) * pitch * .4 * (1 - k);
    // at k = 1 the frame sits in the thick part of the spindle (tail pushed off-screen), so neighbours overlap everywhere
    const half = pitch * lerp(.1, 1, k) + (i === 0 || i === n - 1 ? pitch * .5 * k : 0);
    const len = L * lerp(.25, 2.2, k), uc = ((hash(seed + i * 4.3) - .5) * L * .9 - s * q * L * 1.8) * (1 - k) + s * .35 * L * k;
    const base = col(v, hash(seed + i * 11.7)), tone = hash(seed + i * 9.1);
    const bc = tone < .6 ? mixCol(base, PAL.cream, .08 + .12 * tone) : mixCol(base, PAL.ink, .03 + .05 * tone);
    // a blunt head where the image is going and a long tapering tail behind it
    const m = 14, top = [], bot = [];
    for (let j = 0; j <= m; j++) {
      const f = j / m, g = s > 0 ? f : 1 - f, w = half * Math.pow(clamp(g / .1), .5) * Math.pow(1 - g, .6), wig = Math.sin(f * 7 + i * 1.9) * pitch * .06;
      top.push(at(uc - len / 2 + len * f, v - w + wig + jit(2)));
      bot.push(at(uc - len / 2 + len * f, v + w + wig + jit(2)));
    }
    paint(top.concat(bot.reverse()), { wash: bc, washOp: 255, ink: null });
  }
  // dry-brush drag marks on top: lighter and darker streaks inside the smear, the paint's own texture
  const nd = Math.round(22 * c);
  for (let i = 0; i < nd; i++) {
    const v = hash(seed + i * 6.7 + 1) * A, len = L * (.2 + .4 * hash(seed + i * 8.3)) * (.5 + c);
    const u0 = (hash(seed + i * 2.9) - .5) * L - s * q * L * 1.4 * (1 - c * .6);
    const cv = col(v, hash(seed + i * 5.2)), tc = hash(seed + i * 3.3) < .7 ? mixCol(cv, PAL.cream, .3) : mixCol(cv, PAL.ink, .12);
    inkLine([at(u0 - len / 2, v), at(u0, v + jit(3)), at(u0 + len / 2, v)], .5 + .8 * hash(seed + i * 1.1), tc, 'dry', .2);
  }
}
// The camera part: add to the camBegin of whichever shot is on screen.
whipPan.cam = (p, o = {}) => {
  const horiz = !['up', 'down'].includes(o.dir), s = ['left', 'up'].includes(o.dir) ? -1 : 1;
  const dist = (o.dist ?? 1400) / (o.zoom || 1), antic = o.antic ?? .05, roll = o.roll ?? .025;
  let d = 0, e = 0;
  if (p > 0 && p < .5) {
    const k = p * 2;
    const go = seg(k, .2, 1) ** 2;   // the image visibly starts to slide before the smear takes over
    d = dist * go - dist * antic * Math.sin(Math.PI * seg(k, 0, .45));
    e = go;
  } else if (p >= .5 && p < 1) {   // arrive from the far side, still sliding as the smear clears; overshoot a hair, settle
    const k = (p - .5) * 2;
    d = -dist * (1 - k) ** 3 + dist * .02 * Math.sin(Math.PI * k) * k * k;
    e = (1 - k) ** 2;
  }
  return { dx: horiz ? s * d : 0, dy: horiz ? 0 : s * d, zoom: 1 + .05 * e, rot: s * roll * e };
};
