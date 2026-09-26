#!/bin/bash
# Runs on the RunPod pod (started by runpod_render.sh over ssh): render.mjs with the flags that put headless
# Chrome's WebGL on the pod's GPU. The first render on each pod checks that it really does (SwiftShader is the CPU).
set -euo pipefail
export PATH=/opt/node/bin:$PATH CHROME_PATH=/opt/chrome-linux64/chrome
angle=${GPU_ANGLE:-gl-egl}
cd "$(dirname "$0")/.."
touch /root/.clawd-active
# who renders here and when: runpod_session.sh stop refuses to delete a pod other checkouts are still using
printf '%s\n' "${CLAWD_OWNER:-?}" >.owner; touch .last-render
if [ ! -f "/root/.clawd-gpu-$angle" ]; then
  probe=$(node remote/gpu_probe.mjs "$CHROME_PATH")
  if ! grep -qE "^angle-$angle +ANGLE \(NVIDIA" <<<"$probe"; then
    echo "$probe" >&2
    echo "run_on_pod: Chrome's WebGL (--use-angle=$angle) is not on the NVIDIA GPU on this pod" >&2
    exit 3
  fi
  grep "^angle-$angle" <<<"$probe" | tee "/root/.clawd-gpu-$angle" >&2
fi
exec node render.mjs --gpu-angle="$angle" "$@"
