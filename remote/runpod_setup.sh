#!/bin/bash
# Runs once on each new clawd-render pod (runpod_session.sh pipes it in over ssh): Node 22, a pinned Chrome for
# Testing with the libraries it needs on Ubuntu 24.04, and the NVIDIA EGL/Vulkan registrations that let Chrome's
# WebGL reach the GPU. ffmpeg, rsync and sshd come with the runpod/base image.
set -euo pipefail
NODE=v22.23.2 NODE_SHA=d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307
CHROME=154.0.8037.57 CHROME_SHA=ceee2972074d441ea7c4ba8bcc0eaab77e7e87680f6653d73d3065851fe10302
export DEBIAN_FRONTEND=noninteractive
cd /tmp
curl -fsSL -o node.tar.xz "https://nodejs.org/dist/$NODE/node-$NODE-linux-x64.tar.xz" & node_dl=$!
curl -fsSL -o chrome.zip "https://storage.googleapis.com/chrome-for-testing-public/$CHROME/linux64/chrome-linux64.zip" & chrome_dl=$!
# chrome-linux64/deb.deps, with Ubuntu 24.04's package names; libegl1/libgles2/libgl1 are the GL dispatch libraries
# the NVIDIA driver plugs into.
apt-get update -qq
apt-get install -y -qq --no-install-recommends ca-certificates fonts-liberation libasound2t64 libatk-bridge2.0-0t64 \
  libatk1.0-0t64 libatspi2.0-0t64 libcairo2 libcups2t64 libcurl4t64 libdbus-1-3 libexpat1 libgbm1 libglib2.0-0t64 \
  libgtk-3-0t64 libnspr4 libnss3 libpango-1.0-0 libudev1 libvulkan1 libx11-6 libxcb1 libxcomposite1 libxdamage1 \
  libxext6 libxfixes3 libxkbcommon0 libxrandr2 wget xdg-utils unzip libegl1 libgles2 libgl1 >/dev/null
wait $node_dl && wait $chrome_dl
echo "$NODE_SHA  node.tar.xz" | sha256sum -c --quiet
echo "$CHROME_SHA  chrome.zip" | sha256sum -c --quiet
rm -rf /opt/node /opt/chrome-linux64 && mkdir -p /opt/node
tar -xJf node.tar.xz -C /opt/node --strip-components=1
unzip -q chrome.zip -d /opt
rm -f node.tar.xz chrome.zip
missing=$(ldd /opt/chrome-linux64/chrome | grep 'not found' || true)
[ -z "$missing" ] || { echo "runpod_setup: Chrome is missing libraries:" >&2; echo "$missing" >&2; exit 1; }
# The NVIDIA container runtime mounts the driver's GL libraries only when NVIDIA_DRIVER_CAPABILITIES includes
# graphics (the template sets it to all), and doesn't always add the files that register them.
have() { for g in "$@"; do compgen -G "$g" >/dev/null && return 0; done; return 1; }
if ! have '/usr/lib/x86_64-linux-gnu/libEGL_nvidia.so.*'; then
  echo "runpod_setup: no libEGL_nvidia.so.0 in the container: the NVIDIA runtime didn't mount the graphics libraries" >&2
  echo "runpod_setup: (NVIDIA_DRIVER_CAPABILITIES=${NVIDIA_DRIVER_CAPABILITIES:-unset}); Chrome would fall back to SwiftShader" >&2
  exit 2
fi
if ! have '/usr/share/glvnd/egl_vendor.d/*nvidia*.json'; then
  mkdir -p /usr/share/glvnd/egl_vendor.d
  echo '{"file_format_version": "1.0.0", "ICD": {"library_path": "libEGL_nvidia.so.0"}}' >/usr/share/glvnd/egl_vendor.d/10_nvidia.json
fi
if ! have '/etc/vulkan/icd.d/nvidia*.json' '/usr/share/vulkan/icd.d/nvidia*.json'; then
  mkdir -p /etc/vulkan/icd.d
  echo '{"file_format_version": "1.0.0", "ICD": {"library_path": "libGLX_nvidia.so.0", "api_version": "1.3.0"}}' >/etc/vulkan/icd.d/nvidia_icd.json
fi
echo "node $(/opt/node/bin/node --version), $(/opt/chrome-linux64/chrome --version), $(nvidia-smi --query-gpu=name,driver_version --format=csv,noheader)"
