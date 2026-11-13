"""Snapshot live mainnet accounts for tests/run-mainnet-fork-test.sh (read-only).

Writes solana-test-validator `--account` JSON files to <work>/accounts/ and, for every
VowState, a local owner keypair to <work>/owners/<vow_state>.json whose pubkey is
patched into the snapshot's `owner` field so the test can sign as that user.
Usage: fork_snapshot.py <rpc> <vow_program_id> <stake_pool> <work_dir>
"""
import base64
import json
import os
import subprocess
import sys
import urllib.request

ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def b58encode(b: bytes) -> str:
    n = int.from_bytes(b, "big")
    out = ""
    while n:
        n, r = divmod(n, 58)
        out = ALPHABET[r] + out
    pad = len(b) - len(b.lstrip(b"\0"))
    return "1" * pad + out


def b58decode(s: str) -> bytes:
    n = 0
    for c in s:
        n = n * 58 + ALPHABET.index(c)
    raw = n.to_bytes((n.bit_length() + 7) // 8, "big")
    pad = len(s) - len(s.lstrip("1"))
    return b"\0" * pad + raw


rpc_url, vow_id, pool_addr, work = sys.argv[1:5]


def rpc(method, params):
    req = urllib.request.Request(
        rpc_url,
        data=json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode(),
        headers={"Content-Type": "application/json"},
    )
    return json.load(urllib.request.urlopen(req))["result"]


def write_account(pubkey, acct, data: bytes):
    with open(os.path.join(work, "accounts", pubkey + ".json"), "w") as f:
        json.dump(
            {
                "pubkey": pubkey,
                "account": {
                    "lamports": acct["lamports"],
                    "data": [base64.b64encode(data).decode(), "base64"],
                    "owner": acct["owner"],
                    "executable": acct["executable"],
                    "rentEpoch": 0,
                    "space": len(data),
                },
            },
            f,
        )


def snapshot(pubkey):
    acct = rpc("getAccountInfo", [pubkey, {"encoding": "base64"}])["value"]
    if acct is None:
        raise SystemExit(f"missing account {pubkey}")
    write_account(pubkey, acct, base64.b64decode(acct["data"][0]))
    return acct


def pda(seeds, program):
    out = subprocess.check_output(
        ["solana", "find-program-derived-address", program] + seeds, text=True
    )
    return out.split()[0]


# Stake pool + the accounts DepositSol / WithdrawSol touch.
pool = base64.b64decode(snapshot(pool_addr)["data"][0])
for off in (131, 163, 195):  # reserve_stake, pool_mint, manager_fee_account
    snapshot(b58encode(pool[off : off + 32]))

config = pda(["string:config"], vow_id)
reserve = pda(["string:reserve"], vow_id)
cfg = base64.b64decode(snapshot(config)["data"][0])
snapshot(reserve)
mint = b58encode(cfg[8 + 32 + 16 + 16 + 8 + 8 + 8 + 32 + 8 + 32 : 8 + 32 + 16 + 16 + 8 + 8 + 8 + 32 + 8 + 64])
token_accts = rpc(
    "getTokenAccountsByOwner", [reserve, {"mint": mint}, {"encoding": "base64"}]
)["value"]
for t in token_accts:
    write_account(t["pubkey"], t["account"], base64.b64decode(t["account"]["data"][0]))

# Every account owned by the vow program; VowStates (214 bytes) get local owners.
VOW_STATE_LEN = 214
OWNER_INDEX_LEN = 73
CONFIG_LEN = 202
# Rebuild pre-migration state (default) so the migration path stays testable after the
# 2026-11-13 upgrade: config freshness bytes zeroed, OwnerIndex accounts dropped.
pre_migration = os.environ.get("FORK_PRE_MIGRATION", "1") == "1"
owners = {}
for a in rpc("getProgramAccounts", [vow_id, {"encoding": "base64"}]):
    data = bytearray(base64.b64decode(a["account"]["data"][0]))
    if pre_migration and len(data) == OWNER_INDEX_LEN:
        continue
    if pre_migration and len(data) == CONFIG_LEN:
        data[96:128] = bytes(32)  # price_epoch, fee ppm, _reserved (formerly merkle_tree)
    if len(data) == VOW_STATE_LEN:
        real_owner = b58encode(bytes(data[40:72]))
        if real_owner not in owners:
            kp = os.path.join(work, "owners", real_owner + ".json")
            if not os.path.exists(kp):
                subprocess.check_call(
                    ["solana-keygen", "new", "--no-bip39-passphrase", "--silent", "-o", kp]
                )
            owners[real_owner] = subprocess.check_output(
                ["solana-keygen", "pubkey", kp], text=True
            ).strip()
        data[40:72] = b58decode(owners[real_owner]).rjust(32, b"\0")
    write_account(a["pubkey"], a["account"], bytes(data))

json.dump(owners, open(os.path.join(work, "owners", "map.json"), "w"), indent=1)
print(f"snapshot: {len(os.listdir(os.path.join(work, 'accounts')))} accounts, {len(owners)} owners")
