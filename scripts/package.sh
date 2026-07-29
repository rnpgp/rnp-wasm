#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"
mkdir -p dist

# Compile TypeScript wrapper to dist/. Emits both .js and .d.ts so consumers
# get the public API (initRnp, Rnp, Ffi, Keyring, Key, SignOperation, ...) AND
# the type declarations.
#
# The Embind-emitted dist/module.js + dist/module.wasm sit alongside the
# compiled TS files. ts/wasm-module.ts imports "../dist/module.js" which
# resolves correctly from the compiled dist/wasm-module.js.
#
# IMPORTANT: do NOT use `npx -y tsc` — there's an unrelated deprecated
# `tsc@2.0.4` package on npm that npx would install instead of TypeScript.
# Use the local typescript install via npm run, or fall back to the binary.
if [[ -x ./node_modules/.bin/tsc ]]; then
  TSC=./node_modules/.bin/tsc
elif command -v tsc >/dev/null 2>&1; then
  TSC=tsc
else
  echo "ERROR: typescript not installed; run 'npm install' first" >&2
  exit 1
fi

if ! "$TSC" -p tsconfig.build.json; then
  echo "ERROR: tsc failed; refusing to ship a broken tarball" >&2
  exit 1
fi

echo "==> Packaged"
ls -la dist/
