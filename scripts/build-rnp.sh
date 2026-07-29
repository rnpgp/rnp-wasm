#!/usr/bin/env bash
# scripts/build-rnp.sh
# Builds rnp (third-party/rnp submodule) as a static wasm32 library.
# Honors RNP_REF for the upstream-tracker CI (TODO 33).

set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

: "${DEPS_PREFIX:=/opt/rnp-wasm/deps}"
: "${RNP_BUILD:=/opt/rnp-wasm/build/rnp}"
: "${VARIANT:=default}"
RNP_REF="${RNP_REF:-}"
RNP_SUBMODULE="third-party/rnp"

if [[ ! -f "${RNP_SUBMODULE}/CMakeLists.txt" ]]; then
  git submodule update --init --recursive
fi

if [[ -n "${RNP_REF}" ]]; then
  echo "==> Upstream-tracker: rnp HEAD -> ${RNP_REF}"
  ORIG_RNP_COMMIT="$(git -C "${RNP_SUBMODULE}" rev-parse HEAD)"
  trap 'git -C "${RNP_SUBMODULE}" checkout -q "${ORIG_RNP_COMMIT}"' EXIT
  git -C "${RNP_SUBMODULE}" fetch origin
  git -C "${RNP_SUBMODULE}" checkout -q "${RNP_REF}"
fi

if compgen -G "third-party/patches/*.patch" > /dev/null; then
  echo "==> Applying rnp patches"
  for p in third-party/patches/*.patch; do
    # Resolve to absolute path — git -C <submodule> interpretS relative patch
    # paths against the submodule dir, not the script's pwd.
    patch_abs="$(cd -- "$(dirname -- "${p}")" && pwd)/$(basename -- "${p}")"
    git -C "${RNP_SUBMODULE}" apply --check "${patch_abs}"
    git -C "${RNP_SUBMODULE}" apply "${patch_abs}"
  done
fi

case "${VARIANT}" in
  pqc) RNP_ENABLE_PQC=ON;;
  *)   RNP_ENABLE_PQC=OFF;;
esac

# Botan include: Botan 3 installs headers under include/botan-3/
BOTAN_INC="${DEPS_PREFIX}/include/botan-3"
if [[ ! -d "${BOTAN_INC}" ]]; then
  BOTAN_INC="$(find "${DEPS_PREFIX}/include" -type d -name 'botan-3' | head -1 || true)"
fi
BOTAN_LIB="${DEPS_PREFIX}/lib/libbotan-3.a"

GENERATOR="Unix Makefiles"
if command -v ninja >/dev/null 2>&1; then GENERATOR="Ninja"; fi

rm -rf "${RNP_BUILD}"
mkdir -p "${RNP_BUILD}"

# Note: ENABLE_CRYPTO_REFRESH is experimental; leave OFF for first green build.
# ENABLE_SM2/AEAD/TWOFISH/BRAINPOOL/IDEA depend on Botan modules being present.
emcmake cmake -S "${RNP_SUBMODULE}" -B "${RNP_BUILD}" -G "${GENERATOR}" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_CXX_FLAGS="-O3 -fwasm-exceptions" \
  -DCMAKE_C_FLAGS="-O3 -fwasm-exceptions" \
  -DCMAKE_INSTALL_PREFIX="${DEPS_PREFIX}" \
  -DCMAKE_PREFIX_PATH="${DEPS_PREFIX}" \
  -DCMAKE_FIND_ROOT_PATH="${DEPS_PREFIX};${EM_SYSROOT:-${EMSDK:-/opt}/upstream/emscripten/cache/sysroot}" \
  -DCMAKE_POSITION_INDEPENDENT_CODE=OFF \
  -DBUILD_SHARED_LIBS=OFF \
  -DBUILD_TESTING=OFF \
  -DENABLE_DOC=OFF \
  -DENABLE_COVERAGE=OFF \
  -DENABLE_FUZZERS=OFF \
  -DENABLE_SANITIZERS=OFF \
  -DCRYPTO_BACKEND=botan \
  -DBOTAN_ROOT_DIR="${DEPS_PREFIX}" \
  -DENABLE_CRYPTO_REFRESH=ON \
  -DENABLE_PQC="${RNP_ENABLE_PQC}" \
  -DENABLE_SM2=ON \
  -DENABLE_AEAD=ON \
  -DENABLE_TWOFISH=ON \
  -DENABLE_BRAINPOOL=ON \
  -DENABLE_IDEA=ON \
  -DSYSTEM_LIBSEXPP=OFF \
  -DDOWNLOAD_GTEST=OFF

# Target name is librnp (outputs librnp.a with OUTPUT_NAME rnp → librnp.a).
cmake --build "${RNP_BUILD}" -j"$(nproc 2>/dev/null || echo 4)" --target librnp

# Locate the produced archive.
LIBRNP="$(find "${RNP_BUILD}" -name 'librnp.a' -o -name 'librnp-static.a' | head -1 || true)"
if [[ -z "${LIBRNP}" ]]; then
  echo "librnp.a not found under ${RNP_BUILD}" >&2
  find "${RNP_BUILD}" -name '*.a' | head -20
  exit 1
fi
echo "==> rnp build complete: ${LIBRNP}"
# Normalize path for build-bindings.sh
mkdir -p "${RNP_BUILD}/lib"
cp -f "${LIBRNP}" "${RNP_BUILD}/lib/librnp.a"

# Also pull libsexpp if built separately.
SEXPP="$(find "${RNP_BUILD}" -name 'libsexpp.a' | head -1 || true)"
if [[ -n "${SEXPP}" ]]; then
  cp -f "${SEXPP}" "${RNP_BUILD}/lib/libsexpp.a"
fi

ls -la "${RNP_BUILD}/lib/"
