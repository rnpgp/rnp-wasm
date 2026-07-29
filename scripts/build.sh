#!/usr/bin/env bash
# scripts/build.sh
# End-to-end build entry point. Runs deps → rnp → bindings → package.
# Safe to invoke inside Docker (default) or directly on a host with emsdk installed.

set -euo pipefail
IFS=$'\n\t'

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

# Flags from env / args
USE_DOCKER=0
VARIANT="${VARIANT:-default}"
RNP_REF="${RNP_REF:-}"     # upstream-tracker CI may override
CLEAN=0
BUILD_ASYNC=0              # set to 1 to also produce dist/rnp-async.{js,wasm}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --docker)        USE_DOCKER=1; shift;;
    --variant)       VARIANT="$2"; shift 2;;
    --variant=*)     VARIANT="${1#--variant=}"; shift;;
    --rnp-ref)       RNP_REF="$2"; shift 2;;
    --rnp-ref=*)     RNP_REF="${1#--rnp-ref=}"; shift;;
    --clean)         CLEAN=1; shift;;
    --async)         BUILD_ASYNC=1; shift;;
    -h|--help)
      sed -n '2,8p' "$0"; exit 0;;
    *) echo "unknown flag: $1" >&2; exit 2;;
  esac
done

if [[ "${USE_DOCKER}" == "1" ]]; then
  exec docker run --rm \
    -v "${REPO_ROOT}:/work" \
    -e VARIANT="${VARIANT}" \
    -e RNP_REF="${RNP_REF}" \
    -e BUILD_ASYNC="${BUILD_ASYNC}" \
    --user "$(id -u):$(id -g)" \
    rnp-wasm:local \
    scripts/build.sh --variant "${VARIANT}" ${RNP_REF:+--rnp-ref "${RNP_REF}"} ${BUILD_ASYNC:+--async}
fi

export VARIANT RNP_REF BUILD_ASYNC

if [[ "${CLEAN}" == "1" ]]; then
  "${REPO_ROOT}/scripts/clean.sh"
fi

# 1. Dependencies (Botan + embuilder ports).
"${REPO_ROOT}/scripts/build-deps.sh"

# 2. rnp itself (submodule, pinned tag unless RNP_REF overrides).
RNP_REF="${RNP_REF}" "${REPO_ROOT}/scripts/build-rnp.sh"

# 3a. C++ bindings → dist/rnp.{wasm,js}
BUILD_ASYNC=0 "${REPO_ROOT}/scripts/build-bindings.sh"

# 3b. Optional async variant → dist/rnp-async.{wasm,js}
# The async variant supports async password providers and async streams via
# Asyncify. Costs ~30% wasm size + slower calls; ship as opt-in.
if [[ "${BUILD_ASYNC}" == "1" ]]; then
  BUILD_ASYNC=1 BINDINGS_BUILD="${BINDINGS_BUILD:-/opt/rnp-wasm/build/bindings-async}-async" \
    "${REPO_ROOT}/scripts/build-bindings.sh"
fi

# 4. TypeScript declarations + final packaging.
"${REPO_ROOT}/scripts/package.sh"

echo "rnp-wasm build complete → dist/"
ls -la dist/
