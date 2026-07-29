# syntax=docker/dockerfile:1.7
#
# Reproducible build image for rnp-wasm.
# Pins: Emscripten, Botan, zlib, bzip2.
# Bumping any ARG here changes the produced .wasm; do so deliberately.

ARG EMSDK_VERSION=3.1.74
ARG BOTAN_VERSION=3.12.0
ARG JSONC_VERSION=0.17
ARG ZLIB_VERSION=1.3.1
ARG BZIP2_VERSION=1.0.8

FROM emscripten/emsdk:${EMSDK_VERSION}

ARG BOTAN_VERSION
ARG JSONC_VERSION
ARG ZLIB_VERSION
ARG BZIP2_VERSION

ENV BOTAN_VERSION=${BOTAN_VERSION} \
    JSONC_VERSION=${JSONC_VERSION} \
    ZLIB_VERSION=${ZLIB_VERSION} \
    BZIP2_VERSION=${BZIP2_VERSION} \
    DEPS_PREFIX=/opt/rnp-wasm/deps \
    DEPS_SRC=/opt/rnp-wasm/src \
    DEPS_BUILD=/opt/rnp-wasm/build \
    EM_CC_CACHE=1

# Build tooling. emsdk already ships emcc/emcmake/embuilder/python3.
# Use unpinned cmake/ninja — the exact versions on the base image are fine;
# pinning to unavailable package versions fails apt-get.
USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl xz-utils pkg-config jq \
      cmake ninja-build \
 && rm -rf /var/lib/apt/lists/*

# Pre-fetch upstream source tarballs. Compilation happens in scripts/build-deps.sh.
RUN install -d -o emscripten -g emscripten \
      "${DEPS_SRC}" "${DEPS_PREFIX}" "${DEPS_BUILD}" \
 && curl -fsSL "https://botan.randombit.net/releases/Botan-${BOTAN_VERSION}.tar.xz" \
    -o "${DEPS_SRC}/botan-${BOTAN_VERSION}.tar.xz" \
 && curl -fsSL "https://s3.amazonaws.com/json-c_releases/releases/json-c-${JSONC_VERSION}.tar.gz" \
    -o "${DEPS_SRC}/json-c-${JSONC_VERSION}.tar.gz" \
 && curl -fsSL "https://zlib.net/fossils/zlib-${ZLIB_VERSION}.tar.gz" \
    -o "${DEPS_SRC}/zlib-${ZLIB_VERSION}.tar.gz" \
 && curl -fsSL "https://sourceware.org/pub/bzip2/bzip2-${BZIP2_VERSION}.tar.gz" \
    -o "${DEPS_SRC}/bzip2-${BZIP2_VERSION}.tar.gz" \
 && chown -R emscripten:emscripten /opt/rnp-wasm

WORKDIR /work
# emscripten user is the default non-root user in the base image.
USER emscripten

RUN emcc --version | head -1 && embuilder --help >/dev/null && cmake --version | head -1
