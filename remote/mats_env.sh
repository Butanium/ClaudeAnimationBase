# Shared settings for the mats render scripts (sourced, not run).
HOST=${MATS_HOST:-mats}
# One folder on mats per local checkout (several worktrees can render at once without overwriting each other),
# under the mats home (network FS, visible from the GPU node).
_kit=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
REMOTE_DIR=${MATS_REMOTE_DIR:-clawd-render/$(basename "$(dirname "$_kit")")-$(printf '%s' "$_kit" | md5sum | cut -c1-8)}
# One GPU hold shared by every checkout on this machine (the lock keeps two renders from grabbing two GPUs).
STATE_DIR=${XDG_CACHE_HOME:-$HOME/.cache}/clawd-render
mkdir -p "$STATE_DIR"
SSH="ssh -o BatchMode=yes -o ControlMaster=auto -o ControlPath=$HOME/.ssh/cm-%r@%h:%p -o ControlPersist=10m"
