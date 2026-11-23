# Vow Identity and Commitment Model

A Vow identity is a permanent soulbound credential backed by a stake position.

```text
Wallet (permanent owner)
├── OwnerIndex: the wallet's canonical identity
└── VowState (never closed)
    ├── Stake position: pool shares while Active
    ├── Yield balance: fixed XNT claim
    ├── Sessions: delegated spending authority
    └── Reputation: historical record
```

## Reputation on VowState

These fields are the most reliable reputation signal because only the identity's own stake lifecycle updates them.

| Field | Updated by | Meaning |
|---|---|---|
| `first_staked_at` | `mint_vow` | Original mint time. Immutable. |
| `total_commitments` | `mint_vow`, `activate_stake` | Stake cycles started. |
| `total_fulfilled` | `complete_unstake` when matured | Stake cycles held to maturity. |
| `cumulative_stake_days` | `complete_unstake` | Days staked across completed cycles. |
| `highest_class_ever` | `mint_vow`, `add_stake`, `activate_stake` | Peak class. Never decreases. |

Top-ups do not increment `total_commitments`, but they do restart the lock. `cumulative_stake_days` updates only at unstake, so it excludes the current cycle.

## CommitmentRecord

`CommitmentRecord` (`["commitment", wallet]`) is an optional wallet-level summary:

```text
score = highest_class × 100 + min(identities_recorded, 50) × 10 + fulfilled_ratio
fulfilled_ratio = min(fulfilled, committed) × 100 / committed
```

- `record_commitment` snapshots the identity's current principal and class. It can run once per identity.
- `record_fulfillment` adds the current principal if the identity is matured. It can run once per identity.
- **Both require the identity owner's signature**, so nobody else can freeze a record at a low value.

The owner chooses when to record, so treat `commitment_score` as a display metric. For access control or financial decisions, use the `VowState` fields.

## Principal and sessions

Sessions can spend only `yield_balance`. They cannot unstake, withdraw the position, change yield mode, or manage sessions.

`yield_balance` holds harvested gain plus any direct deposits. After a price drop, harvest credits nothing until the position recovers past its previous value.

Sessions stop working when:

- the owner revokes them,
- they expire,
- `complete_unstake` makes the identity dormant, or
- `activate_stake` starts a new cycle.
