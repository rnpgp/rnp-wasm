#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"
mkdir -p dist
if command -v npx >/dev/null 2>&1; then
  npx -y tsc -p tsconfig.build.json 2>/dev/null \
    || echo "WARN: tsc failed; shipping without .d.ts" >&2
fi
[[ -f LICENSE ]] && cp LICENSE dist/ || true
[[ -f README.md ]] && cp README.md dist/ || true
[[ -f CHANGELOG.md ]] && cp CHANGELOG.md dist/ || true
if command -v sha256sum >/dev/null; then
  ( cd dist && for f in rnp.wasm rnp.js rnp.mjs; do
      [[ -f "$f" ]] && sha256sum "$f" > "$f.sha256" || true
    done )
elif command -v shasum >/dev/null; then
  ( cd dist && for f in rnp.wasm rnp.js rnp.mjs; do
      [[ -f "$f" ]] && shasum -a 256 "$f" > "$f.sha256" || true
    done )
fi
echo "==> Packaged"
ls -la dist/
