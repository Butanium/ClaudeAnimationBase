# clawd-kit — Clément's local copy of ClaudeAnimationBase

Upstream: https://github.com/JohnHeibel/ClaudeAnimationBase (remote `upstream`; `git pull upstream main` to update).
This copy adds what we needed to render on this machine and what we learned making films with it. It is meant to
**grow**: every art project starts from here and folds its lessons and reusable pieces back before it ends.

## Start a new film

```bash
git clone ~/tools/clawd-kit ~/claude-playgrounds/<film>/animation   # or copy it into an existing project
cd ~/claude-playgrounds/<film>/animation && npm ci
```
Read ANIMATION_GUIDE.md (the upstream rules), then LESSONS.md (ours), then storyboard before any code.

## Rendering here

**mats is borrowed hardware.** Use it only to scavenge GPU time nobody needs: an L40 is free *and* no one is
waiting for one, with at least ~1 h before the next job that needs that GPU could start. Check first:

```bash
ssh mats "sinfo -p compute -o '%n %G %t %C'; squeue -p compute -o '%.8i %.9u %.2t %.10L %.12b %R'; squeue -p compute -t PENDING --start"
```
- If jobs are PENDING for GPUs/`Resources`, or a pending job's START_TIME is within the next hour, don't take a GPU.
  (Pending jobs held by their user or blocked by a QOS limit aren't waiting for GPUs.)
- Hold for no longer than the work needs (`MINUTES=` on `remote/mats_session.sh start`, 60 by default) and release
  it as soon as you're done: `remote/mats_session.sh stop`.

**Otherwise, use a cheap RunPod GPU** (a small card is plenty: renders are WebGL, not ML). See "RunPod" below.
The CPU fallback on this box works but is slow for heavy frames.

| where | how | cost |
|---|---|---|
| mats L40, when idle capacity exists | `remote/mats_render.sh <render.mjs args>` — syncs the kit up, renders, brings `out/` back | free (borrowed); ~0.2 s/frame, a 20 s film in ~2.5 min |
| RunPod, cheap GPU pod | `remote/runpod_render.sh <render.mjs args>` — same as mats_render.sh, on a pod it starts itself | $0.24/h; ~0.2–0.4 s/frame, a 27 s film at 30 fps ≈ 6 min ≈ 3 cents |
| this box, CPU | `node render.mjs --soft-gl <args>` (SwiftShader) | free; 0.1 s to 35 s/frame (watercolour fills are slow) |

- `remote/mats_session.sh start|status|stop`: one GPU hold (60 min, `MINUTES=` to change) shared by every checkout
  on this machine (state + lock in `~/.cache/clawd-render/`); `mats_render.sh` grabs one if none is held.
- Each local checkout renders in its own folder on mats (`~/clawd-render/<parent>-<hash>`), so parallel agents in
  separate worktrees don't overwrite each other.
- Chrome reaches the L40 only with `--gpu-angle=gl-egl` (run_on_node.sh passes it) and always renders on physical
  GPU 0; run_on_node.sh refuses to render if the job doesn't hold GPU 0. `remote/gpu_probe.mjs` prints the WebGL
  renderer string if in doubt. On Linux render.mjs adds `--no-sandbox` (Ubuntu 23.10+ blocks Chrome's sandbox).

## RunPod

Status: **ready** (built and tested 2026-09-23). Nothing to set up: the scripts create the pod, and the template too
if it's missing.

```bash
remote/runpod_render.sh --sheet=1,4,8 --cols=3 --w=480 --out=out/check/sheet.jpg   # starts a pod if none is up
remote/runpod_render.sh --clip --audio=song.wav --out=out/video.mp4                 # --audio files are copied up
remote/runpod_session.sh status      # pod, GPU, $/h, idle minutes
remote/runpod_session.sh stop        # delete the pod when you're done
```
- **Billing:** `RUNPOD_API_KEY` = Clément's personal account (dumasclement2002@gmail.com). Every new pod prints the
  account it bills: if it says matsprogram.org, your session inherited a stale environment: `. ~/.secrets` and rerun
  (see `~/docs/runpod.md`). `CLAWD_RUNPOD_API_KEY` overrides the key.
- **One pod per machine**, shared by all checkouts (state + lock in `~/.cache/clawd-render/`, each checkout in its own
  folder on the pod). It stays up between renders and **deletes itself after 20 min without a render** (and 4 h
  after boot at the latest: `IDLE_MINUTES=` / `MAX_HOURS=` when it's created). Still run `stop` when done.
- **Timings (RTX 2000 Ada, Secure Cloud, $0.24/h):** create → ready in 50–100 s (depends on the host; setup ~15 s); first render
  on a pod adds ~15 s (rsync, npm ci, GPU check). Demo scene: 0.18–0.25 s/frame for sheet frames, 0.4 s/frame for
  `--clip` at 1080p (JPEG + x264 in the same loop). Same sheet on this box's CPU: 0.23, 0.16 and **38 s** per frame.
- **The GPU is checked:** the first render on each pod runs `remote/gpu_probe.mjs` and refuses to render unless
  Chrome's WebGL renderer is NVIDIA (`ANGLE (NVIDIA Corporation, NVIDIA RTX 2000 Ada Generation/PCIe/SSE2, OpenGL
  ES 3.2)` with `--use-angle=gl-egl`), not SwiftShader.
- Template `clawd-render` = `ceck30m1e4` on the personal account: `runpod/base:1.0.2-ubuntu2404` (has ffmpeg, rsync,
  sshd), `NVIDIA_DRIVER_CAPABILITIES=all`, TCP 22, no volume, start command = `remote/runpod_boot.sh`. After editing
  that file, `remote/runpod_session.sh template` pushes it. Node 22 and a pinned Chrome for Testing are installed at
  pod start by `remote/runpod_setup.sh` (pinned versions + sha256 at its top).
- GPUs: `RP_GPUS` in `remote/runpod_env.sh`, cheapest first (RTX A4000/A4500/2000 Ada/A5000/4000 Ada ≈ $0.17–0.28/h,
  then 3090/L4/A40 up to ~$0.50/h). Secure Cloud first, then Community Cloud with a public IP.

Gotchas we hit:
- `NVIDIA_DRIVER_CAPABILITIES=all` is what makes the NVIDIA runtime mount the EGL/GL/Vulkan driver libraries; they
  arrive with their vendor JSON files as **read-only** mounts (don't try to write them).
- RunPod's `<pod>@ssh.runpod.io` proxy can't rsync: the scripts use the pod's public IP and mapped TCP port 22.
- Stopping a pod wipes its container disk (everything setup installed) and a restart can come back with zero GPUs,
  so the scripts delete pods instead of stopping them.
- The account's registered SSH key isn't this box's: the scripts pass `~/.ssh/id_*.pub` into each pod.
- The idle watchdog terminates the pod through GraphQL `podTerminate`: the pod-scoped `RUNPOD_API_KEY` gets 403 from
  the REST API. Verified end to end on 2026-09-23 (`IDLE_MINUTES=1`: pod gone 43 s after it went idle).

## What's here beyond upstream

- `render.mjs`: `--soft-gl`, `--gpu-angle=vulkan|gl-egl`, `--no-sandbox` on Linux.
- `remote/`: the mats and RunPod scripts above.
- `LESSONS.md`: what we learned, film by film. Add to it.
- `lib/` (when present): reusable scene pieces from past films, each with a header saying where it came from.

## Folding back (the rule)

When a film is done (or a lesson is learned the hard way mid-film), come back here and:
1. add the lesson to LESSONS.md under the film's name, plus a line to the "general" section if it transfers;
2. move reusable code into `lib/` with a short header (what it is, which film, the API);
3. commit (this is a tooling repo: commit freely).
