#!/bin/bash
# Render on a mats L40: sync the kit up, run render.mjs there, bring out/ back (except out/frames).
#   remote/mats_render.sh --sheet=1,4,8 --cols=3 --w=480 --out=out/check/sheet.jpg
#   remote/mats_render.sh --clip --out=out/video.mp4
#   remote/mats_render.sh --frames --workers=4 && remote/mats_render.sh --encode --out=out/video.mp4
# Grabs a GPU first if none is held. FRAMES=1 also brings back out/frames. Quiet on success, loud on failure.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
kit=$(dirname "$here")
source "$here/mats_env.sh"
job=$("$here/mats_session.sh" ensure)
$SSH "$HOST" "mkdir -p $REMOTE_DIR"
rsync -az --delete -e "$SSH" --exclude node_modules --exclude out --exclude .git --exclude remote/.mats_job \
  "$kit/" "$HOST:$REMOTE_DIR/"
$SSH "$HOST" "test -d $REMOTE_DIR/node_modules || (export PATH=\$HOME/.nvm/versions/node/v22.17.0/bin:\$PATH; cd $REMOTE_DIR && npm ci --no-audit --no-fund >/dev/null)"
log=$(mktemp)
trap 'rm -f "$log"' EXIT
if ! $SSH "$HOST" "srun --jobid=$job --overlap $REMOTE_DIR/remote/run_on_node.sh $(printf '%q ' "$@")" >"$log" 2>&1; then
  grep -v 'INVALID_OPERATION' "$log" >&2 || true
  echo "mats_render: render failed on job $job" >&2
  exit 1
fi
# p5.brush's INVALID_OPERATION warnings are harmless (see ANIMATION_GUIDE); keep the summary lines
grep -v 'INVALID_OPERATION' "$log" | grep -vE '^frame [0-9]+/[0-9]+ ' || true
grep -E '^frame [0-9]+/[0-9]+ ' "$log" | tail -1 || true
excl=(--exclude frames)
[ "${FRAMES:-0}" = 1 ] && excl=()
rsync -az -e "$SSH" "${excl[@]}" "$HOST:$REMOTE_DIR/out/" "$kit/out/"
