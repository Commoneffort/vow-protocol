# IDNFT Identity Model

## What an IDNFT Represents

An IDNFT is a **permanent soulbound identity credential** backed by a stake position.

It is not a financial instrument. It cannot be transferred.

```
IDNFT identity structure:

Wallet (permanent owner)
└── IdNftState (never closed)
    ├── Stake Position — pool shares while Active
    ├── Yield Balance — crystallised yield claim
    ├── Sessions — delegated app authority (Active only)
    └── Reputation Layer — append-only historical record
        ├── first_staked_at
        ├── total_commitments
        ├── total_fulfilled
        ├── cumulative_stake_days
        └── highest_class_ever
```

---

## Lifecycle

```
mint_idnft()
    → Active Identity (active_stake = true)
    → Sessions can be created
    → Yield accrues

begin_unstake() + complete_unstake()
    → Dormant Identity (active_stake = false)
    → Principal + yield returned to wallet
    → All sessions invalidated
    → IdNftState stays on-chain with full history

activate_stake()
    → Active Identity again
    → New stake, new lock period
    → Old sessions invalidated (fresh start)
    → Reputation fields increment; never reset
```

---

## Reputation: What Never Resets

| Field | Set by | Updated by | Never reset by |
|---|---|---|---|
| `first_staked_at` | `mint_idnft` | — (immutable) | anything |
| `total_commitments` | `mint_idnft` (=1) | `activate_stake` (+1) | unstake |
| `total_fulfilled` | — | `complete_unstake` if matured | activate_stake |
| `cumulative_stake_days` | — | `complete_unstake` (+=days) | activate_stake |
| `highest_class_ever` | `mint_idnft` | `activate_stake` if higher | anything |

A Xenturion IDNFT (class 7) with `total_fulfilled = 3` proves:
- The holder committed 10,001+ XNT at least three times
- Each time holding to maturity (1,825+ days)
- From the same wallet, across multiple stake cycles
- All verifiable on-chain, permanently

---

## Principal Protection

`principal_lamports` represents the most recent stake deposit. It is **never directly spendable** via sessions.

Only `yield_balance` can be accessed via `yield_spend()` (session-gated) or `withdraw_yield()` (owner-gated).

`yield_balance` = crystallised yield only. `harvest()` must be called first.

---

## Session Scope

Sessions are scoped to specific SVM programs (`allowed_program_ids`). A session cannot:
- Access principal
- Spend more than its `daily_limit` or `lifetime_limit`
- Call a program not in its allowlist
- Be used by anyone other than the holder of the session keypair
- Be created when `active_stake = false`

Sessions are invalidated automatically when:
- `complete_unstake()` is called (identity goes dormant)
- `activate_stake()` is called (new stake cycle begins)
