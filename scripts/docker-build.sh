#!/usr/bin/env bash
# scripts/docker-build.sh
# Full build using the stock emscripten/emsdk image (no custom Dockerfile needed).
set -euo pipefail
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

IMAGE="${RNP_WASM_IMAGE:-emscripten/emsdk:3.1.74}"
VARIANT="${VARIANT:-default}"

# Persistent volumes for deps so rebuilds are fast.
DEPS_VOL="rnp-wasm-deps"
BUILD_VOL="rnp-wasm-build"

docker volume create "${DEPS_VOL}" >/dev/null
docker volume create "${BUILD_VOL}" >/dev/null

echo "==> Running full build in ${IMAGE} (variant=${VARIANT})"
docker run --rm \
  -v "${REPO_ROOT}:/work" \
  -v "${DEPS_VOL}:/opt/rnp-wasm/deps" \
  -v "${BUILD_VOL}:/opt/rnp-wasm/build" \
  -v "${DEPS_VOL}-src:/opt/rnp-wasm/src" \
  -e DEPS_PREFIX=/opt/rnp-wasm/deps \
  -e DEPS_SRC=/opt/rnp-wasm/src \
  -e DEPS_BUILD=/opt/rnp-wasm/build \
  -e RNP_BUILD=/opt/rnp-wasm/build/rnp \
  -e BINDINGS_BUILD=/opt/rnp-wasm/build/bindings \
  -e VARIANT="${VARIANT}" \
  -e BOTAN_VERSION="${BOTAN_VERSION:-3.5.0}" \
  -w /work \
    \
  "${IMAGE}" \
  bash -lc 'set -euo pipefail
    # Ensure writable dirs (volumes may be root-owned on first create)
    mkdir -p "$DEPS_PREFIX" "$DEPS_SRC" "$DEPS_BUILD" dist
    scripts/build-deps.sh
    scripts/build-rnp.sh
    scripts/build-bindings.sh
    scripts/package.sh
    echo "==> DONE"
    ls -la dist/
  '
