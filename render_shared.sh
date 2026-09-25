#!/bin/bash
# render_shared.sh <render.mjs args>: render where this machine shares capacity between agents.
#   - a mats GPU hold is alive (remote/mats_session.sh status) → remote/mats_render.sh (one render per checkout);
#   - otherwise the CPU (--soft-gl), in one of CLAWD_CPU_SLOTS (default 2) slots shared by every checkout and worktree,
#     so parallel agents don't pile renders onto the CPU. It waits for a free slot.
# Run it from the checkout root (render.mjs reads studio.html from the current directory). CLAWD_RENDER=cpu forces the CPU.
#   ./render_shared.sh --use=lib/weather/rain.js,lib/weather/rain.demo.js --loop=weather/rain --sheet=0.5,1,1.5 --out=out/check/rain.jpg
# Who holds the CPU slots: pgrep -af 'render.mjs --soft-gl'
state=~/.cache/clawd-render/mats_job
if [ "${CLAWD_RENDER:-}" != cpu ] && [ -f "$state" ] && remote/mats_session.sh status 2>/dev/null | grep -q " R "; then
  exec remote/mats_render.sh "$@"
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
