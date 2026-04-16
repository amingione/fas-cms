#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITHUB_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TARGET="$GITHUB_ROOT/scripts/dotenvx-env-audit.sh"

if [[ ! -f "$TARGET" ]]; then
  echo "Error: missing shared audit script: $TARGET" >&2
  echo "Expected repo layout: <GitHub>/{fas-cms-fresh,fas-dash,fas-medusa,fas-sanity,scripts}/" >&2
  exit 1
fi

exec bash "$TARGET" "$@"

