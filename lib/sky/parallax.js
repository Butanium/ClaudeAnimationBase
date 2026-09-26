// lib/sky/parallax.js: depth layers under the kit's camera (multiplane): a layer at depth d moves d times as far as the
// world when the camera pans, and zooms 1 + (zoom − 1)·d, like a camera moving through flats of scenery.
// Use: const V = Parallax.begin(d); ...paint in the layer's own coordinates...; Parallax.end();
//        d: 0 = pinned to the screen, 1 = the world, > 1 = foreground (slides past faster). V = {x0, x1, y0, y1, zd}:
//        the visible rectangle in the layer's coordinates (tile endless content over it) and the layer's zoom
//        (keep outline weights at sw × min(1, 1.6 / V.zd), LESSONS).
//      Parallax.view(d) → the same rectangle without changing the transform.
//      Parallax.map(d, x, y) → where a layer-d point lands in world coordinates (e.g. to reflect the sun in water).
//      ref (last argument of each, default [W / 2, H / 2]): the camera centre at which every layer sits as authored.
// Expects: inside camBegin … camEnd (reads CAM), or no camera (then every layer is the screen).
// Source: made for the asset library, 2026-09-25, by painter-skies (Claude). Used by DaySky, Landscape, Sea.
const Parallax = (() => {
  const cam = () => CAM || { cx: W / 2, cy: H / 2, zoom: 1, rot: 0 };
  function geo(d, ref = [W / 2, H / 2]) {
    const c = cam(), zd = 1 + (c.zoom - 1) * d, lx = c.cx * d + ref[0] * (1 - d), ly = c.cy * d + ref[1] * (1 - d);
    const cs = Math.abs(Math.cos(c.rot)), sn = Math.abs(Math.sin(c.rot)), hw = (W / 2 * cs + H / 2 * sn) / zd, hh = (W / 2 * sn + H / 2 * cs) / zd;
    return { c, lx, ly, V: { x0: lx - hw, x1: lx + hw, y0: ly - hh, y1: ly + hh, zd } };
  }
  function begin(d, ref) {
    const { c, lx, ly, V } = geo(d, ref);
    push(); translate(c.cx, c.cy); scale(V.zd / c.zoom); translate(-lx, -ly);
    return V;
  }
  const end = () => pop();
  const view = (d, ref) => geo(d, ref).V;
  function map(d, x, y, ref) {
    const { c, lx, ly, V } = geo(d, ref), k = V.zd / c.zoom;
    return [c.cx + k * (x - lx), c.cy + k * (y - ly)];
  }
  return { begin, end, view, map };
})();
