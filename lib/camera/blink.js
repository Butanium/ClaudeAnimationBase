// lib/camera/blink.js: an eyelid blink: two painted lids close over the frame (a drowsy flutter, then shut), the cut
// hides behind the closed lids, and the next shot opens with a bleary wake-up flutter. Reads as someone's point of view.
// Use: blinkWipe(p, o) after camEnd(), in screen space; p 0 → 1, lids shut for p ≈ .48–.56 (cut at .5):
//     end of shot A:   if (lt > dur - D / 2) blinkWipe(seg(lt, dur - D / 2, dur + D / 2), o);
//     start of shot B: if (lt < D / 2) blinkWipe(.5 + lt / D, o);                    (D ≈ 1–1.4 s; .6 s with flutter: false)
//   o: col (lid colour; PAL.clay makes them Clawd's), cy (screen y where the lids meet, H * .56), flutter (true: a
//      half-blink before closing and a crack-open-and-droop on waking; false: one plain close and open), lashes (true),
//      crease (true), ink (rim colour).
//   blinkWipe.lids(a, o) paints the lids for an opening of a px (0 = shut, >= ~1200 = off-screen) for your own timing.
// Expects: nothing beyond core. Screen space.
// Source: made for the asset library, 2026-09-25, by painter-camera (Claude).
function blinkWipe(p, o = {}) {
  if (p <= 0 || p >= 1) return;
  const q = p < .5 ? p * 2 : (p - .5) * 2, fl = o.flutter !== false, OPEN = 1250;
  let a;
  if (p < .5) a = fl ? kf(q, [[0, OPEN], [.14, 330], [.3, 820], [.52, 700], [.96, 0]], ease) : kf(q, [[0, OPEN], [.6, 0]], easeIn);
  else a = fl ? kf(q, [[.12, 0], [.36, 300], [.5, 250], [.62, 40], [1, OPEN]], ease) : kf(q, [[.15, 0], [1, OPEN]], easeOut);
  boilSeed('blinkWipe');
  blinkWipe.lids(a, o);
}
blinkWipe.lids = (a, o = {}) => {
  if (a >= 1200) return;
  const col = o.col || mixCol(PAL.ink, PAL.clayDk, .3), ink = o.ink || PAL.ink, cy = o.cy ?? H * .56, cx = W / 2;
  const w = lerp(1150, 2700, Math.pow(clamp(a / 1200), .7));   // the opening's half-width: almond when nearly shut, wide open
  const bulge = x => Math.max(0, 1 - ((x - cx) / w) ** 2);
  const up = x => cy - a * bulge(x), lo = x => cy + .5 * a * bulge(x);     // the upper lid does most of the travel
  const xs = []; for (let i = 0; i <= 32; i++) xs.push(lerp(-80, W + 80, i / 32));
  // lower lid first: the upper lid's lashes hang over it when shut
  paint([[-120, H + 120], [-120, lo(-80)], ...xs.map(x => [x, lo(x)]), [W + 120, lo(W + 80)], [W + 120, H + 120]], { wash: mixCol(col, PAL.cream, .06), ink: null });
  paint([[-120, -120], [W + 120, -120], [W + 120, up(W + 80)], ...xs.slice().reverse().map(x => [x, up(x)]), [-120, up(-80)]], { wash: col, ink: null });
  // rims and crease, as strokes no longer than the canvas (LESSONS: huge outlines lose their strokes)
  const edge = (f, sw, c, off = 0) => { for (let s = 0; s < 3; s++) { const P = xs.slice(s * 11 - (s ? 1 : 0), s * 11 + 12).map(x => [x, f(x) + off * Math.sqrt(bulge(x))]); if (P.some(([, y]) => y > -40 && y < H + 40)) inkLine(P, sw, c, 'ink', .5); } };
  const shut = 1 - clamp(a / 260);
  edge(lo, 1.6, ink);
  edge(up, 2.6, ink);
  if (o.crease !== false) edge(up, 1.1, mixCol(col, PAL.ink, .45), -46 - 24 * shut);
  // lashes, seen from behind the eye: dark fringes hanging from the upper rim into the view (over the lower lid once
  // shut), shorter ones standing on the lower rim
  const lash = (x, y, ang, len, w0) => {
    const tip = [x + Math.cos(ang) * len, y + Math.sin(ang) * len], n = [-Math.sin(ang), Math.cos(ang)], c = len * .18 * Math.sign(Math.cos(ang) || 1);
    paint(ribbon([[x, y], [x + Math.cos(ang) * len * .55 + n[0] * c, y + Math.sin(ang) * len * .55 + n[1] * c], tip], w0, 1.5), { wash: ink, ink: null });
  };
  if (o.lashes !== false) {
    const span = Math.min(w * .8, W * .64);
    for (let i = 0; i < 15; i++) {
      const k = (i + .5) / 15, x = cx + (k - .5) * 2 * span, y = up(x), out = (k - .5) * 1.4;
      if (y > -80) lash(x, y, Math.PI / 2 - out, 58 + 26 * Math.sin(Math.PI * k) + 8 * hash(i), 10);
    }
    if (a > 25) for (let i = 0; i < 9; i++) {
      const k = (i + .5) / 9, x = cx + (k - .5) * 2 * span * .8, y = lo(x), out = (k - .5) * 1.2;
      if (y < H + 60) lash(x, y, -Math.PI / 2 + out, 26 + 12 * Math.sin(Math.PI * k), 6);
    }
  }
};
