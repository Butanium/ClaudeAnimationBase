#!/bin/bash
# One RunPod GPU pod for rendering, shared by every checkout on this machine (state + lock in ~/.cache/clawd-render/).
#   remote/runpod_session.sh start      create the pod (or reuse the running one) and set it up; no-op if ready
#   remote/runpod_session.sh status     pod id, GPU, $/h, uptime, minutes until the idle watchdog deletes it
#   remote/runpod_session.sh stop       delete the pod (same as terminate: a stopped pod has nothing worth keeping);
#                                       refuses while another checkout rendered on it in the last ACTIVE_MINUTES (30)
#                                       or is rendering now: stop --force (or FORCE=1) deletes anyway
#   remote/runpod_session.sh ensure     print "IP PORT" of a ready pod, starting one first if needed (runpod_render.sh)
#   remote/runpod_session.sh users      the other checkouts using the pod (what stop checks)
#   remote/runpod_session.sh template   create or update the clawd-render template from runpod_boot.sh; print its id
# The pod deletes itself after IDLE_MINUTES (20) without a render or MAX_HOURS (4) after boot, so a forgotten pod
# costs at most ~20 min. Quiet on success, loud on failure; every new pod prints the account it bills.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
source "$here/runpod_env.sh"
exec 9>"$STATE_DIR/runpod.lock"
flock 9

template_spec() {
  jq -n --rawfile boot "$here/runpod_boot.sh" --arg name "$RP_TEMPLATE_NAME" '{
    name: $name, imageName: "runpod/base:1.0.2-ubuntu2404", category: "NVIDIA", isPublic: false,
    containerDiskInGb: 20, volumeInGb: 0, ports: ["22/tcp"],
    env: {NVIDIA_DRIVER_CAPABILITIES: "all"},
    dockerEntrypoint: [], dockerStartCmd: ["bash", "-c", $boot],
    readme: "Headless Chrome WebGL renders for clawd-kit (~/tools/clawd-kit, remote/runpod_*.sh). Start command = remote/runpod_boot.sh."
  }'
}

# ensure_template: print the id of the clawd-render template, creating it or bringing it up to date.
ensure_template() {
  local want have id
  want=$(template_spec)
  have=$(rp GET /templates | jq --arg name "$RP_TEMPLATE_NAME" '[.[] | select(.name == $name)][0] // empty')
  if [ -z "$have" ]; then
    rp POST /templates "$want" | jq -r .id
    return
  fi
  id=$(jq -r .id <<<"$have")
  local keys='{imageName, containerDiskInGb, volumeInGb: (.volumeInGb // 0), ports, env, dockerStartCmd}'
  if [ "$(jq -S "$keys" <<<"$want")" != "$(jq -S "$keys" <<<"$have")" ]; then
    rp PATCH "/templates/$id" "$(jq 'del(.name, .isPublic, .category)' <<<"$want")" >/dev/null
    echo "runpod: updated template $id from runpod_boot.sh" >&2
  fi
  echo "$id"
}

pod_json() { rp GET "/pods/$1" 2>/dev/null || true; }

# create_pod: start a new pod from the template on the cheapest GPU in stock; print its id.
create_pod() {
  local tpl keys body out id
  tpl=$(ensure_template)
  keys=$(cat ~/.ssh/id_*.pub)
  body=$(jq -n --arg tpl "$tpl" --arg name "$RP_POD_NAME" --arg keys "$keys" --argjson gpus "[$RP_GPUS]" \
    --arg idle "$IDLE_MINUTES" --arg max "$MAX_HOURS" '{
      name: $name, templateId: $tpl, gpuTypeIds: $gpus, gpuTypePriority: "custom", gpuCount: 1,
      containerDiskInGb: 20, volumeInGb: 0, ports: ["22/tcp"], minVCPUPerGPU: 4, minRAMPerGPU: 15,
      env: {NVIDIA_DRIVER_CAPABILITIES: "all", CLAWD_SSH_KEYS: $keys, CLAWD_IDLE_MINUTES: $idle, CLAWD_MAX_HOURS: $max}
    }')
  # Secure Cloud first (always a public IP, uniform hosts), then Community Cloud machines that have a public IP.
  if ! out=$(rp POST /pods "$(jq '. + {cloudType: "SECURE"}' <<<"$body")") &&
     ! out=$(rp POST /pods "$(jq '. + {cloudType: "COMMUNITY", supportPublicIp: true}' <<<"$body")"); then
    echo "$out" >&2
    echo "runpod_session: no pod could be created (none of the GPUs in RP_GPUS in stock?)" >&2
    exit 1
  fi
  id=$(jq -r .id <<<"$out")
  echo "$id" >"$POD_STATE"
  rm -f "$STATE_DIR/runpod_known_hosts"
  echo "runpod: new pod $id on $(rp_account): $(jq -r '"\(.machine.gpuTypeId // .gpu.displayName // "GPU") $\(.costPerHr)/h"' <<<"$out")" >&2
  echo "runpod: it deletes itself after $IDLE_MINUTES min without a render; delete it now: remote/runpod_session.sh stop" >&2
  echo "$id"
}

# wait_ready ID: wait for the public ssh port, then for sshd, then run the setup once; print "IP PORT".
wait_ready() {
  local id=$1 t0=$SECONDS j ip port ssh h
  while :; do
    j=$(pod_json "$id")
    ip=$(jq -r '.publicIp // empty' <<<"$j")
    port=$(jq -r '.portMappings["22"] // empty' <<<"$j")
    [ -n "$ip" ] && [ -n "$port" ] && break
    if [ "$(jq -r '.desiredStatus // "GONE"' <<<"$j")" != RUNNING ]; then
      echo "runpod_session: pod $id is $(jq -r '.desiredStatus // "gone"' <<<"$j")" >&2; rm -f "$POD_STATE"; exit 1
    fi
    [ $((SECONDS - t0)) -lt 600 ] || give_up "$id" "no public ssh port after 10 min"
    sleep 5
  done
  ssh=$(pod_ssh "$port")
  until $ssh "$ip" 'touch /root/.clawd-active' 2>/dev/null; do
    [ $((SECONDS - t0)) -lt 900 ] || give_up "$id" "no ssh to $ip:$port after 15 min"
    sleep 5
  done
  h=$(md5sum <"$here/runpod_setup.sh" | cut -c1-8)
  if ! $ssh "$ip" "test -f /root/.clawd-setup-$h"; then
    if ! $ssh "$ip" 'bash -s' <"$here/runpod_setup.sh" >"$STATE_DIR/runpod_setup.log" 2>&1; then
      cat "$STATE_DIR/runpod_setup.log" >&2
      echo "runpod_session: setup failed on pod $id (it is still running: remote/runpod_session.sh stop)" >&2
      exit 1
    fi
    $ssh "$ip" "touch /root/.clawd-setup-$h"
    echo "runpod: pod $id ready after $((SECONDS - t0)) s: $(tail -1 "$STATE_DIR/runpod_setup.log")" >&2
  fi
  echo "$ip $port"
}

# current_pod: id of this machine's pod if it is running (adopting one by name if the state file was lost).
current_pod() {
  local id st
  id=$(cat "$POD_STATE" 2>/dev/null || true)
  [ -n "$id" ] || id=$(rp GET "/pods?name=$RP_POD_NAME" | jq -r '[.[] | select(.desiredStatus == "RUNNING")][0].id // empty')
  [ -n "$id" ] || return 0
  st=$(pod_json "$id" | jq -r '.desiredStatus // empty')
  if [ "$st" = RUNNING ]; then echo "$id" >"$POD_STATE"; echo "$id"; return; fi
  # stopped (by the watchdog, if it couldn't delete it): its container disk is gone anyway
  [ "$st" != EXITED ] || rp DELETE "/pods/$id" >/dev/null 2>&1 || true
  rm -f "$POD_STATE"
}

# give_up ID MESSAGE: delete a pod that never became usable (it bills while it sits there), then fail.
give_up() {
  rp DELETE "/pods/$1" >/dev/null 2>&1 || true
  rm -f "$POD_STATE"
  echo "runpod_session: $2; deleted pod $1" >&2
  exit 1
}

# other_users ID: the checkouts other than this one that rendered on the pod in the last ACTIVE_MINUTES or are
# rendering now, one line each (run_on_pod.sh leaves .owner and .last-render in each checkout's folder).
other_users() {
  local j ip port
  j=$(rp GET "/pods/$1") || return 0
  ip=$(jq -r '.publicIp // empty' <<<"$j"); port=$(jq -r '.portMappings["22"] // empty' <<<"$j")
  [ -n "$ip" ] && [ -n "$port" ] || return 0
  $(pod_ssh "$port") "$ip" "me=$REMOTE_DIR lim=$ACTIVE_MINUTES bash -s" <<'EOF' 2>/dev/null || echo "? (pod unreachable: can't tell who uses it)"
now=$(date +%s)
for d in /root/clawd-render/*/; do
  d=${d%/}; [ "$d" = "$me" ] && continue; [ -f "$d/.last-render" ] || continue
  age=$(( (now - $(stat -c %Y "$d/.last-render")) / 60 )) run=""
  for p in $(pgrep -f "node render.mjs" || true); do [ "$(readlink /proc/$p/cwd)" = "$d" ] && run=", rendering now"; done
  if [ $age -lt $lim ] || [ -n "$run" ]; then echo "$(cat "$d/.owner" 2>/dev/null || basename "$d") (last render ${age} min ago$run)"; fi
done
EOF
}

# delete_pods [--force]: delete this machine's pod(s), unless another checkout is still using one (--force or FORCE=1
# deletes anyway). Several crews can share one pod; one crew's "done" must not pull the GPU from under another.
delete_pods() {
  local ids users refused=0
  ids=$( (cat "$POD_STATE" 2>/dev/null; rp GET "/pods?name=$RP_POD_NAME" | jq -r '.[].id') | sort -u)
  for id in $ids; do
    if [ "${1:-}" != --force ] && [ "${FORCE:-0}" != 1 ] && users=$(other_users "$id") && [ -n "$users" ]; then
      echo "runpod_session: NOT deleting pod $id: other checkouts are using it:" >&2
      sed 's/^/  /' <<<"$users" >&2
      echo "  Leave it (the idle watchdog deletes it once everyone stops), or: remote/runpod_session.sh stop --force" >&2
      refused=1; continue
    fi
    rp DELETE "/pods/$id" >/dev/null 2>&1 && echo "deleted pod $id"
  done
  [ -n "$ids" ] || echo "no clawd-render pod"
  [ $refused = 1 ] && exit 1
  rm -f "$POD_STATE"
}

show() {
  local id=$1 j ip port idle
  j=$(rp GET "/pods/$id?includeMachine=true")
  ip=$(jq -r '.publicIp // empty' <<<"$j"); port=$(jq -r '.portMappings["22"] // empty' <<<"$j")
  idle=$($(pod_ssh "$port") "$ip" 'echo $(( ($(date +%s) - $(stat -c %Y /root/.clawd-active)) / 60 ))' 2>/dev/null || echo '?')
  jq -r --arg idle "$idle" --arg lim "$IDLE_MINUTES" '"pod \(.id) \(.desiredStatus) \(.machine.gpuTypeId // .gpu.displayName // "?") $\(.costPerHr)/h, up since \(.lastStartedAt // "?"), idle \($idle) min (deleted at \($lim)), ssh root@\(.publicIp) -p \(.portMappings["22"])"' <<<"$j"
}

case "${1:-status}" in
  template) ensure_template ;;
  start) id=$(current_pod); [ -n "$id" ] || id=$(create_pod); wait_ready "$id" >/dev/null; show "$id" ;;
  ensure) id=$(current_pod); [ -n "$id" ] || id=$(create_pod); wait_ready "$id" ;;
  status) id=$(current_pod); if [ -n "$id" ]; then show "$id"; else echo "no clawd-render pod running"; fi ;;
  stop|terminate) delete_pods "${2:-}" ;;
  users) id=$(current_pod); [ -z "$id" ] || other_users "$id" ;;
  *) echo "usage: $0 start|status|stop [--force]|ensure|users|template" >&2; exit 2 ;;
esac
