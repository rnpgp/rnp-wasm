#!/usr/bin/env bash
# scripts/build-deps.sh
# Builds Botan + json-c from source via emconfigure; pulls zlib/bzip2 via embuilder.
# Idempotent: skips work that's already done (per-component stamp files).

set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

: "${DEPS_PREFIX:=/opt/rnp-wasm/deps}"
: "${DEPS_SRC:=/opt/rnp-wasm/src}"
: "${DEPS_BUILD:=/opt/rnp-wasm/build}"
: "${VARIANT:=default}"

mkdir -p "${DEPS_PREFIX}" "${DEPS_BUILD}" "${DEPS_SRC}"

# ---- Botan -------------------------------------------------------------
# Built with a curated module set via --enable-modules= to keep the wasm
# artifact small (~3 MB gzipped vs ~10 MB with all defaults). The list
# covers everything rnp 0.18.1 needs plus the algorithms our registries
# advertise. The VARIANT env var adds extra modules for specialized builds.
BOTAN_VERSION="${BOTAN_VERSION:-3.12.0}"
BOTAN_STAMP="${DEPS_BUILD}/.botan-${BOTAN_VERSION}-${VARIANT}-stamp"

# Comma-separated module list for --enable-modules (Botan requires commas).
# Curated for rnp's needs under WASM. No SIMD modules (aes_ni etc.) since
# Emscripten's wasm32 target doesn't expose SIMD by default; no TLS since
# rnp doesn't use it.
#
# Module-name notes (Botan 3.12):
#   - blake2b is just "blake2" in 3.7+ (the .h still calls it BLAKE2b)
#   - pk_pad is gone; emsa_* modules come in transitively with rsa/ecdsa
#   - pcurves_* are needed per-curve since 3.7.0 (see BOTAN_PCURVES_DEFAULT)
BOTAN_MODULES_DEFAULT="aes,argon2,base64,bcrypt,blake2,blake2s,camellia,chacha,chacha20poly1305,crc24,des,dh,dl_algo,dl_group,dsa,eax,ec_group,ecdh,ecdsa,ed25519,elgamal,ffi,gcm,hash,hex,hkdf,hmac,hmac_drbg,idea,kdf,md5,nist_keywrap,ocb,ofb,pbkdf,pbkdf2,poly1305,pubkey,rfc3394,raw_hash,rmd160,rng,rsa,sha1,sha2_32,sha2_64,sha3,sm2,sm3,sm4,system_rng,twofish,x25519,modes,aead,block,stream,mac,filters,utils,asn1,bigint,numbertheory,pem,x509"

# Botan 3.7+ split EC into per-curve modules. We need every curve rnp
# advertises so ECDSA/ECDH/SM2 keygen + verify work for all registered names.
BOTAN_PCURVES_DEFAULT="pcurves_secp256r1,pcurves_secp384r1,pcurves_secp521r1,pcurves_secp256k1,pcurves_brainpool256r1,pcurves_brainpool384r1,pcurves_brainpool512r1,legacy_ec_point"

case "${VARIANT}" in
  pqc)        BOTAN_MODULES="${BOTAN_MODULES_DEFAULT},${BOTAN_PCURVES_DEFAULT},ml_kem,ml_dsa,slh_dsa";;
  brainpool)  BOTAN_MODULES="${BOTAN_MODULES_DEFAULT},${BOTAN_PCURVES_DEFAULT}";;
  *)          BOTAN_MODULES="${BOTAN_MODULES_DEFAULT},${BOTAN_PCURVES_DEFAULT}";;
esac

if [[ ! -f "${BOTAN_STAMP}" ]]; then
  echo "==> Building Botan ${BOTAN_VERSION} (variant=${VARIANT})"
  cd "${DEPS_SRC}"

  TARBALL="botan-${BOTAN_VERSION}.tar.xz"
  if [[ ! -f "${TARBALL}" ]]; then
    # Fall back to downloading if image didn't pre-fetch.
    curl -fsSL "https://botan.randombit.net/releases/Botan-${BOTAN_VERSION}.tar.xz" -o "${TARBALL}"
  fi

  # Upstream tarball extracts to Botan-X.Y.Z (capital B).
  rm -rf "Botan-${BOTAN_VERSION}" "botan-${BOTAN_VERSION}"
  tar xf "${TARBALL}"
  cd "Botan-${BOTAN_VERSION}"

  # emconfigure sets CC/CXX/AR; Botan needs --os=emscripten --cpu=wasm.
  # --disable-shared produces a static archive only.
  # Botan 3.11+ auto-selects -fwasm-exceptions for the emscripten target;
  # we match that in cmake/Emscripten.cmake and scripts/build-rnp.sh.
  # --enable-modules= is the size win: only the listed modules + their
  # transitive dependencies are compiled into libbotan-3.a.
  python3 ./configure.py \
    --cc=emcc \
    --cc-bin=emcc \
    --ar-command=emar \
    --cpu=wasm \
    --os=emscripten \
    --disable-shared \
    --without-documentation \
    --build-targets=static \
    --enable-modules="${BOTAN_MODULES}" \
    --disable-modules=tls,boost,sqlite3,zlib,bzip2 \
    --prefix="${DEPS_PREFIX}"

  # Build only the static library target ('libs'), not CLI/tests.
  emmake make -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)" libs
  emmake make install

  # Botan 3 installs libbotan-3.a under lib/ or lib/wasm-emscripten/
  if [[ ! -f "${DEPS_PREFIX}/lib/libbotan-3.a" ]]; then
    found="$(find "${DEPS_PREFIX}" -name 'libbotan-3.a' | head -1 || true)"
    if [[ -n "${found}" ]]; then
      mkdir -p "${DEPS_PREFIX}/lib"
      ln -sfn "${found}" "${DEPS_PREFIX}/lib/libbotan-3.a"
    fi
  fi

  touch "${BOTAN_STAMP}"
else
  echo "==> Botan ${BOTAN_VERSION} already built (stamp exists)"
fi

# ---- json-c -----------------------------------------------------------
# Required by rnp for G10 key format support. Built static, single-threaded
# (WASM is single-threaded by default; threading requires -pthread and
# would need Botan/rnp/bindings all rebuilt to match).
JSONC_VERSION="${JSONC_VERSION:-0.17}"
JSONC_STAMP="${DEPS_BUILD}/.json-c-${JSONC_VERSION}-stamp"

if [[ ! -f "${JSONC_STAMP}" ]]; then
  echo "==> Building json-c ${JSONC_VERSION}"
  cd "${DEPS_SRC}"

  JSONC_TARBALL="json-c-${JSONC_VERSION}.tar.gz"
  if [[ ! -f "${JSONC_TARBALL}" ]]; then
    curl -fsSL "https://s3.amazonaws.com/json-c_releases/releases/json-c-${JSONC_VERSION}.tar.gz" \
      -o "${JSONC_TARBALL}"
  fi

  rm -rf "json-c-${JSONC_VERSION}"
  tar xf "${JSONC_TARBALL}"

  rm -rf "${DEPS_BUILD}/json-c-${JSONC_VERSION}"
  emcmake cmake -S "json-c-${JSONC_VERSION}" -B "${DEPS_BUILD}/json-c-${JSONC_VERSION}" \
    -DBUILD_SHARED_LIBS=OFF \
    -DDISABLE_WERROR=ON \
    -DBUILD_APPS=OFF \
    -DENABLE_THREADING=OFF \
    -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
    -DCMAKE_POLICY_VERSION=3.5 \
    -DCMAKE_INSTALL_PREFIX="${DEPS_PREFIX}"
  cmake --build "${DEPS_BUILD}/json-c-${JSONC_VERSION}" -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)"
  cmake --install "${DEPS_BUILD}/json-c-${JSONC_VERSION}"

  touch "${JSONC_STAMP}"
else
  echo "==> json-c ${JSONC_VERSION} already built (stamp exists)"
fi

# ---- Emscripten ports (zlib, bzip2) -----------------------------------
echo "==> Ensuring Emscripten ports (zlib, bzip2)"
embuilder build zlib bzip2

# ---- Final verification ------------------------------------------------
for lib in libbotan-3.a libjson-c.a; do
  test -f "${DEPS_PREFIX}/lib/${lib}" || {
    echo "${lib} missing at ${DEPS_PREFIX}/lib/" >&2
    find "${DEPS_PREFIX}" -name "${lib%.*}*" 2>/dev/null || true
    exit 1
  }
done

echo "==> Deps ready:"
ls -la "${DEPS_PREFIX}/lib/libbotan-3.a" "${DEPS_PREFIX}/lib/libjson-c.a"
