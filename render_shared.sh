#!/bin/bash
# render_shared.sh <render.mjs args>: render where this machine shares capacity between agents.
#   - a GPU is already up: a mats hold (remote/mats_session.sh) or a RunPod pod (remote/runpod_session.sh) → render
#     there (one render per checkout at a time). It never starts one: whoever runs the crew does.
#   - otherwise the CPU (--soft-gl), in one of CLAWD_CPU_SLOTS (default 2) slots shared by every checkout and worktree,
#     so parallel agents don't pile renders onto the CPU. It waits for a free slot.
# Run it from the checkout root (render.mjs reads studio.html from the current directory). CLAWD_RENDER=cpu forces the CPU.
#   ./render_shared.sh --use=lib/weather/rain.js,lib/weather/rain.demo.js --loop=weather/rain --sheet=0.5,1,1.5 --out=out/check/rain.jpg
# Who holds the CPU slots: pgrep -af 'render.mjs --soft-gl'
cache=${XDG_CACHE_HOME:-$HOME/.cache}/clawd-render gpu=""
if [ "${CLAWD_RENDER:-}" != cpu ]; then
  if [ -f "$cache/mats_job" ] && remote/mats_session.sh status 2>/dev/null | grep -q " R "; then gpu=remote/mats_render.sh
  elif [ -f "$cache/runpod_pod" ] && ! remote/runpod_session.sh status 2>/dev/null | grep -q "no clawd-render pod"; then gpu=remote/runpod_render.sh
  fi
fi
if [ -n "$gpu" ]; then
  # the remote scripts bring back only out/: render an --out outside out/ (e.g. a lib sheet) under out/.shared/, copy it
  args=() dest=""
  for a in "$@"; do
    if [[ $a == --out=* && ${a#--out=} != out/* ]]; then dest=${a#--out=}; a="--out=out/.shared/$dest"; fi
    args+=("$a")
  done
  "$gpu" "${args[@]}" || exit $?
  if [ -n "$dest" ]; then mkdir -p "$(dirname "$dest")"; rm -rf "$dest"; cp -r "out/.shared/$dest" "$dest" && echo "→ $dest"; fi
  exit 0
fi
slots=${CLAWD_CPU_SLOTS:-2} dir=/var/tmp/clawd-render-slots waited=0
mkdir -p "$dir"
while :; do
  for i in $(seq 1 "$slots"); do
    # -o: the lock stays with flock itself, so a Chrome left behind by a crashed render can't hold the slot
    flock -n -o -E 75 "$dir/slot$i" node render.mjs --soft-gl "$@"; rc=$?
    if [ $rc -ne 75 ]; then [ $waited -gt 0 ] && echo "render_shared: waited ${waited}s for a CPU slot"; exit $rc; fi
  done
  [ $waited -eq 0 ] && echo "render_shared: all $slots CPU render slots are busy, waiting"
  sleep 3; waited=$((waited + 3))
done
