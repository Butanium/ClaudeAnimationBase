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
