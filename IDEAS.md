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
