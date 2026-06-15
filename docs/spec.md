# Vow Protocol Specification

**X1 Network (SVM)** | Status: Active (testnet)

---

## Design Principle

> **Vow is the user.**

Vow Protocol is a soulbound identity primitive. It is not a financial instrument. It cannot be transferred, sold, or traded. It exists as a permanent on-chain credential tied to the wallet that created it.

---

## Program ID

```
HRwze7aVokE5fjfm2qVn9rVq5CAAFiD3BPEFMGei8edF
```

RPC: `https://rpc.testnet.x1.xyz`
Frontend: `https://vow-protocol.vercel.app`
Source: `/home/owlx1/IDNFT/`

### Testnet State
- Protocol initialized ✅
- Config PDA: `2VnPbGXq2j51T9a6jimsTD6amT7u1rr3YCZ4sM8JZjjQ`
- StakePool PDA: `8wVC62cWYKMv5MKH8pmtLufdYnVZcByTbd532kTZJWTM`
- Reserve PDA: `4vurpNAWAgYoRKoDsE22tynHthWx9eoaB8peeyXdDcy6`
- Validators: 0 (run `add-validator.ts` to register)

### After a new deploy, run in order:
```bash
cd /home/owlx1/IDNFT
npx ts-node --skip-project scripts/initialize-protocol.ts
npx ts-node --skip-project scripts/add-validator.ts
npx ts-node --skip-project scripts/activate-stake.ts
```

---

## Relationship to xNFT

| Concern | Vow Protocol | xNFT |
|---|---|---|
| Transferable | No (soulbound) | Yes |
| Session authority | Yes | No (legacy only) |
| App-scoped permissions | Yes | No |
| On-chain reputation | Yes | No |
| Yield-bearing | Yes | Yes |
| Staking pool | Shared | Shared |
| Permanent credential | Yes | No (closes on redeem) |
| Marketplace | No | Yes |

---

## Identity Lifecycle

A Vow identity has two states:

```
Active Identity   (active_stake = true)
  Sessions allowed, yield spendable, stake backing the identity

Dormant Identity  (active_stake = false)
  No new sessions, yield spending blocked,
  full history and reputation preserved,
  can be re-activated via activate_stake()
```

The identity account itself is **never closed**. It exists permanently on-chain as a credential regardless of stake state.

---

## Instructions

### Identity

| Instruction | Description |
|---|---|
| `mint_idnft` | Create a new Vow identity with an initial stake deposit. Sets `active_stake = true`. |
| `activate_stake` | Transition Dormant → Active. Deposits new stake. Requires `!active_stake`. |
| `begin_unstake` | Initiate unstake. Requires maturity. Creates `UnstakeEscrow`. |
| `complete_unstake` | Finalize unstake. Withdraws principal + yield. Sets `active_stake = false`. Identity persists. |
| `harvest` | Settle accrued gain from share price delta. |
| `update_yield_mode` | Change Compound / Hybrid / Treasury. Requires `active_stake`. |
| `withdraw_yield` | Withdraw `yield_balance` to wallet. |

### Sessions

| Instruction | Description |
|---|---|
| `create_session` | Create a session key with program allowlist and spend limits. Requires `active_stake`. `program_count == 0` means any program allowed. `expiry_ts == 0` means no expiry. |
| `revoke_session` | Mark a session inactive. Owner only. |
| `close_session` | Reclaim rent. Allowed when expired, revoked, invalidated, or identity dormant. |
| `yield_spend` | CPI endpoint — authorized program spends yield on behalf of identity owner via session key. |

### Admin / Pool

Same as xNFT: `initialize`, `add_validator`, `remove_validator`, `score_validator`, `update_share_price`, `flush_reserve_to_pool`, `rebalance_pool`, `initialize_pool_stake`, `delegate_pool_stake`, `deactivate_pool_stake`, `withdraw_stake_to_reserve`.

---

## Soulbound Invariants

1. `IdNftState.owner` is set at mint and **never changes**
2. The `IdNftState` account is **never closed**
3. There is **no transfer instruction**
4. There is no ownership migration of any kind
5. No marketplace integration code exists in this program

---

## Session Key Design

Session PDAs are derived from `[b"session", idnft_state, session_index_le4]` — using a **user-chosen u32 index** rather than the session key pubkey. This enables deterministic recovery: any device with the wallet seed can enumerate all session slots without scanning the chain.

- `session_index` is chosen by the user (0, 1, 2, …)
- `expiry_ts == 0` means the session never expires
- `program_count == 0` means the session is unrestricted (any executable program may call yield_spend)
- `program_count > 0` restricts yield_spend to the listed program IDs only

---

## Reputation Layer

These fields in `IdNftState` are **append-only** — never reset by unstake or activate_stake:

| Field | Description |
|---|---|
| `first_staked_at` | Unix timestamp of original mint. Immutable. |
| `total_commitments` | Count of mint + activate_stake calls. |
| `total_fulfilled` | Count of complete_unstake calls where matured == true. |
| `cumulative_stake_days` | Running total days with active stake. Updated at each unstake. |
| `highest_class_ever` | Best class tier ever achieved. Only ever increases. |

---

## Classes

| Class | Name | Min XNT | Max XNT | Lock (days) |
|---|---|---|---|---|
| 0 | Ruby | 1 | 100 | 30 |
| 1 | Opal | 101 | 300 | 90 |
| 2 | Topaz | 301 | 500 | 180 |
| 3 | Emerald | 501 | 1,000 | 365 |
| 4 | Aquamarine | 1,001 | 2,000 | 547 |
| 5 | Sapphire | 2,001 | 5,000 | 730 |
| 6 | Amethyst | 5,001 | 10,000 | 1,095 |
| 7 | Xenturion | 10,001+ | unlimited | 1,825 |

`class` reflects the current stake tier. `highest_class_ever` persists the historical maximum.

---

## PDA Seeds

| Account | Seeds |
|---|---|
| ProtocolConfig | `["config"]` |
| StakePool | `["stake_pool"]` |
| Reserve | `["reserve"]` |
| ValidatorEntry | `["validator", vote_account]` |
| PoolStake | `["pool_stake", vote_account]` |
| PoolAuthority | `["pool_authority"]` |
| IdNftAssetId | `["idnft_asset", nonce_le8]` |
| IdNftState | `["idnft", asset_id]` |
| UnstakeEscrow | `["unstake", idnft_state]` |
| SessionAccount | `["session", idnft_state, session_index_le4]` |
| AuthorityProfile | `["authority_profile", wallet, profile_id]` |
| AppRegistry | `["app", program_id]` |
| CommitmentRecord | `["commitment", wallet]` |

---

## Survivability

All state is on-chain. Any developer can rebuild tooling from the IDL alone.
