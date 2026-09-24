# lib: reusable pieces from past films

Copy what you need into a film's `src/scenes/` and adapt it. These are snapshots, not a maintained API: each file's
header says which film it came from.

## plink/ — water, feet and a soundtrack synthesized from the same events (Plink, 2026-09-23)

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
