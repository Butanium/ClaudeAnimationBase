#!/bin/bash
# Runs on the mats GPU node (started by mats_render.sh through srun): render.mjs with the flags that put
# headless Chrome's WebGL on the L40 (ANGLE over EGL; the kit's default --use-gl=angle gets no context there).
set -euo pipefail
export PATH=$HOME/.nvm/versions/node/v22.17.0/bin:$PATH
export CHROME_PATH=${CHROME_PATH:-$HOME/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome}
# Chrome reaches the GPU through EGL, which ignores CUDA_VISIBLE_DEVICES and always opens GPU 0, and this node
# doesn't hide other jobs' GPUs. Only render when GPU 0 is the one SLURM gave us.
if [ "${CUDA_VISIBLE_DEVICES:-0}" != 0 ] && [ "${ALLOW_GPU_MISMATCH:-0}" != 1 ]; then
  echo "run_on_node: this job holds GPU ${CUDA_VISIBLE_DEVICES}, but Chrome would render on GPU 0 (maybe another job's)." >&2
  echo "run_on_node: release and retry (remote/mats_session.sh stop && remote/mats_session.sh start)." >&2
  exit 3
fi
cd "$(dirname "$0")/.."
exec node render.mjs --gpu-angle=gl-egl "$@"
