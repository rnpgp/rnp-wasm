#!/usr/bin/env bash
# scripts/analyze-bundle.sh
# Emits a Markdown report describing the contents of dist/module.wasm:
#   - section sizes (wasm-objdump -h)
#   - import count + names
#   - export count
#   - function count
#   - top-N largest functions (wasm-objdump -d | size analysis)
#
# Output: dist/bundle-analysis.md

set -euo pipefail
IFS=$'\n\t'

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

OUT="${1:-dist/bundle-analysis.md}"
WASM="${WASM:-dist/module.wasm}"

if [[ ! -f "${WASM}" ]]; then
  echo "WASM file not found at ${WASM}; run scripts/build.sh first" >&2
  exit 2
fi

# Prefer emsdk's wasm-objdump; fall back to system.
WASM_OBJDUMP="${WASM_OBJDUMP:-}"
if [[ -z "${WASM_OBJDUMP}" ]]; then
  if [[ -n "${EMSDK:-}" && -x "${EMSDK}/upstream/bin/wasm-objdump" ]]; then
    WASM_OBJDUMP="${EMSDK}/upstream/bin/wasm-objdump"
  elif command -v wasm-objdump >/dev/null; then
    WASM_OBJDUMP="wasm-objdump"
  else
    echo "wasm-objdump not found. Activate emsdk or install system wasm-objdump." >&2
    exit 2
  fi
fi

mkdir -p "$(dirname "${OUT}")"

WASM_BYTES=$(wc -c < "${WASM}")
WASM_GZ=$(gzip -c "${WASM}" | wc -c)

{
  echo "# rnp-wasm bundle analysis"
  echo
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "## Size"
  echo
  echo "| File | Bytes | Gzipped |"
  echo "| ---- | ----: | ------: |"
  echo "| \`${WASM}\` | ${WASM_BYTES} | ${WASM_GZ} |"
  echo
  echo "## Sections"
  echo
  echo '```'
  "${WASM_OBJDUMP}" -h "${WASM}"
  echo '```'
  echo
  echo "## Imports (top 30 by module.name)"
  echo
  echo '```'
  "${WASM_OBJDUMP}" -x "${WASM}" | grep -E 'Import|^\s+- ' | head -40
  echo '```'
  echo
  echo "## Exports (top 30)"
  echo
  echo '```'
  "${WASM_OBJDUMP}" -x "${WASM}" | grep -E 'Export|func\[' | head -30
  echo '```'
  echo
  echo "## Function count"
  echo
  FUNC_COUNT=$("${WASM_OBJDUMP}" -x "${WASM}" | grep -cE 'func\[\]')
  echo "- ${FUNC_COUNT} functions"
  echo
  echo "## Top 20 largest functions (rough heuristic)"
  echo
  echo '```'
  "${WASM_OBJDUMP}" -d "${WASM}" \
    | awk '/^[0-9a-f]+ func\[/ { name=$0; size=0; next } /^$/ { if (size>0) print size, name; size=0; next } { size++ }' \
    | sort -rn | head -20
  echo '```'
} > "${OUT}"

echo "Wrote ${OUT}"
