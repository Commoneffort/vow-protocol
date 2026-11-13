#!/usr/bin/env bash
# After `anchor build`: copy the generated IDL/types and the canonical SDK sources
# (frontend/src/sdk is the source of truth) into the standalone sdk/ package.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cp "$ROOT/target/idl/vow.json"  "$ROOT/frontend/src/sdk/vow.json"
cp "$ROOT/target/types/vow.ts"  "$ROOT/frontend/src/sdk/vow-types.ts"
for f in client.ts pda.ts types.ts vow.json vow-types.ts; do
  cp "$ROOT/frontend/src/sdk/$f" "$ROOT/sdk/src/$f"
done
echo "IDL + SDK synced (frontend/src/sdk → sdk/src)"
