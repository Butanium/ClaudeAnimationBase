#!/bin/bash
# Hold one L40 on mats for rendering, so renders never wait in a queue.
#   remote/mats_session.sh start    grab a GPU (MINUTES=60 by default); no-op if one is already held
#   remote/mats_session.sh status   job id, elapsed, time left
#   remote/mats_session.sh stop     release it
#   remote/mats_session.sh ensure   print the held job id, grabbing a GPU first if needed (used by mats_render.sh)
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
source "$here/mats_env.sh"
state="$STATE_DIR/mats_job"
exec 9>"$STATE_DIR/lock"
flock 9
minutes=${MINUTES:-60}
alive() { [ -f "$state" ] && $SSH "$HOST" "squeue -h -j $(cat "$state") -o %T 2>/dev/null" | grep -q RUNNING; }
show() { $SSH "$HOST" "squeue -j $(cat "$state") -o '%.8i %.13j %.2t %.9M %.10L %N'"; }

grab() {
  local out job
  if ! out=$($SSH "$HOST" "timeout ${WAIT_S:-300} salloc --no-shell -p compute --gres=gpu:l40:1 --cpus-per-task=16 --mem=32G --time=$minutes -J clawd-render" 2>&1); then
    $SSH "$HOST" "scancel --me --name=clawd-render --state=PENDING" >/dev/null 2>&1 || true
    echo "$out" >&2
    echo "mats_session: no L40 free within ${WAIT_S:-300}s (nothing left queued)" >&2
    exit 1
  fi
  job=$(grep -oE 'Granted job allocation [0-9]+' <<<"$out" | grep -oE '[0-9]+$') || { echo "$out" >&2; exit 1; }
  echo "$job" >"$state"
  echo "mats: holding job $job, 1× L40 for $minutes min (release: remote/mats_session.sh stop)" >&2
}

case "${1:-status}" in
  start) alive || grab; show ;;
  ensure) alive || grab; cat "$state" ;;
  status) if alive; then show; else echo "no mats render job held"; fi ;;
  stop)
    if [ -f "$state" ]; then $SSH "$HOST" "scancel $(cat "$state")"; rm -f "$state"; echo "released"
    else echo "no mats render job held"; fi ;;
  *) echo "usage: $0 start|status|stop|ensure" >&2; exit 2 ;;
esac
