#!/usr/bin/env bash
# scripts/build-bindings.sh
# Compiles src/cpp/*.cpp + librnp.a + libbotan-3.a → dist/rnp.{wasm,js}.

set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

: "${DEPS_PREFIX:=/opt/rnp-wasm/deps}"
: "${RNP_BUILD:=/opt/rnp-wasm/build/rnp}"
: "${BINDINGS_BUILD:=/opt/rnp-wasm/build/bindings}"
: "${VARIANT:=default}"
: "${EMSDK_ROOT:=/opt}"
# Emscripten's emscripten sysroot — where zlib/bzip2 ports live.
: "${EM_SYSROOT:=${EMSDK_ROOT}/share/emscripten/cache/sysroot}"
if [[ ! -d "${EM_SYSROOT}" ]]; then
  EM_SYSROOT=$(em-config CACHE 2>/dev/null)/sysroot 2>/dev/null || true
fi

VARIANT_SUFFIX=""
[[ "${VARIANT}" != "default" ]] && VARIANT_SUFFIX="-${VARIANT}"

# Asyncify variant: pass -DRNPWASM_ASYNCIFY=ON to cmake and emit as a separate
# artifact (dist/rnp-async.{js,wasm}). The async variant supports async password
# providers and async streaming via Embind's val::await + Asyncify cooperation.
ASYNC_SUFFIX=""
ASYNC_CMAKE_FLAG="OFF"
if [[ "${BUILD_ASYNC:-0}" == "1" ]]; then
  ASYNC_SUFFIX="-async"
  ASYNC_CMAKE_FLAG="ON"
fi

# Ensure dist/ exists and is writable.
mkdir -p "${REPO_ROOT}/dist"

# Locate Botan.
BOTAN_INC="${DEPS_PREFIX}/include/botan-3"
if [[ ! -d "${BOTAN_INC}" ]]; then
  BOTAN_INC="$(find "${DEPS_PREFIX}/include" -type d -name 'botan-3' 2>/dev/null | head -1 || true)"
fi
BOTAN_LIB="${DEPS_PREFIX}/lib/libbotan-3.a"

# rnp headers: generated export header lives in the build tree.
RNP_SRC_INC="${REPO_ROOT}/third-party/rnp/include"
RNP_GEN_INC="${RNP_BUILD}/src/lib"   # contains rnp/rnp_export.h + config.h
RNP_LIB_DIR="${RNP_BUILD}/lib"

# Ensure stub export header is present for include path (real one from build preferred).
if [[ -f "${RNP_GEN_INC}/rnp/rnp_export.h" ]]; then
  RNP_EXPORT_INC="${RNP_GEN_INC}"
else
  RNP_EXPORT_INC="${RNP_SRC_INC}"
fi

GENERATOR="Unix Makefiles"
if command -v ninja >/dev/null 2>&1; then GENERATOR="Ninja"; fi

rm -rf "${BINDINGS_BUILD}"
mkdir -p "${BINDINGS_BUILD}"

# Note: DEPS_PREFIX must be passed with `:STRING=` syntax. Bare `-DDEPS_PREFIX=...`
# doesn't propagate to add_subdirectory() in this CMake version.
emcmake cmake -S . -B "${BINDINGS_BUILD}" -G "${GENERATOR}" \
  -DCMAKE_BUILD_TYPE=Release \
  -DRNP_LIB_DIR="${RNP_LIB_DIR}" \
  -DRNP_INCLUDE_DIR="${RNP_SRC_INC}" \
  -DRNP_GENERATED_INCLUDE_DIR="${RNP_EXPORT_INC}" \
  -DDEPS_PREFIX:STRING="${DEPS_PREFIX}" \
  -DBOTAN_INCLUDE_DIR="${BOTAN_INC}" \
  -DBOTAN_LIBRARY="${BOTAN_LIB}" \
  -DRNPWASM_VARIANT="${VARIANT}" \
  -DRNPWASM_ASYNCIFY="${ASYNC_CMAKE_FLAG}" \
  -DRNPWASM_OUTPUT_NAME="rnp${VARIANT_SUFFIX}${ASYNC_SUFFIX}"

cmake --build "${BINDINGS_BUILD}" -j"$(nproc 2>/dev/null || echo 4)"

# Embind emits .js + .wasm directly to ${CMAKE_SOURCE_DIR}/dist/ via
# RUNTIME_OUTPUT_DIRECTORY (see cmake/Emscripten.cmake).
echo "==> Bindings compiled"
ls -la dist/
# Stale-artifact guarantee: clean anything matching rnp*.{js,wasm,mjs} before
# link, so a partial build doesn't leave half-states in dist/.
rm -f dist/rnp*.mjs dist/rnp*.wasm.map dist/rnp*.html dist/rnp*.data

# Generate features snapshot (TODO 63) if Node is available.
if command -v node >/dev/null 2>&1; then
  node --input-type=module -e "
    import('node:fs').then(({ writeFileSync }) => {
      import('./dist/rnp.js').then(m => {
        m.default({ locateFile: () => new URL('./dist/rnp.wasm', import.meta.url).href }).then(mod => {
          const features = mod.rnpBootstrapFeatures();
          writeFileSync('./dist/features.json', features);
          console.log('==> dist/features.json written');
        }).catch(e => console.warn('features snapshot skipped:', e.message));
      }).catch(e => console.warn('dist/rnp.js import failed:', e.message));
    });
  " 2>/dev/null || true
fi
