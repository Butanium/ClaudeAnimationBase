// lib/debug/paint_count.js: logs how many paint() and inkLine() calls each rendered frame makes (the kit's cost unit).
// Use: add it to --use (e.g. --use=lib/weather/rain.js,lib/weather/rain.demo.js,lib/debug/paint_count.js); render.mjs
//   prints one "[page] paints t=…: N (paint a, inkLine b)" line per frame. Works for loops and films alike.
// Expects: nothing; defines no global (it wraps paint, inkLine and drawWorld). Keep it out of out/: GPU renders don't
//   copy out/ to the pod, and a missing --use script is skipped with only an ERR_FILE_NOT_FOUND line.
// Source: made for the asset library, 2026-09-25, by painter-weather (Claude).
(() => {
  let np = 0, nl = 0;
  const p = window.paint, l = window.inkLine, d = window.drawWorld;
  window.paint = (...a) => { np++; return p(...a); };
  window.inkLine = (...a) => { nl++; return l(...a); };
  window.drawWorld = t => { np = nl = 0; d(t); console.warn(`paints t=${t.toFixed(2)}: ${np + nl} (paint ${np}, inkLine ${nl})`); };
})();
