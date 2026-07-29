#!/usr/bin/env bash
# scripts/size-budget.sh {check|update}
# Compares gzip size of dist/module.wasm against size-budget.json baseline.

set -euo pipefail
IFS=$'\n\t'

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

BUDGET_FILE="size-budget.json"
ACTION="${1:-check}"

if [[ ! -f dist/module.wasm ]]; then
  echo "dist/module.wasm not found; run scripts/build.sh first" >&2
  exit 2
fi

current_size=$(gzip -c dist/module.wasm | wc -c)

case "${ACTION}" in
  update)
    cat > "${BUDGET_FILE}" <<EOF
{
  "module.wasm.gz": ${current_size},
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    echo "Updated ${BUDGET_FILE}: module.wasm.gz = ${current_size} bytes"
    ;;
  check)
    if [[ ! -f "${BUDGET_FILE}" ]]; then
      echo "No baseline; run: scripts/size-budget.sh update"
      exit 2
    fi
    baseline=$(jq -r '.["module.wasm.gz"]' "${BUDGET_FILE}")
    delta=$(( current_size - baseline ))
    pct=$(( (delta * 100) / (baseline == 0 ? 1 : baseline) ))
    echo "baseline=${baseline} current=${current_size} delta=${delta} (${pct}%)"
    if (( delta > 51200 )); then
      echo "FAIL: absolute delta > 50KB" >&2
      exit 1
    fi
    if (( pct > 5 )); then
      echo "FAIL: relative delta > 5%" >&2
      exit 1
    fi
    echo "OK"
    ;;
  *)
    echo "usage: $0 {check|update}" >&2
    exit 2
    ;;
esac
