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

| where | how | cost |
|---|---|---|
| mats L40 (preferred) | `remote/mats_render.sh <render.mjs args>` — syncs the kit up, renders, brings `out/` back | ~0.2 s/frame; a 20 s film in ~2.5 min |
| this box, CPU | `node render.mjs --soft-gl <args>` (SwiftShader) | 0.1 s to 35 s/frame (watercolour fills are slow) |

- `remote/mats_session.sh start|status|stop`: one GPU hold (60 min, `MINUTES=` to change) shared by every checkout
  on this machine (state + lock in `~/.cache/clawd-render/`); `mats_render.sh` grabs one if none is held.
- Each local checkout renders in its own folder on mats (`~/clawd-render/<parent>-<hash>`), so parallel agents in
  separate worktrees don't overwrite each other.
- Chrome reaches the L40 only with `--gpu-angle=gl-egl` (run_on_node.sh passes it) and always renders on physical
  GPU 0; run_on_node.sh refuses to render if the job doesn't hold GPU 0. `remote/gpu_probe.mjs` prints the WebGL
  renderer string if in doubt. On Linux render.mjs adds `--no-sandbox` (Ubuntu 23.10+ blocks Chrome's sandbox).

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
