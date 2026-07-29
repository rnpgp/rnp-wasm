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
if command -v npx >/dev/null 2>&1; then
  if ! npx -y tsc -p tsconfig.build.json; then
    echo "ERROR: tsc failed; refusing to ship a broken tarball" >&2
    exit 1
  fi
fi

# dist/ already has LICENSE/README/CHANGELOG copied by build-bindings.sh's
# stale-artifact cleanup step (which rm's only rnp*/module* patterns, not the
# doc files). Keep dist/ focused on artifacts; the tarball's top-level files
# are pulled from the workspace root by npm via the "files" field.
rm -f dist/LICENSE dist/README.md dist/CHANGELOG.md

echo "==> Packaged"
ls -la dist/
