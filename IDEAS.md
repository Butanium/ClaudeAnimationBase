# Ideas

Things that would make the kit easier to use, not done yet. Sign and date entries.

## One render command that picks mats or RunPod
Signed: opus-5.5 (RunPod teammate), 2026-09-23

`remote/render.sh <render.mjs args>`: run LOCAL.md's mats check (no GPU jobs pending, no pending start within the
hour, an L40 free); if it passes, `mats_render.sh`, otherwise `runpod_render.sh`. Today every session reads
LOCAL.md and makes that call by hand, and the mats rule ("only scavenged idle capacity") is easy to skip under time
pressure. Wrinkle: a mats hold already taken by this machine should count as "use mats" (`mats_session.sh status`).

## Untested on RunPod
- `--frames --workers=N` + `--encode`: on mats extra workers didn't scale (one GPU process); worth one timing on a
  pod before a long film, since `--clip` (0.4 s/frame at 1080p) serializes rendering and x264.
- `GPU_ANGLE=vulkan remote/runpod_render.sh …`: the Vulkan ICD is mounted on Secure Cloud pods, but only gl-egl was
  tried.

## Left over from the asset-library round
Signed: opus-5.5 (studio-lead), 2026-09-25

- **Frame size from PROJECT (9:16 for phones):** three forks built it independently; james-banks' is the most complete
  (`W`/`H` from PROJECT, grain vignette sized by `min(W, H)`, `#out` aspect ratio set in `setup()`). See
  lib/imported/SURVEY.md.
- **More hats from forks** (MIT): james-banks' wig and chef (with `hatRot` and a view parameter), riay3's kippah,
  bianbianzhu's straw hat and goggles.
- **One shared `act()` for secondary characters:** lib/cast/bird.js, cat.js and bug.js each repeat ~10 lines (emotion
  offset half a beat, smaller motion, own tint cross-fade) because of the one-global-per-asset rule. A helper in
  clawd.js would remove it.
- **Not built yet:** a lagging follow-cam / push-in helper (lib/camera), sound-synced cartoon SFX (a small synth + cue
  sheet, lib/sound), a drawn turn for the bug, a mug prop in `held` (desk.js has one).
- **Harvest candidates not imported:** james-banks' canary + birdcage, paper doves, quill, phone; bianbianzhu's whip-pan
  and splash-wipe and swim ring; ishallwin20's Bappa. Details in lib/imported/SURVEY.md.

## Debug hooks and a long-page check, from the stale-GPU-memory hunt
Signed: opus-5.5 (builder-b, "Strings"), 2026-09-26

- **A `--use` instrumentation template.** Every diag script in the MDS film's `tools/diag/` repeats the same 3 lines:
  p5 binds its globals on window load (after `--use` scripts run) and p5 2.x defines them **non-writable**, so
  `window.redraw = f` is silently ignored. The pattern that works: hook a `window.ready` setter (setup() sets it) and
  wrap with `Object.defineProperty(window, 'redraw', { value, writable: true, configurable: true })`. A tiny
  `tools/hook.js` exporting `onReady(fn)` / `wrapGlobal(name, f)` would save the next debugger an hour.
- **A standard "long page vs fresh page" check before any final render:** render N late frames in one page and the
  same frames each in a fresh page, diff them (max channel diff, largest blob of pixels off by > 40). Now that
  p5.brush is reseeded per boil frame, frames are functions of t and this diff is ~1 level when healthy; the MDS
  film's `tools/diag/proof.sh` + `proof_diff.py` are the starting point.

## From the "Strings" MDS film (colours + nonmetric)
Signed: opus-5.5 (builder-d), 2026-09-26

- **A NaN guard in `paint()`/`inkLine()`:** `inkLine` with a NaN point draws nothing and raises nothing (core `lerp` on
  arrays returns NaN). A dev-mode check that logs the caller once would have caught my missing chord flight on the
  first sheet instead of in a strip.
- **`armTip(x, y, u, pose, 'L'|'R')` in clawd.js:** world position of an arm tip, mirroring clawd()'s arm transform.
  Props that leave the hand (toss) or arrive in it (catch, boomerang) need it; the Strings copy is in
  act_colours_nonmetric.js.
- **A framing check in render.mjs:** at each sheet time, report when the character's box (body, arms, emote) is cut by
  the frame edge. A half-Clawd at the edge was my most frequent framing fault and is easy to compute from the camera.

## lib/sound from the "Strings" soundtrack
Signed: opus-5.5 (sound teammate, "Strings"), 2026-09-26

The "not built yet: sound-synced cartoon SFX (lib/sound)" item above now exists outside the kit, in
`~/claude-playgrounds/mds-explainer/sound/`. It has a headless `MDS.SFX` cue dump (no GPU; per-act tagging;
stale-timeline remap), 11 synthesized SFX kinds, a music bed whose chords are anchored to narration beats on the
PROJECT.bpm grid, and a ducked, -16 LUFS / -1 dBTP mix with checks. Its lessons are in that README.
Porting it would mean:
- rename `MDS.sfx` to a kit-level `sfx(t, kind, o)` in core.js;
- make the score's PLAN the per-film part (the synths and mix are generic);
- have `render.mjs --encode` call the mix, so every film gets sound from its first render.
A film without narration would anchor the chords to its own beats (TL-style) instead.
Open: only one human listen so far (Clément, on the delivered film). His notes on levels and timbres are the
calibration a future sound pass can't measure; worth writing them into sound/README.md next to the numbers.

## Two small helpers the MDS film wanted
Signed: opus-5.5 (builder-e, dims/outro of "Strings"), 2026-09-26

- **`armTip(x, y, u, pose, 'L'|'R')` in clawd.js:** where an arm tip is in world space for a front-view pose, the
  same pivot/slide/squash math `clawd()` uses. Needed whenever a prop spans both arms (a string held taut) or leaves
  one (a toss), where the `armL`/`armR` hooks don't help. A copy lives in the film's act_dims_outro.js.
- **`tl.mjs lt <shot> <local times>` and `tl.mjs word <shot> <word>[#n],…`:** print global times for shot-local
  times or spoken words, ready for `--sheet=`/`--strip=`. Every builder converts local times to global by hand (I kept
  a scratch script for it); scenes are timed from words, so sheets should be too.

## Warn when the camera sees past the painted set
Signed: opus-5.5 (builder-c, reveal/classical of "Strings"), 2026-09-26

Zooming out to fit wide content (four copies of a map) showed bare paper at the frame edge: the study's wall and
desk rects end around x -400..2300, and p5.brush seems to drop the far part of very large shapes. It only showed
up in a rendered sheet. A cheap guard: a film declares `SET = {x0, y0, x1, y1}` (what its backdrop really covers),
and `camBegin` checks the camera's view rect against it (`console.warn` with t, once per shot), which `render.mjs`
already surfaces in its log. The error then shows on the first sheet, with the time.

## From the "Strings" MDS film (open + hand)
Signed: opus-5.5 (builder-a), 2026-09-26

- **+1 for `armTip` in clawd.js:** builder-d and I each wrote our own copy of it in the same film without knowing
  about the other (act_open_hand.js and act_colours_nonmetric.js). Two copies of the same helper means the kit
  should have it.
- **Guard 2-point splines in `inkLine`:** with curvature > 0 and only two points, p5.brush draws nothing, and nothing
  errors. Every swinging string in `hand` was invisible until I found this. Fix: `pts.length < 3` → curvature 0.
- **A `lib/actions/carry` asset: a prop that follows a rule instead of keyframes.** In `open` the sack hangs from the
  arm tip by its neck and rests tilted on the desk whenever the tip is too low
  (`phi = acos(clamp((ground - tip.y) / neck))`). That single rule handles dragging, lifting and swinging, and there
  are no pops between phases. The keyframed version popped every time it switched phase.
