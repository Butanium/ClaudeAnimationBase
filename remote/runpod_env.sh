# Shared settings for the RunPod render scripts (sourced, not run).
_kit=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
# CLAWD_RUNPOD_API_KEY overrides RUNPOD_API_KEY: the RunPod account that pays for the pods.
RP_KEY=${CLAWD_RUNPOD_API_KEY:-${RUNPOD_API_KEY:-}}
[ -n "$RP_KEY" ] || { echo "runpod: set RUNPOD_API_KEY (or CLAWD_RUNPOD_API_KEY)" >&2; exit 1; }
RP_TEMPLATE_NAME=clawd-render
RP_POD_NAME=clawd-render-$(hostname -s)
# Cheapest first; all of them run WebGL fine. The pod gets the first one in stock.
RP_GPUS=${RP_GPUS:-'"NVIDIA RTX A4000","NVIDIA RTX A4500","NVIDIA RTX 2000 Ada Generation","NVIDIA RTX A5000","NVIDIA RTX 4000 Ada Generation","NVIDIA GeForce RTX 3090","NVIDIA L4","NVIDIA A40"'}
# The pod terminates itself after this long without a render, or this long after boot (the boot script's watchdog).
IDLE_MINUTES=${IDLE_MINUTES:-20}
MAX_HOURS=${MAX_HOURS:-4}
# One folder on the pod per local checkout, like the mats scripts.
REMOTE_DIR=/root/clawd-render/$(basename "$(dirname "$_kit")")-$(printf '%s' "$_kit" | md5sum | cut -c1-8)
STATE_DIR=${XDG_CACHE_HOME:-$HOME/.cache}/clawd-render
mkdir -p "$STATE_DIR"
POD_STATE=$STATE_DIR/runpod_pod

# rp METHOD PATH [JSON]: RunPod REST API v1; prints the response body, fails on HTTP errors.
rp() {
  curl -sS --fail-with-body --max-time 60 -X "$1" "https://rest.runpod.io/v1$2" \
    -H "Authorization: Bearer $RP_KEY" -H 'Content-Type: application/json' ${3:+--data "$3"}
}
# rp_account: "email ($balance)" of the account the key bills.
rp_account() {
  curl -sS --max-time 30 https://api.runpod.io/graphql -H "Authorization: Bearer $RP_KEY" -H 'Content-Type: application/json' \
    --data '{"query":"query { myself { email clientBalance } }"}' | jq -r '.data.myself | "\(.email) ($\(.clientBalance | . * 100 | round / 100))"'
}
# pod_ssh PORT: the ssh command for the pod (the host goes after it). A new pod gets a fresh known_hosts file.
pod_ssh() {
  echo "ssh -p $1 -l root -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new" \
    "-o UserKnownHostsFile=$STATE_DIR/runpod_known_hosts -o ControlMaster=auto -o ControlPath=$STATE_DIR/cm-%C -o ControlPersist=10m"
}
