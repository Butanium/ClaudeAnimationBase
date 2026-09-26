# lib: reusable pieces for films

Assets you can load into a film as they are, or copy into `src/scenes/` and adapt. Each file's header says what it is,
what it expects and where it came from.

- **Use one in a film:** add its script tag to `studio.html` after the engine scripts (`<script src="lib/weather/rain.js"></script>`),
  or copy the file into the film and change it. No design here is final (ANIMATION_GUIDE.md): adapt freely.
- **See one:** every asset has a demo loop and a render sheet next to it. Scrub the loop at
  `studio.html?use=lib/weather/rain.js,lib/weather/rain.demo.js&loop=weather/rain`, or render it:
  `./render_shared.sh --use=lib/weather/rain.js,lib/weather/rain.demo.js --loop=weather/rain --sheet=0.5,1,1.5 --out=out/check/rain.jpg`.
- `plink/` is older: snapshots of one film's scene code, meant to be copied, not loaded.

## Adding an asset (the conventions)

One asset = three files in `lib/<category>/`, plus a row in this file:

| file | what |
|---|---|
| `<asset>.js` | the asset. Defines **one** global (a function, or a namespace object for a family), named in the header; it must not reuse a kit global (`grep -n "<name>" src/*.js lib/**/*.js`). Pure functions of time, like everything in the kit: no state kept between frames, `hash(i)` for stable randomness, `boilSeed(key)` before each separate element. |
| `<asset>.demo.js` | `LOOPS['<category>/<asset>'] = t => {...}; LOOPS['<category>/<asset>'].len = <seconds>;` a small scene that shows the asset doing what it's for: in context (with Clawd when it relates to Clawd), moving, with its main options. No text (labels aren't needed: the README row says what's shown). |
| `<asset>.jpg` | the render sheet: `./render_shared.sh --use=<asset>.js,<asset>.demo.js --loop=<category>/<asset> --sheet=<4–8 times> --cols=<2–4> --w=480 --out=lib/<category>/<asset>.jpg`. Pick times that show its range. Keep it under ~400 KB. |

Header template (keep it short; the README row is the index, the header is the manual):

```js
// lib/<category>/<asset>.js: <what it is, one line>.
// Use: <signature(s) and the options that matter>.
// Expects: <kit globals beyond core/clawd/timeline, other lib files, a camera or not, screen or world space>.
// Source: <made for the asset library, 2026-09-25, by <who>> | <imported from <repo URL>@<commit>, <licence>, by <author>; what was changed>.
```

Before it merges, the asset passes LESSONS.md's p5.brush traps (light over dark as a wash, no huge `fill`s, edges
drawn in pieces no bigger than the canvas, `boilSeed` hygiene, no NaN in polygons, outline weight vs zoom) and its
sheet is looked at, at full resolution where marks are small.

Imports from other people's code: only with a licence that allows it (MIT or compatible), with the author, URL, commit and
licence in the header. No licence → no code: list the source under "Elsewhere" below as a link.

## Index

<!-- one table per category; a row per asset: | [`asset.js`](category/asset.js) | what it's for | use | source | -->

### sky/ — outdoor backdrops

| asset | what it's for | use | source |
|---|---|---|---|
| [`daysky.js`](sky/daysky.js) | the sky at any time of day from one number: graded wash, sun and moon on one arc, stars that fade in and twinkle on the beat, drifting cumulus; `DaySky.light(tod)` gives the palette to tint the ground | `DaySky.draw(t, tod, o)` first in the shot (tod 0 = midnight, .25 dawn, .5 noon, .75 dusk; animate it for a colour arc). World space with its own parallax. Sheet: night, pre-dawn, dawn, day, dusk, late dusk | painter-skies, 2026-09-25 |
| [`landscape.js`](sky/landscape.js) | an endless landscape in depth layers (snowy mountains, hills, a forest edge with fir stands, the meadow with swaying tufts and flowers, foreground grass and bushes) that slide by parallax | `Landscape.draw(t, {light: DaySky.light(tod)})` after the sky, characters at `Landscape.groundY(x)`, then `Landscape.front(t, {light})`. Demo loads `daysky.js` too. Sheet: a pan left → right, a push to zoom 1.9 on Clawd, day → dusk | painter-skies, 2026-09-25 |

### rooms/ — interiors and town

| asset | what it's for | use | source |
|---|---|---|---|
| [`room.js`](rooms/room.js) | a room to act in: wall with wainscot, plank floor, a window onto a time-of-day sky (or any sky asset, clipped to the glass) with curtains that breathe, a door that swings open onto a hall (lit or dark), a picture frame (Clawd's portrait) that swings when knocked, a clock whose second hand ticks on the beat, a shelf of books, a floor lamp that flicks on and glows, a potted plant, a rug; one `light` value darkens it all toward night | `ROOM.room(t, { tod, light, window, door, lamp, ... })` returns anchors (`standY`, `window`, `door`...); or the pieces `ROOM.wall/floor/window/door/frame/clock/shelf/rug/lamp/plant`; helpers `ROOM.swing` (door), `ROOM.flick` (lamp), `ROOM.lightOf(tod)`, `ROOM.clip(pts, fn)` | made for the library, 2026-09-25 |
| [`desk.js`](rooms/desk.js) | Clawd at the computer: a desk sized from Clawd's `u`, a monitor that types and scrolls painted code (no letters) and flashes a pass/fail verdict, or its back for reverse shots (its light spills onto Clawd), keys that dip while typing, a steaming mug, a pencil cup, a stool or office chair; exported seat/stand/keyboard/screen anchors for sitting and typing poses | `DESK.layout({ x, floorY, u })` → anchors; `DESK.set(t, { ..., typing, code: { stop, status: { t, ok } } })` then Clawd; pieces `DESK.desk/monitor/code/keyboard/mug/cup/stool` | made for the library, 2026-09-25 (demo loads `room.js` too) |

### weather/ — weather and particles

| file | what it's for | use | source |
|---|---|---|---|
| [`rain.js`](weather/rain.js) | Rain in depth (far streaks thin and pale, near ones long), slanted by the wind, with crown splashes on the ground or any surface (a head, a roof) and rings on puddles; day or night colours; intensity can ramp over time without drops popping. World space, stays put under a panning camera. | `rain(t, {intensity, wind, ground, surfaces, puddles, night, layer: 'far' / 'near'})` around the characters; `rain.puddle([cx, cy, rx, ry])` | made for the library, 2026-09-25, painter-weather |
| [`dust.js`](weather/dust.js) | Cartoon dust for acting: a landing puff that rolls out both ways with flying specks, a skid trail along a sliding foot, a run's wind-up (spinning feet throw dust back) and the cloud left hanging at launch. Puffs grow, roll and shrink away; each event is one cloud with one inked silhouette. World space. | `dust.land(t, t0, x, y)`, `dust.skid(t, t0, t1, s => footXY)`, `dust.kick(t, t0, t1, footXY, dir)`; `dust.cloud(puffs)` for your own | made for the library, 2026-09-25, painter-weather |
| [`lightning.js`](weather/lightning.js) | A lightning strike: a jagged forked bolt with an inked edge and a white-hot core that flickers like the real thing (leader, flash, dip, re-strike, decay), the clouds lit from inside behind silhouettes, a flash over the land, and the thunder's cue time (`S.thunder`) for a sound, a take or a camera rumble. All light is `glow()`. | `S = lightning.strike(t0, {from, to, delay, size})`; `lightning.sky(t, S)`, `.flash(t, S)`, `.bolt(t, S)`, `.shake(t, S, amt)` | made for the library, 2026-09-25, painter-weather |
| [`fireflies.js`](weather/fireflies.js) | Fireflies drifting on lazy loops and blinking (layered `glow()` halos over a tiny painted bug with a lit tail, faint embers between blinks); they blink on their own clocks or all together on the beat in a wave, and one can fly to a point (a head, a hand), perch blinking, and leave. Night scenes. World space. | `fireflies(t, {n, area, sync, visit: {i, t0, t1, at}})`; `fireflies.at(i, t, o)` for eyes to follow one | made for the library, 2026-09-25, painter-weather |
| [`smoke.js`](weather/smoke.js) | Steam curling up from a mug or pot (wisps that sway, thin out and pass on, one shape each) and a chimney or campfire plume (puffs that rise, swell, bend with the wind and melt, painted as one outlined cloud with `dust.cloud`); both take a wind that can gust over time. World space. Needs dust.js. | `smoke.steam(t, x, y, {w, wind})`, `smoke.plume(t, x, y, {wind})` | made for the library, 2026-09-25, painter-weather |
| [`snow.js`](weather/snow.js) | Snow in depth: flakes drifting down on swaying arcs (far ones small and slow, near ones big, some six-pointed), landing on the ground or any surface (a head) and melting in; day or night colours. `snow.cover` paints settled snow (a lumpy mound with a blue underside) on the ground, a branch, or as a cap in a `clawd()` draw hook that squashes and turns with the head; grow its depth with time. World space, stays put under a panning camera. | `snow(t, {intensity, wind, ground, surfaces, night, layer: 'far' / 'near'})`; `snow.cover(x0, x1, y, depth)` | made for the library, 2026-09-25, painter-weather |

### cast/ — secondary characters

| asset | what it's for | use | source |
|---|---|---|---|
| [`bird.js`](cast/bird.js) | a songbird in profile, same eyes as Clawd: hops, pecks, flaps, flies on arcs and lands on things (Clawd's head), sings, sleeps; acts with Clawd's emotions (the beak is its mouth, the arms become wings). Sheet: hops in, pecks, flies onto Clawd, both react, it sings; a robin sleeps, a finch crosses, a yellow bird flaps | `bird(x, y, u, { ...bird.act(t, keys), state: 'idle'\|'peck'\|'flap'\|'sing'\|'sleep'\|'fly'\|'glide', flip, seed })`; moves `bird.fly(t, t0, t1, p0, p1)`, `bird.hops(t, t0, x0, x1, n)`, `bird.peck(t, times)` | made for the library, 2026-09-25, painter-cast |

### actions/ — Clawd actions and held props

### camera/ — camera moves and transitions

| asset | what it's for | use | source |
|---|---|---|---|
| [`whip_pan.js`](camera/whip_pan.js) | whip pan between two shots: a small counter-move, the camera flicks away, the frame smears into speed streaks in both scenes' colours (the cut hides under full cover), and shot B arrives sliding and settles | `whipPan.cam(p, o)` → add to each shot's camera; `whipPan(p, o)` after `camEnd()`; p 0 → 1, cut at .5; `o.dir`, `o.a` / `o.b` colour stops | made for the library, 2026-09-25 |
| [`blot_wipe.js`](camera/blot_wipe.js) | paint-blot wipe: a first splat lands where you aim it (what threw the paint), more splats fill the frame, the cut hides under them, then the wet paint slides off down the screen (`clear: 'run'`) or soaks away from the first splat (`'soak'`) | `blotWipe(p, o)` after `camEnd()`; p 0 → 1, cut at .5; `o.x`, `o.y`, `o.cols`, `o.clear` | made for the library, 2026-09-25 |

### sound/ — sound-synced patterns

### imported/ — adapted from other people's kits (licence in each header)

What was checked and why the rest wasn't imported: [imported/SURVEY.md](imported/SURVEY.md).

| asset | what it's for | use | source |
|---|---|---|---|
| [`bianbianzhu/beach.js`](imported/bianbianzhu/beach.js) | a beach set: a palm whose fronds sway, a sea band with glints, a shoreline that laps once a bar, a parasol that opens, a volleyball, gulls, a sun with a face | `BEACH.palm(x, y, s, sway)`, `.sea(t, x0, x1, y0, y1)`, `.shoreline(t, x0, x1, y)`, `.parasol(x, y, s, open)`, `.vball(x, y, r, rot)`, `.gull(x, y, s, flap)`, `.sun(x, y, r, t, face)` | [bianbianzhu/ClaudeAnimationBase](https://github.com/bianbianzhu/ClaudeAnimationBase/tree/feb20e9) "Beach Day", MIT |
| [`bianbianzhu/ukulele.js`](imported/bianbianzhu/ukulele.js) | Clawd playing a ukulele (front view): strums on the beat, fretting hand on the neck, wordless singing, neck lift; the uke slung on the back for walks | `UKULELE.player(x, y, u, mood, { tilt, mouth: UKULELE.sing(t) })`, `UKULELE.back(u, sw, view)` in a draw hook | same |
| [`james-banks/octopus.js`](imported/james-banks/octopus.js) | a friendly coral octopus: six arms that float and curl, arms you can pose (a wave, a grab), eyes, mouths, blush | `octopus(x, y, s, { arms: [null, [-3.1, -2.2, .5]], eyes: 'happy', mouth: 'grin' })`, `octopus.armAt(...)` | [james-banks/ClaudeAnimationBase](https://github.com/james-banks/ClaudeAnimationBase/tree/e64e9bd) "Memetic Opus", MIT |
| [`james-banks/living_note.js`](imported/james-banks/living_note.js) | a living music note (eighth or half) with a face that blinks; squash, flag flutter, glow | `livingNote(x, y, s, { col, kind: 'h', eyes: 'wink', sq, flap })` | same |
| [`cromwellian/butterfly.js`](imported/cromwellian/butterfly.js) | a butterfly seen from above (flap 0..1, tilt), a timed flight path, a five-petal bloom as one outline, and that bloom worn on Clawd's head | `butterfly(x, y, s, flap, rot)`, `butterfly.path(t, keys)`, `butterfly.bloom(cx, cy, r, col, sw)`, `draw: butterfly.wornBloom(grow)` | [cromwellian/ClaudeAnimationBase](https://github.com/cromwellian/ClaudeAnimationBase/tree/d62c9c0) "The Butterfly", MIT |

### debug/ — tools for checking your work

| file | what it's for | use | source |
|---|---|---|---|
| [`paint_count.js`](debug/paint_count.js) | logs each rendered frame's paint() + inkLine() count (the kit's cost unit) as a page line (ignore the extra t=0.00 line from page setup) | add `lib/debug/paint_count.js` last in `--use` | made for the library, 2026-09-25, painter-weather |

### Elsewhere (link only: no licence, or not code)

| link | author | what it has | why link-only |
|---|---|---|---|
| [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) | John Heibel | the 156 s "I'm Upping My P(doom)" music video the kit came from: nine chapters of scene code, its own guide | no licence |
| [opus-5.5-musical-cartoon](https://github.com/az9713/opus-5.5-musical-cartoon) | az9713 | "Clawd: Mannered Prose", a 15 s musical cartoon with a synthesized score, plus a making-of journal | no licence |
| [clawd-video](https://github.com/aadil6971/clawd-video) | aadil6971 | a Claude skill/plugin that makes watercolour cartoon shorts with a soundtrack | no licence |
| [paint-mv-skills](https://github.com/lintsinghua/paint-mv-skills) | lintsinghua | agent skills that turn a song + lyrics into a watercolour music video (Chinese docs) | MIT file, but it says it follows PDoomVideo's source, which has no licence; not inspected further |

## plink/ — water, feet and a soundtrack synthesized from the same events (Plink, 2026-09-23)

Copy these into a film's `src/scenes/` and adapt them: they're snapshots of one film's code, not a maintained API.
Full film, synth and making-of: https://github.com/Butanium/plink (local: `~/claude-playgrounds/water-step`).

| file | what it gives you | expects |
|---|---|---|
| `base.js` | the `PLK` namespace: world scale (`MX(m)` metres → px, `WL` waterline, `U` Clawd's size), palette, `beat(name)` and `mark(beat, kind)` lookups into the score | a global `SCORE` (below) |
| `legs.js` | Clawd's legs drawn through the `draw` hook (`noLegs` + `withLegs(o, {lift, walk, gy})`): feet that reach, dip and dangle, legs cut exactly at the waterline, foam collars, feet planted in world space (`reachFor`/`legSole`, the inverse of `clawd()`'s transform), `legPose` reproducing the kit's side-view walk | `PLK` from base.js |
| `water_fx.js` | everything the water does, painted from the score: rings (as wash ribbons), drops on their real ballistic flights, landings, bubbles that live as long as they ring, tulip crowns that tear into the heard drops, the big splash, drips falling from feet, exit splashes, and `notes(t)` / `noteGlyph()` music notes | `PLK`, `SCORE` |

### The SCORE contract

`SCORE` is written by the soundtrack generator (Plink: `synth/score_plink.mjs`) into `src/scenes/<film>_score.js` as
`const SCORE = {...}`, loaded before the scene. It holds only events that are audible in the mix, so everything
painted from it is heard, on the frame it sounds.

| field | entries |
|---|---|
| `story` | the film's `story.json` (shots, beats, cues), so the scene reads the same timeline as the sound |
| `marks` | `{kind, t, beat, x?, ...}` one per cue, time-sorted, labelled with its beat (`step`, `exit`, `drip`, `pop`, `whoosh`, `note`, ...); steps also carry `v`, `depth`, `tBottom` |
| `notes` | `{t, note, f, r, x, beat, kind}` the melody's tuned bubbles (r = 3.26/f) |
| `drops` | `{tl, tLand, x0, vx, vz, a, front, amp}` each thrown droplet: launch time, landing time, launch x and velocity (m, m/s), radius (mm), which side of the foot, loudness |
| `falls` | `{t, x, h, a, amp, src}` drips: landing time, x, fall height |
| `bubbles` | `{t, x, r, dur, amp, src}` each audible bubble: birth, radius, ring time |

Patterns worth keeping even without the code: sync by construction (paint events from the sound's own data, never
hand-time them), one timeline read by both sound and picture, and shots timed from their own start or from beats.
The lessons behind these are in LESSONS.md.
