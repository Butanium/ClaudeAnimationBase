// lib/debug/check_loop.mjs: check a loop (or the film) in node in about a second, without rendering. p5 and p5.brush are
// stubbed, so nothing is drawn: it catches what makes a render fail or misbehave, with a stack into your code.
// Use: node lib/debug/check_loop.mjs --use=lib/rooms/room.js,lib/rooms/room.demo.js --loop=rooms/room --sheet=0.5,2,3.5
//        (the same --use / --loop / --sheet / --strip=a:b flags as render.mjs; no --loop = the film in studio.html;
//        --draft = as with ?draft). Exit code 1 if any frame has a problem.
//   Per frame it prints the cost (paint, inkLine, watercolour fills, glow, clip calls) and any problem: an invalid
//   colour (e.g. '#aN' from a NaN, which kills the page with "Invalid color string"), a NaN/Infinity point (throws
//   "Failed to construct 'OffscreenCanvas'"), an exception, push/pop left unbalanced, a camBegin() without camEnd(),
//   a clip inside a clip, Math.random() (use hash), and frames that differ when drawn twice (not a pure function of t).
// Expects: run from the kit root (it reads studio.html for the engine scripts). Node only, no browser.
// Source: made for the asset library, 2026-09-25, by painter-rooms (Claude).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

Error.stackTraceLimit = 40;
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const FPS = 24;
let times = args.sheet || args.t ? String(args.sheet || args.t).split(',').map(Number) : [0, .5, 1, 2];
if (args.strip) { const [a, b] = String(args.strip).split(':').map(Number); times = []; for (let i = Math.round(a * FPS); i <= Math.round(b * FPS); i++) times.push(i / FPS); }
const engine = [...readFileSync('studio.html', 'utf8').matchAll(/<script src="(src\/[^"]+)"/g)].map(m => m[1]);
const files = [...engine, ...(args.use ? String(args.use).split(',').filter(Boolean) : [])];

// ---------- stubs ----------
let problems = [], trace = [], depth = 0, randomCalls = 0;
const n = { paint: 0, inkLine: 0, fill: 0, glow: 0, clip: 0 };
const where = () => {   // the first stack frames outside this file and core.js's wrappers: where the bad value came from
  const fr = new Error().stack.split('\n').slice(2).map(s => s.trim()).filter(s => !s.includes('check_loop.mjs') && !s.includes('node:') && !s.includes('evalmachine'));
  const mine = fr.filter(s => !/src\/core\.js/.test(s));
  return (mine.length ? mine : fr).slice(0, 3).join(' < ');
};
const bad = msg => problems.push(`${msg} @ ${where()}`);
const isCol = c => typeof c === 'string' ? /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c) || /^(rgba?|hsla?)\(/.test(c) : Array.isArray(c) || typeof c === 'number' || (c && typeof c === 'object');
const col = (what, c) => { if (!isCol(c)) bad(`invalid colour in ${what}: ${JSON.stringify(c)}`); };
const pt = (what, x, y) => { if (!Number.isFinite(x) || !Number.isFinite(y)) bad(`non-finite point in ${what}: (${x}, ${y})`); };
let seed = 1;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const brush = new Proxy({}, { get: (_, k) => (...a) => {
  trace.push(k + JSON.stringify(a).slice(0, 80));
  if (k === 'wash' || k === 'fill' || k === 'stroke') col('brush.' + k, a[0]);
  if (k === 'set') col('brush.set', a[1]);
  if (k === 'fill' && !(a[0] === '#000000' && a[1] === 1)) n.fill++;   // not flushBrush()'s one-pixel flush
  if (k === 'polygon' || k === 'spline') for (const p of a[0] || []) pt('brush.' + k, p[0], p[1]);
  if (k === 'vertex' || k === 'line' || k === 'rect' || k === 'circle') pt('brush.' + k, a[0], a[1]);
} });
const noop = () => {};
const ctx = {
  console, Math: Object.create(Math, { random: { value: () => { randomCalls++; return .5; } } }), brush, performance,
  window: {}, document: { createElement: () => ({ getContext: () => new Proxy({}, { get: () => noop }) }) },
  location: args.draft ? { search: '?draft' } : undefined,
  random: (a, b) => { const r = rnd(); return a === undefined ? r : Array.isArray(a) ? a[Math.floor(r * a.length)] : b === undefined ? r * a : a + r * (b - a); },
  randomSeed: s => { seed = (Math.abs(Math.floor(s)) % 2147483646) + 1; }, noiseSeed: noop, noise: () => .5,
  translate: noop, rotate: noop, scale: noop, resetMatrix: noop, applyMatrix: noop,
  endClip: noop,
  noStroke: noop, stroke: noop, strokeWeight: noop, noFill: noop, fill: noop, beginShape: noop, endShape: noop, CLOSE: 'close',
  vertex: (x, y) => pt('vertex', x, y), rect: (x, y) => pt('rect', x, y), ellipse: (x, y) => pt('ellipse', x, y),
  color: c => { col('color()', c); return c; }, red: () => 0, green: () => 0, blue: () => 0, alpha: () => 255,
  tint: noop, noTint: noop, blendMode: noop, image: noop, imageMode: noop, ADD: 'add', BLEND: 'blend', MULTIPLY: 'multiply', CENTER: 'center',
  createGraphics: () => new Proxy({}, { get: () => noop }), textFont: noop, textSize: noop, text: noop,
};
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
for (const f of files) {
  try { vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f }); }
  catch (e) { console.log(`cannot load ${f}: ${e.message}`); process.exit(1); }
}
// count the kit's calls, and track clip nesting through push/pop (a clip ends at the pop that closes its push)
vm.runInContext(`{ const p = paint, l = inkLine, g = glow; paint = (...a) => { __n.paint++; return p(...a); }; inkLine = (...a) => { __n.inkLine++; return l(...a); }; glow = (...a) => { __n.glow++; return g(...a); }; flushLetters = () => { LETTERS = []; }; }`, Object.assign(ctx, { __n: n }));
const clipAt = [];
ctx.push = () => { depth++; };
ctx.pop = () => { depth--; while (clipAt.length && clipAt[clipAt.length - 1] > depth) clipAt.pop(); };
ctx.beginClip = () => { n.clip++; if (clipAt.length) bad('clip inside a clip (p5 has one clip level)'); clipAt.push(depth); };
if (args.loop) {
  const ok = vm.runInContext(`typeof LOOPS !== 'undefined' && !!LOOPS[${JSON.stringify(args.loop)}]`, ctx);
  if (!ok) { console.log(`no loop named "${args.loop}" (did --use load its demo?)`); process.exit(1); }
  vm.runInContext(`window.LOOP = LOOPS[${JSON.stringify(args.loop)}]`, ctx);
}

// one frame, as core.js's draw() runs it; returns the brush-call trace
const frame = t => {
  trace = []; problems = []; depth = 0; clipAt.length = 0; randomCalls = 0; for (const k in n) n[k] = 0;
  try {
    vm.runInContext(`T = ${t}; LETTERS = []; CAM = LAST_CAM = null; BOILN = Math.floor(T * BOIL); CLAWD_N = 0; boilSeed('frame'); drawWorld(T); __cam = CAM;`, ctx);
    if (window_cam()) problems.push('camBegin() without camEnd() (CAM still set after the frame)');
  } catch (e) { problems.push(`exception: ${e.message} @ ${(e.stack || '').split('\n').slice(1, 4).map(s => s.trim()).join(' < ')}`); }
  if (depth !== 0) problems.push(`push/pop unbalanced by ${depth} after the frame`);
  if (randomCalls) problems.push(`Math.random() called ${randomCalls}× (frames must be pure functions of t: use hash(i))`);
  return trace.join('\n');
};
const window_cam = () => args.loop && ctx.__cam;
let failed = 0;
for (const t of times) {
  const a = frame(t), stats = `paint ${n.paint}  inkLine ${n.inkLine}  fills ${n.fill}  glow ${n.glow}  clips ${n.clip}`, first = [...new Set(problems)];
  const b = frame(t);
  if (a !== b && !first.some(p => p.startsWith('exception'))) first.push('drawn twice, the frame differs: state carried between frames, or randomness not seeded per frame');
  if (first.length) failed++;
  console.log(`t=${t.toFixed(3)}  ${stats}${first.length ? '\n  ' + first.slice(0, args.verbose ? 50 : 8).join('\n  ') : '  ok'}`);
}
process.exit(failed ? 1 : 0);
