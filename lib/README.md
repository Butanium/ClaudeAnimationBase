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

### rooms/ — interiors and town

### weather/ — weather and particles

| file | what it's for | use | source |
|---|---|---|---|
| [`rain.js`](weather/rain.js) | Rain in depth (far streaks thin and pale, near ones long), slanted by the wind, with crown splashes on the ground or any surface (a head, a roof) and rings on puddles; day or night colours; intensity can ramp over time without drops popping. World space, stays put under a panning camera. | `rain(t, {intensity, wind, ground, surfaces, puddles, night, layer: 'far' / 'near'})` around the characters; `rain.puddle([cx, cy, rx, ry])` | made for the library, 2026-09-25, painter-weather |
| [`dust.js`](weather/dust.js) | Cartoon dust for acting: a landing puff that rolls out both ways with flying specks, a skid trail along a sliding foot, a run's wind-up (spinning feet throw dust back) and the cloud left hanging at launch. Puffs grow, roll and shrink away; each event is one cloud with one inked silhouette. World space. | `dust.land(t, t0, x, y)`, `dust.skid(t, t0, t1, s => footXY)`, `dust.kick(t, t0, t1, footXY, dir)`; `dust.cloud(puffs)` for your own | made for the library, 2026-09-25, painter-weather |

### cast/ — secondary characters

### actions/ — Clawd actions and held props

### camera/ — camera moves and transitions

### sound/ — sound-synced patterns

### imported/ — adapted from other people's kits (licence in each header)

### Elsewhere (link only: no licence, or not code)

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
