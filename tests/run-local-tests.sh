#!/usr/bin/env bash
# Runs the local suites (tests/protocol.test.ts, then tests/yield-spend-cpi.test.ts)
# against a throwaway validator with the vow program (upgradeable, authority = the
# test wallet) and the test-only CPI caller loaded. For pool/NAV/fairness coverage see
# tests/run-mainnet-fork-test.sh.
#
# Uses non-default ports so it never collides with a real validator on this host
# (8899/8900 are in use here).
#
#   tests/run-local-tests.sh            # build everything, run tests
#   SKIP_BUILD=1 tests/run-local-tests.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOCK_DIR="$ROOT/tests/fixtures/vow-test-caller"
WORK="${WORK_DIR:-$(mktemp -d)}"
RPC_PORT="${RPC_PORT:-28899}"

if [[ -z "${SKIP_BUILD:-}" ]]; then
  (cd "$ROOT" && anchor build)
  (cd "$MOCK_DIR" && cargo build-sbf)
fi

VOW_ID="$(solana-keygen pubkey "$ROOT/target/deploy/vow-keypair.json")"
MOCK_ID="$(solana-keygen pubkey "$MOCK_DIR/target/deploy/vow_test_caller-keypair.json")"
WALLET="$WORK/wallet.json"
[[ -f "$WALLET" ]] || solana-keygen new --no-bip39-passphrase --silent -o "$WALLET"

solana-test-validator --reset --quiet --ledger "$WORK/ledger" \
  --rpc-port "$RPC_PORT" --faucet-port $((RPC_PORT + 1001)) \
  --gossip-port $((RPC_PORT - 898)) --dynamic-port-range "$((RPC_PORT - 880))-$((RPC_PORT - 830))" \
  --slots-per-epoch 64 \
  --mint "$(solana-keygen pubkey "$WALLET")" \
  --upgradeable-program "$VOW_ID" "$ROOT/target/deploy/vow.so" "$WALLET" \
  --bpf-program "$MOCK_ID" "$MOCK_DIR/target/deploy/vow_test_caller.so" &
VAL_PID=$!
trap 'kill $VAL_PID 2>/dev/null || true' EXIT

URL="http://127.0.0.1:$RPC_PORT"
for _ in $(seq 1 60); do
  solana -u "$URL" cluster-version >/dev/null 2>&1 && break
  sleep 1
done

cd "$ROOT"
ANCHOR_PROVIDER_URL="$URL" ANCHOR_WALLET="$WALLET" MOCK_CALLER_ID="$MOCK_ID" \
  npx ts-mocha -p ./tsconfig.json -t 1000000 tests/protocol.test.ts tests/yield-spend-cpi.test.ts
