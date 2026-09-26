#!/bin/bash
# Render on a RunPod GPU: sync the kit up, run render.mjs there, bring out/ back (except out/frames).
#   remote/runpod_render.sh --sheet=1,4,8 --cols=3 --w=480 --out=out/check/sheet.jpg
#   remote/runpod_render.sh --clip --audio=song.wav --out=out/video.mp4
#   remote/runpod_render.sh --frames --workers=4 && remote/runpod_render.sh --encode --out=out/video.mp4
# Starts a pod if none is running (~3 min the first time) and leaves it up for the next render: run
# `remote/runpod_session.sh stop` when done (it deletes itself after 20 idle minutes anyway). FRAMES=1 also brings
# back out/frames. An --audio file is copied up wherever it is. Quiet on success, loud on failure.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
kit=$(dirname "$here")
# One render at a time per checkout: each one syncs this folder up with --delete, so a second render would swap the
# first one's inputs (e.g. its soundtrack) under it.
exec 9>"$kit/.render.lock"
flock -n 9 || { echo "waiting for another render from this checkout..." >&2; flock 9; }
source "$here/runpod_env.sh"
addr=$("$here/runpod_session.sh" ensure)
read -r ip port <<<"$addr"
ssh=$(pod_ssh "$port")
$ssh "$ip" "mkdir -p $REMOTE_DIR/.inputs"
rsync -az --delete -e "$ssh" --exclude node_modules --exclude out --exclude .git --exclude .inputs "$kit/" "$ip:$REMOTE_DIR/"
args=()
for a in "$@"; do
  if [[ $a == --audio=* ]] && [ -f "${a#--audio=}" ]; then
    rsync -az -e "$ssh" "${a#--audio=}" "$ip:$REMOTE_DIR/.inputs/"
    a=--audio=.inputs/$(basename "${a#--audio=}")
  fi
  args+=("$a")
done
$ssh "$ip" "cd $REMOTE_DIR && (cmp -s package-lock.json node_modules/.clawd-lock ||
  (PATH=/opt/node/bin:\$PATH npm ci --ignore-scripts --no-audit --no-fund --no-update-notifier --loglevel=error >/dev/null && cp package-lock.json node_modules/.clawd-lock))"
log=$(mktemp)
trap 'rm -f "$log"' EXIT
if ! $ssh "$ip" "GPU_ANGLE=${GPU_ANGLE:-gl-egl} CLAWD_OWNER=$(printf '%q' "$kit") $REMOTE_DIR/remote/run_on_pod.sh $(printf '%q ' "${args[@]}")" >"$log" 2>&1; then
  grep -v 'INVALID_OPERATION' "$log" >&2 || true
  echo "runpod_render: render failed on $ip:$port (remote/runpod_session.sh status)" >&2
  exit 1
fi
# p5.brush's INVALID_OPERATION warnings are harmless (see ANIMATION_GUIDE); keep the summary lines
grep -v 'INVALID_OPERATION' "$log" | grep -vE '^frame [0-9]+/[0-9]+ ' || true
grep -E '^frame [0-9]+/[0-9]+ ' "$log" | tail -1 || true
excl=(--exclude frames)
[ "${FRAMES:-0}" = 1 ] && excl=()
rsync -az -e "$ssh" "${excl[@]}" "$ip:$REMOTE_DIR/out/" "$kit/out/"
