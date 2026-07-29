#!/usr/bin/env bash
# scripts/clean.sh
# Wipes local build outputs. NEVER deletes third-party/rnp (source is sacred).

set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

echo "==> Removing build artifacts (preserving third-party/rnp submodule)"
rm -rf build/ dist/ .cache/ coverage/ test-results/ playwright-report/

echo "==> Clean"
