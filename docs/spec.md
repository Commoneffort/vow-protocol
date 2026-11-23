# Vow Protocol Specification

**X1 Network (SVM)** | Status: live on X1 mainnet | Anchor crate: `vow`

> **Vow is the user.** A Vow identity is a soulbound, stake-backed credential. It cannot be transferred or sold, and its account is never closed.

## Deployment

| Item | Value |
|---|---|
| Program | `7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ` |
| Config PDA | `2EeU6bRB248wEZquPPoSPyJLa5Ps93p3ubvQayq3UyBe` |
| Reserve PDA | `4mn9erFousBJp1NWCfCosZVjoatHnD16pZTN3K6t1pqC` |
| Stake pool | `X1SPaMUM1A8E1vKL8XQAB5rxKarJbqtWFFSNFs8f7Av` |
| Stake pool program | `XPoo1Fx6KNgeAzFcq2dPTo95bWGUSj5KdPVqYj9CZux` |
| pXNT mint | `pXNTyoqQsskHdZ7Q1rnP25FEyHHjissbs7n6RRN2nP5` |
| X1 ATA program | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` |
| Admin and upgrade authority | `BPmZB128HNvmzubP4rwJTTNLmk9ucK71Jtqt7MowKV8M` |
| RPC | `https://rpc.mainnet.x1.xyz` |
| Frontend | `https://x1vow.xyz` |

## Relationship to xNFT

| Concern | Vow Protocol | xNFT |
|---|---|---|
| Transferable | No | Yes |
| Session authority | Yes | No |
| On-chain reputation | Yes | No |
| Yield-bearing | Yes | Yes |
| Permanent credential | Yes | No (closes on redeem) |
| Marketplace | No | Yes |

## Identity lifecycle

```text
mint_vow ──► Active ──(lock elapsed)──► begin_unstake ──(next epoch)──► complete_unstake ──► Dormant
               ▲  │                                                                            │
               │  └─ add_stake (re-locks whole position)                                       │
               └───────────────────────────────── activate_stake ◄─────────────────────────────┘
```

- **Active** (`active_stake = true`): sessions allowed and yield spendable.
- **Unstaking**: `active_stake` stays true, but `shares = 0`, `yield_balance = 0`, and an `UnstakeEscrow` holds the fixed payout.
- **Dormant** (`active_stake = false`): no new sessions or spends. History is preserved.

Each wallet can mint one identity, enforced by `OwnerIndex`. Two legacy wallets minted several before enforcement and keep them; their index points at the oldest identity.

## Instructions

### Identity and stake

| Instruction | Signer | Behavior |
|---|---|---|
| `mint_vow` | Owner | Creates identity and `OwnerIndex`. Needs a fresh price and at least 1 XNT. |
| `add_stake` | Owner | Buys more shares. **Re-locks the whole position** for the new class and clears `matured`. |
| `activate_stake` | Owner | Dormant to Active with new stake and lock. Invalidates older sessions. |
| `begin_unstake` | Owner | Requires maturity. Fixes payout at `shares × price + yield_balance`. |
| `complete_unstake` | Owner | From the next epoch, pays the exact amount or reverts `ReserveIlliquid`. Needs this epoch's solvency check. Paused while insolvent. Sets Dormant. |
| `update_yield_mode` | Owner | Settles at a fresh price, then changes mode. |
| `harvest` | Anyone | Settles gain and applies the yield mode. |
| `backfill_owner_index` | Anyone | Creates the index for a pre-enforcement identity. |

### Sessions and yield

| Instruction | Signer | Behavior |
|---|---|---|
| `create_session` | Owner | Creates a session at a chosen index. |
| `revoke_session` | Owner | Sets `active = false`. |
| `close_session` | Owner | Reclaims rent if expired, revoked, invalidated, or the identity is dormant. |
| `yield_spend` | Session key | Pays from `yield_balance`, subject to all session checks. Needs this epoch's solvency check. Paused while insolvent. |
| `deposit_yield_balance` | Depositor | Credits any active identity that is not unstaking. Rejected while insolvent. |
| `withdraw_yield` | Owner | Withdraws `yield_balance` to the owner. Needs this epoch's solvency check. Paused while insolvent. |
| `record_commitment`, `record_fulfillment` | Owner | One-time commitment record updates per identity. |
| `create/update/close_authority_profile` | Profile wallet | Stores that wallet's session defaults. |

### Pool cranks (permissionless)

| Instruction | Behavior |
|---|---|
| `update_share_price` | Sets NAV price and records pool epoch and fees. Halts value-moving instructions if insolvent. |
| `flush_reserve_to_pool` | Deposits only idle XNT into the stake pool. |
| `withdraw_from_pool` | Redeems enough pXNT to cover current obligations, otherwise reverts `ReserveSufficient`. |

### Admin

| Instruction | Authority | Behavior |
|---|---|---|
| `initialize` | Upgrade authority | One-time setup. |
| `set_admin` | Admin + new admin | Both must sign. |
| `register_app` | Anyone | Creates a registry entry with no privileges. |
| `verify_app` | Admin | Sets a display flag. Not checked by `yield_spend`. |
| `block_app` | Admin | Rejects spends naming that program. |
| `set_mint_counter`, `dev_set_share_price`, `dev_fast_unlock` | Admin | Rejected when a stake pool is configured. |

There is no pause instruction. A program upgrade is the only kill switch.

## Session rules

Session PDA: `["session", vow_state, session_index_le4]`.

`yield_spend` requires all of the following:

1. The signer equals `session.session_key`, and `session.active` is true.
2. `expiry_ts == 0` or `now < expiry_ts`.
3. `start_ts >= vow.sessions_invalidated_at`, and the identity is active.
4. `calling_program` is executable.
5. If `program_count > 0`, the program is listed **and** its `["vow_caller"]` PDA signed, which proves the spend arrived by CPI from that program.
6. The `["app", calling_program]` registry is not blocked. An unregistered app is allowed.
7. Daily, lifetime, and velocity limits hold. A limit of `0` means no limit. Counters reset at 00:00 UTC.
8. `yield_balance` covers the amount, and the reserve keeps its rent floor.
9. The protocol is not paused for insolvency, and its solvency was checked this epoch. Prepend `update_share_price`.

An **unrestricted** session (`program_count == 0`) can pay any destination up to its limits. Vow does not constrain the destination in any mode, so whitelisted programs must validate it themselves.

When a session uses an `AuthorityProfile`, zero-valued daily limit, lifetime limit, and expiry inherit the profile's defaults, and an empty program list inherits the profile's list. `default_expiry_days = 0` means no expiry.

Invalidation sets `sessions_invalidated_at` strictly after the current time, and new sessions start at or after it, so no earlier session survives, even within the same second.

## Classes

| Class | Name | XNT (whole units) | Lock |
|---|---|---|---|
| 0 | Ruby | 1–100 | 30 days |
| 1 | Opal | 101–300 | 90 days |
| 2 | Topaz | 301–500 | 180 days |
| 3 | Emerald | 501–1,000 | 365 days |
| 4 | Aquamarine | 1,001–2,000 | 547 days |
| 5 | Sapphire | 2,001–5,000 | 730 days |
| 6 | Amethyst | 5,001–10,000 | 1,095 days |
| 7 | Xenturion | 10,001+ | 1,825 days |

Class uses principal rounded down to whole XNT.

## PDA seeds

| Account | Seeds |
|---|---|
| ProtocolConfig | `["config"]` |
| Reserve | `["reserve"]` |
| VowAssetId | `["vow_asset", nonce_le8]` |
| VowState | `["vow", asset_id]` |
| UnstakeEscrow | `["unstake", vow_state]` |
| OwnerIndex | `["owner_index", wallet]` |
| SessionAccount | `["session", vow_state, session_index_le4]` |
| AuthorityProfile | `["authority_profile", wallet, profile_id_8]` |
| AppRegistry | `["app", program_id]` |
| CommitmentRecord | `["commitment", wallet]` |
| Commitment gates | `["cr_commit" or "cr_fulfill", commitment_record, vow_state]` |
| dApp CPI signer | `["vow_caller"]` under the dApp's program |

See [pool-share-model.md](pool-share-model.md) for accounting, [commitment-model.md](commitment-model.md) for reputation, and [integration.md](integration.md) for dApp integration.
