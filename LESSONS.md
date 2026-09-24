# Lessons

Read ANIMATION_GUIDE.md first. This file collects what we learned using the kit, general lessons first, then per
film. Add to it when a film ends, or as soon as something costs you an hour.

## General

### Looking at your work
- A thumbnail sheet hides small marks. Confirm anything that "isn't there" with a full-resolution crop
  (`--crop=x,y,w,h`): twice a mark turned out to be drawn but invisible (see pigment, below).
- Viewers notice what code-side checks don't: a looping walk whose splashes don't line up with feet, a small
  reframing at a cut, a scene that doesn't connect. Get a first audience early (render the whole film with sound).

### p5.brush traps
- **Light over dark can vanish.** p5.brush mixes colour like pigment, so depending on the colours a pale ink line
  over darker paint disappears (see the zoom bullet below for the colours tested). Paint light marks (ripples, foam,
  highlights on dark ground) as thin **washes**, e.g. `paint(ribbon(points, w0, w1), { wash: col, ink: null })`;
  use `glow()` for real light.
- **Big watercolour `fill`s bleed across the frame** (a fill over a very large rectangle smeared into the sky).
  Use `wash` for large areas; keep `fill` for small textured shapes.
- A translucent wash (`washOp` < 255) mixes like pigment too: a "water patch" painted over a character never
  matches the water around it. To hide what's under water (or behind anything), don't draw it: clip it.
- **Strokes far from the origin vanish under a zoomed camera** (p5.brush 2.2.3). From zoom ~2, a `paint()` outline
  or an `inkLine()` at world x ≈ 2300 left only a dot at its first vertex; drawn after `translate()` to its own
  centre, the same shape kept its outline at every zoom. `paint()` and `inkLine()` in core.js now draw every shape
  around its own centre (`centred()`). Shapes much bigger than the canvas still lose their outline: draw such edges
  as `inkLine`s no bigger than the canvas. This bug is what made marks show only their two ends as dots, and closed
  spline outlines only their endpoints (tested: fine at zoom 1–1.5 even far from the origin, a dot at 2.2 unless
  centred). Pigment mixing is a separate effect: a cream line over a navy bar vanished at zoom 1.6 with outlines
  fine, while pale #EEF7F3 over dark teal survived.
- **A NaN coordinate in a polygon throws** "Failed to construct 'OffscreenCanvas': Value is not of type 'unsigned
  long'", with a stack that points at the shot, not the NaN (Plink's came from `Math.acos` of a ratio > 1).
- **Outline weight scales with the camera's zoom.** A fine outline at zoom 1.3 makes a small drop a dark speck at
  zoom 3: keep the on-screen weight (`sw × min(1, 1.6/zoom)`), and give shapes a few px wide a paler outline.
- Every `paint` call costs; hundreds per frame are fine. Cap particle counts (e.g. sort by importance).

### Patterns
- **Sync by construction.** When the soundtrack is generated (e.g. synthesized from events), export the events'
  timing and geometry to a data file the scene reads, and paint each event from that data. No hand-syncing.
- **One timeline, two readers.** Keep shot starts and named beats in a JSON file read by both the sound generator
  and the scene (`beat('C.land')`), so moving a beat moves the picture and the sound together.
- **Legs (or any part) through the `draw` hook.** `noLegs: true` + drawing the legs yourself in `draw()` lets a foot
  reach, dip, dangle, and lets legs be cut at a line (a waterline). Reproduce the kit's side-view walk formula to
  phase-lock steps to footfall times (a leg pair touches down at walk = 0.25 + k/2).
- **Continuous camera over small reframes.** A cut that changes the framing only a little reads as a glitch. Keep
  the camera continuous, or make the cut a clearly different shot.
- **A foot's splash only reads if the foot is planted in world space.** The kit's walk slides the legs with the
  body; solve each leg for a fixed world point instead (Plink's `reachFor`/`legSole` in lib/plink/legs.js). In side
  view a lifted foot needs clear water or air under it: step a far leg together with its near partner.
- **A tiny event needs a close-up of its cause** (a 12 px drop at a medium framing is invisible).
- **Hold the look before the move:** a character "remembering" something needs ~0.4 s of looking while the thing
  glints; 0.15 s didn't read.
- **Time every shot from its own start (`lt`, `dur`) or from named beats, never absolute seconds**, so retiming the
  film is a timeline edit.
- **Ink only the edges seen against the air.** Closed outlines on water turned a splash's lip into a pot. Paint drops
  first and the water sheet over them, so they appear as they fly clear; put footfall splashes in front of the
  character (behind, its body hides them). A column rising straight behind a head reads as an antenna.
- **Parallel agents on one film:** split the scene into files with one owner each, share constants through one
  namespace object, let people request cross-cutting things (e.g. sounds) through the shared timeline file. A
  supervisor merges in a fixed order and regenerates generated files after each merge (take either side of their
  conflicts). Teammates merge the main branch in whenever something lands, so they check against the real thing.
  A take handed between two owners' shots: the earlier shot exports its camera and pose functions, the later
  one blends the camera over ~1 s.

## Films

### Plink (2026-09-23) — ~/claude-playgrounds/water-step/animation
Clawd crosses a stream; the soundtrack is synthesized from bubble physics (../synth) and every droplet, bubble
and ring is painted from the same events. First audience notes on v1: the paw touch had no sound of its own; the
trot read as a looping walk with splashes at arbitrary moments (cause → effect must read: the foot visibly comes
down into its splash); a small camera change between two shots looked like a glitch; only water made sounds while
lots else happened on screen; the last scene felt disconnected from the story.
Round 2 (five Claude instances: sound, trot, splash, story, and a supervisor) fixed all five: v2 is 27.2 s with a
tuned-bubble melody and cartoon sounds, all synthesized. Reusable code: `lib/plink/`. The film's own lessons, in
detail: its `animation/LESSONS.md` (public copy: https://github.com/Butanium/plink).
