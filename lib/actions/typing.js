// lib/actions/typing.js: Clawd types: each hand taps on its own rhythm (never both at once), in bursts with thinking
// pauses, a return-key slam from the right hand at the end of each line, the body bobbing into it.
// Use: clawd(x, y, u, typing(t, o, { top: (y - d.topY) / d.u })). o is the option object to build on (an emotion): typing
//   owns the arms and adds to o's dy / sq / rot. It returns o plus `keysK` 0..1 (hands on the keys right now): pass it as
//   desk.js's `typing` so the keys dip only while the hands tap.
//   top: the key surface's height above Clawd's ground point, in u; the fists land on it whatever the body does (with
//     lib/rooms/desk.js: 5.2 at d.sit, the at-work staging, and 3.2 at d.behind, facing out; that's the default 5.2).
//   t0 / t1: when typing starts and stops (the hands hover before and after); rate: taps per beat per hand (default 1.6);
//   line: beats per typed line (default 3; each ends with the slam); pause 0..1: the share of lines skipped as thinking
//   pauses (default .25); lift 0..1: how high the hands rise (default 1); seed.
// typing.typed(t, opts): seconds of actual typing up to t (pauses excluded). Feed it to the screen, e.g. desk.js
//   `content: (x, y, w, h) => DESK.code(typing.typed(t, opts), x, y, w, h, {...})`, so the code stops when the hands do.
// Expects: core + clawd. Works in every view (back and front read best). World space.
// Source: made for the asset library, 2026-09-25, by painter-actions (Claude).
const typing = (() => {
  // 16th-note grid. A line is `line` beats; its last two 16ths are the slam; some lines are pauses.
  const grid = (s, e) => {
    const n = Math.max(2, Math.round((s.line ?? 3) * 4)), li = Math.floor(e / n), k = e - li * n;
    const on = hash(li * 3.71 + (s.seed || 0) * 1.3) >= (s.pause ?? .25);
    return { n, k, on, slam: on && k >= n - 2 };
  };
  // does hand h (0 = L, 1 = R) strike at the start of 16th e? The two hands take turns, with gaps: no twinning.
  const strikes = (s, e, h) => {
    const g = grid(s, e), p = clamp((s.rate ?? 1.6) / 4);
    if (!g.on || g.k >= g.n - 2 || (s.t0 != null && e * BEAT / 4 + OFF < s.t0) || (s.t1 != null && e * BEAT / 4 + OFF >= s.t1)) return false;
    const r = hash(e * 7.31 + (s.seed || 0) * 2.9), mine = (e + h) % 2 === 0;   // alternate by default, sometimes the same hand twice
    return mine ? r < .55 + p * .5 : r > 1 - p * .35;
  };
  function typing(t, o = {}, s = {}) {
    const top = s.top ?? 5.2, lift = s.lift ?? 1, bp = bpOf(t) * 4, e = Math.floor(bp), f = bp - e;
    const g = grid(s, e), live = (s.t0 == null || t >= s.t0) && (s.t1 == null || t < s.t1), work = live && g.on;
    const hover = live ? (work ? 0 : .12) : .2;                                      // resting just above the keys when not typing
    // a hand's height (radians of arm angle above resting on the keys): it rises through the 16th before a strike and
    // comes down on the beat of the strike, then presses in a little
    const handUp = h => {
      const next = strikes(s, e + 1, h), now = strikes(s, e, h);
      return (next ? .42 * lift * Math.pow(Math.sin(Math.PI * seg(f, .25, 1)), .8) : 0) - (now ? .07 * (1 - f) : 0);
    };
    let up = [handUp(0), handUp(1)];
    // the slam: the right hand winds up high over the last two 16ths of a line and comes down at the line's end
    if (live && g.slam && g.k === g.n - 2) up[1] = .95 * lift * Math.sin(Math.PI * .5 * seg(f, .1, 1));
    if (live && g.slam && g.k === g.n - 1) up[1] = .95 * lift * Math.cos(Math.PI * .5 * easeIn(f));
    const slamT = live && g.k === 0 && grid(s, e - 1).slam ? f * BEAT / 4 : -1;           // just landed a slam
    // body: bobs into the taps, a jolt on the slam, a small lean toward the busy hand, leans back while thinking
    const tapK = (strikes(s, e, 0) || strikes(s, e, 1)) ? Math.exp(-6 * f) : 0;
    const slamK = slamT >= 0 ? Math.exp(-7 * slamT) * Math.cos(20 * slamT) : 0;
    const think = live && !g.on ? Math.sin(Math.PI * (g.k + f) / g.n) : 0;           // a thinking pause: sit back a little
    const dy = (o.dy || 0) * .3 + .08 * tapK + .15 * slamK - .2 * think;
    const sq = (o.sq || 0) + .025 * tapK + .09 * slamK - .03 * think;
    const rot = (o.rot || 0) * .5 + .02 * (up[0] - up[1]);
    // aim each fist at the key surface: the arm's pivot height moves with dy and squash
    const sy = 1 - sq - (o.take || 0), pivotH = 4.5 * sy - dy, rest = Math.asin(clamp((top + .35 - pivotH) / (2.05 * sy), -.95, .95));
    const [aL, aR] = [0, 1].map(h => rest + hover + Math.max(-.07, Math.min(up[h], 1.1 - rest)));   // capped: a raised arm would hide behind the body
    return { ...o, dy, sq, rot, aL, aR, keysK: work ? 1 : 0 };
  }
  typing.typed = (t, s = {}) => {                   // seconds of typing so far: count the working 16ths from t0
    const t0 = s.t0 ?? 0, end = Math.min(t, s.t1 ?? Infinity), q = BEAT / 4;
    let sum = 0;
    for (let e = Math.floor(bpOf(t0) * 4); e * q + OFF < end; e++) {
      if (!grid(s, e).on) continue;
      const a = Math.max(t0, e * q + OFF), b = Math.min(end, (e + 1) * q + OFF); if (b > a) sum += b - a;
    }
    return sum;
  };
  return typing;
})();
