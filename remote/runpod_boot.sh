#!/bin/bash
# Start command of the clawd-render RunPod template (runpod_session.sh pushes this file into the template; after
# editing it, run `remote/runpod_session.sh template`). Runs as root at every pod boot, then hands over to the
# image's own /start.sh (sshd, nginx).
# SSH keys: the account's (PUBLIC_KEY, set by RunPod) plus the caller's (CLAWD_SSH_KEYS, set per pod).
export PUBLIC_KEY="$PUBLIC_KEY
$CLAWD_SSH_KEYS"
# Watchdog: the pod deletes itself after CLAWD_IDLE_MINUTES without a render (run_on_pod.sh and every ssh command
# from runpod_session.sh touch /root/.clawd-active; a running render.mjs counts too), or CLAWD_MAX_HOURS after boot.
# It uses the pod-scoped RUNPOD_API_KEY that RunPod puts in every pod.
touch /root/.clawd-active
cat >/usr/local/bin/clawd-watchdog <<'EOF'
#!/bin/bash
idle=$(( ${CLAWD_IDLE_MINUTES:-20} * 60 )) max=$(( ${CLAWD_MAX_HOURS:-4} * 3600 )) boot=$(date +%s)
# The pod-scoped key gets 403 from the REST API (DELETE and stop) but may terminate its own pod through GraphQL.
terminate='{"query":"mutation { podTerminate(input: {podId: \"'$RUNPOD_POD_ID'\"}) }"}'
# a render is running: some process is `node render.mjs ...` (PID 1's command line is this whole script, so match
# on the start of the command line only)
rendering() {
  local f
  for f in /proc/[0-9]*/cmdline; do [[ $(tr '\0' ' ' 2>/dev/null <"$f") == "node render.mjs "* ]] && return 0; done
  return 1
}
while sleep 30; do
  rendering && touch /root/.clawd-active
  now=$(date +%s) last=$(stat -c %Y /root/.clawd-active)
  if [ $((now - last)) -gt "$idle" ] || [ $((now - boot)) -gt "$max" ]; then
    echo "$(date -u +%FT%TZ) idle $((now - last)) s, up $((now - boot)) s: deleting pod $RUNPOD_POD_ID"
    curl -sS -H 'Content-Type: application/json' -H "Authorization: Bearer $RUNPOD_API_KEY" -d "$terminate" \
      https://api.runpod.io/graphql
    echo
    sleep 120
  fi
done
EOF
chmod +x /usr/local/bin/clawd-watchdog
nohup /usr/local/bin/clawd-watchdog >>/root/clawd-watchdog.log 2>&1 &
exec /start.sh
