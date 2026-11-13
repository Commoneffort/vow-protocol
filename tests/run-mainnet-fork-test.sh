#!/usr/bin/env bash
# Mainnet-fork fairness test.
#
# Clones the live X1 Foundation stake pool + the live Vow config, reserve, reserve pXNT
# ATA and every VowState into a throwaway local validator, loads the NEW vow build at
# the real program ID (simulating the upgrade), then runs tests/mainnet-fork.test.ts:
# migrate → mint → flush → harvest/spend → unstake EVERY identity, checking each one is
# paid exactly its fair share.
#
# VowState owners are rewritten to local test keypairs so the test can sign for them;
# nothing touches mainnet (read-only RPC calls only).
#
#   tests/run-mainnet-fork-test.sh
#   SKIP_BUILD=1 WORK_DIR=/some/dir tests/run-mainnet-fork-test.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK_DIR:-$(mktemp -d)}"
RPC_PORT="${RPC_PORT:-28899}"
MAINNET="${MAINNET_RPC:-https://rpc.mainnet.x1.xyz}"
VOW_ID=7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ
STAKE_POOL_PROGRAM=XPoo1Fx6KNgeAzFcq2dPTo95bWGUSj5KdPVqYj9CZux
POOL=X1SPaMUM1A8E1vKL8XQAB5rxKarJbqtWFFSNFs8f7Av

[[ -z "${SKIP_BUILD:-}" ]] && (cd "$ROOT" && anchor build)

mkdir -p "$WORK/accounts" "$WORK/owners"
WALLET="$WORK/wallet.json"
[[ -f "$WALLET" ]] || solana-keygen new --no-bip39-passphrase --silent -o "$WALLET"

# ── Snapshot mainnet state ───────────────────────────────────────────────────
python3 "$ROOT/tests/fixtures/fork_snapshot.py" "$MAINNET" "$VOW_ID" "$POOL" "$WORK"

ACCOUNT_ARGS=()
for f in "$WORK"/accounts/*.json; do
  ACCOUNT_ARGS+=(--account "$(basename "$f" .json)" "$f")
done

solana-test-validator --reset --quiet --ledger "$WORK/ledger" \
  --rpc-port "$RPC_PORT" --faucet-port $((RPC_PORT + 1001)) \
  --gossip-port $((RPC_PORT - 898)) --dynamic-port-range "$((RPC_PORT - 880))-$((RPC_PORT - 830))" \
  --slots-per-epoch 64 \
  --mint "$(solana-keygen pubkey "$WALLET")" \
  --url "$MAINNET" --clone-upgradeable-program "$STAKE_POOL_PROGRAM" \
  --upgradeable-program "$VOW_ID" "${VOW_SO:-$ROOT/target/deploy/vow.so}" "$WALLET" \
  "${ACCOUNT_ARGS[@]}" &
VAL_PID=$!
trap 'kill $VAL_PID 2>/dev/null || true' EXIT

URL="http://127.0.0.1:$RPC_PORT"
for _ in $(seq 1 90); do
  solana -u "$URL" cluster-version >/dev/null 2>&1 && break
  sleep 1
done

cd "$ROOT"
if [[ -n "${FORK_CMD:-}" ]]; then
  # Run an arbitrary command against the fork instead of the test suite, e.g. the crank:
  #   FORK_CMD='npx ts-node … scripts/daily_crank.ts' tests/run-mainnet-fork-test.sh
  RPC="$URL" CRANK_WALLET="$WALLET" PAYER="$WALLET" bash -c "$FORK_CMD"
else
  ANCHOR_PROVIDER_URL="$URL" ANCHOR_WALLET="$WALLET" FORK_WORK_DIR="$WORK" \
    npx ts-mocha -p ./tsconfig.json -t 1000000 tests/mainnet-fork.test.ts
fi
