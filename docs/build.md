# Build guide

## Prerequisites

- Docker 24+ (recommended; toolchain is pinned via `Dockerfile`).
- Or, locally: Emscripten 3.1.74, CMake 3.28+, Ninja, Python 3.10+.

## Quick start

```sh
git clone --recurse-submodules <repo-url> rnp-wasm
cd rnp-wasm

# Full build (Docker path)
scripts/build.sh --docker
```

Output: `dist/rnp.wasm`, `dist/rnp.mjs`, `dist/rnp.js`, `dist/*.d.ts`.

## What the build does

1. **`scripts/build-deps.sh`** — Builds Botan 3.5.0 under Emscripten with a curated module set. Pulls zlib and bzip2 via `embuilder`. Outputs to `/opt/rnp-wasm/deps/`.
2. **`scripts/build-rnp.sh`** — Builds rnp (`third-party/rnp`) as a static library with `BUILD_SHARED_LIBS=OFF`, `BUILD_TESTING=OFF`, `CRYPTO_BACKEND=botan`. Outputs `librnp.a`.
3. **`scripts/build-bindings.sh`** — Compiles `src/cpp/*.cpp` and links with `librnp.a + libbotan-3.a + zlib + bzip2` into a single `.wasm` + `.js` loader.
4. **`scripts/package.sh`** — Emits TypeScript declarations via `tsc`, copies LICENSE/README, computes SHA-256 checksums.

## Local (non-Docker) build

Requires Emscripten activated (`emsdk_env.sh` sourced). Replace `--docker` with the equivalent env vars:

```sh
export DEPS_PREFIX=$PWD/build/deps
export DEPS_SRC=$PWD/build/src
export DEPS_BUILD=$PWD/build
scripts/build.sh
```

## Variants

```sh
scripts/build.sh --variant pqc        # ML-KEM / ML-DSA / SLH-DSA
scripts/build.sh --variant brainpool  # Brainpool curves
scripts/build.sh --variant sm         # SM2 / SM3 / SM4
```

Outputs to `dist/rnp-<variant>.{wasm,mjs}`. The default variant is `default`.

## Upstream probe (track rnp main)

```sh
RNP_REF=origin/main scripts/build.sh --rnp-ref origin/main
```

The submodule pointer is not modified; the probe is in-memory only.

## Cleaning

```sh
scripts/clean.sh        # wipes dist/ build/ — preserves third-party/rnp
```

## Inspecting the image

```sh
scripts/dev-shell.sh    # drops into the container with the repo mounted
```
