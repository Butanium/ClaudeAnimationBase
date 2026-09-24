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
| RunPod, cheap GPU pod | see below | a few cents per session |
| this box, CPU | `node render.mjs --soft-gl <args>` (SwiftShader) | free; 0.1 s to 35 s/frame (watercolour fills are slow) |

- `remote/mats_session.sh start|status|stop`: one GPU hold (60 min, `MINUTES=` to change) shared by every checkout
  on this machine (state + lock in `~/.cache/clawd-render/`); `mats_render.sh` grabs one if none is held.
- Each local checkout renders in its own folder on mats (`~/clawd-render/<parent>-<hash>`), so parallel agents in
  separate worktrees don't overwrite each other.
- Chrome reaches the L40 only with `--gpu-angle=gl-egl` (run_on_node.sh passes it) and always renders on physical
  GPU 0; run_on_node.sh refuses to render if the job doesn't hold GPU 0. `remote/gpu_probe.mjs` prints the WebGL
  renderer string if in doubt. On Linux render.mjs adds `--no-sandbox` (Ubuntu 23.10+ blocks Chrome's sandbox).

## RunPod

Status: **being built (2026-09-23).** If this line is still here, the template doesn't exist yet: build it before
rendering, so every later session only runs a script. What it needs: a pod template with Node 22, Playwright's Chromium and ffmpeg preinstalled (or installed by the
start command), plus `remote/runpod_render.sh` mirroring `mats_render.sh` (sync up, render with the GPU flags that
make headless Chrome's WebGL use the card — check with `remote/gpu_probe.mjs`, SwiftShader is not a GPU — sync
`out/` back, stop the pod). Record the template id and the gotchas here.

## What's here beyond upstream

- `render.mjs`: `--soft-gl`, `--gpu-angle=vulkan|gl-egl`, `--no-sandbox` on Linux.
- `remote/`: the mats scripts above.
- `LESSONS.md`: what we learned, film by film. Add to it.
- `lib/` (when present): reusable scene pieces from past films, each with a header saying where it came from.

## Folding back (the rule)

When a film is done (or a lesson is learned the hard way mid-film), come back here and:
1. add the lesson to LESSONS.md under the film's name, plus a line to the "general" section if it transfers;
2. move reusable code into `lib/` with a short header (what it is, which film, the API);
3. commit (this is a tooling repo: commit freely).
