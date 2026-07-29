#!/usr/bin/env bash
# scripts/dev-shell.sh
# Drops into a container shell with the repo mounted for interactive debugging.

set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

IMAGE="${RNP_WASM_IMAGE:-rnp-wasm:local}"

if ! docker image inspect "${IMAGE}" >/dev/null 2>&1; then
  echo "Image ${IMAGE} not found; building..." >&2
  docker build -t "${IMAGE}" "${REPO_ROOT}"
fi

exec docker run --rm -it \
  -v "${REPO_ROOT}:/work" \
  -v rnp-wasm-deps:/opt/rnp-wasm/deps \
  -v rnp-wasm-build:/opt/rnp-wasm/build \
  --user "$(id -u):$(id -g)" \
  -w /work \
  "${IMAGE}" \
  bash
