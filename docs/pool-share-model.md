# Pool-Share Model

Each active identity owns **shares** of the protocol's net assets. Stake moves through the reserve into the X1 Foundation stake pool, where it is held as pXNT. Users never hold pXNT directly.

## Share price

Implemented in `programs/vow/src/pool_math.rs`.

```text
L = total_yield_claims + total_pending_unstake
S = reserve_lamports − rent_exempt_minimum
P = pXNT × pool_lamports / pool_supply × (1 − withdrawal_fee)

if S ≥ L:  NAV = P + (S − L) × (1 − deposit_fee) × (1 − withdrawal_fee)
else:      NAV = P − (L − S)

rate  = pool_lamports / pool_supply × (1 − withdrawal_fee)
price = clamp(NAV / total_shares, minimum 1 unit, maximum 1.25 × rate)
```

Prices use a precision of `1e12`. When `total_shares == 0`, the price is `rate`. The withdrawal fee uses the worse of the pool's current and scheduled fee.

The 1.25× cap blocks share-inflation attacks on a near-empty share supply.

## Deposits

```text
net_value = lamports × (1 − deposit_fee) × (1 − withdrawal_fee)
shares    = net_value × 1e12 / price
```

A deposit that would mint zero shares is rejected. With today's 0.1% fees, a new position opens about 0.2% below the amount staked, so existing holders do not pay a newcomer's pool fees.

## Price freshness

`mint_vow`, `add_stake`, `activate_stake`, `harvest`, `begin_unstake`, and `update_yield_mode` revert with `PriceStale` unless `update_share_price` recorded the current epoch. The SDK prepends that instruction.

`yield_spend`, `withdraw_yield`, and `complete_unstake` require the same update for their solvency check, so a loss in a new epoch is seen before anyone is paid.

The recorded epoch is the pool's `last_update_epoch`, so these instructions also wait for the X1 Foundation's epoch update of the pool.

## Harvest

| Mode | Effect |
|---|---|
| Treasury | Burns shares worth the full gain and credits it to `yield_balance`. |
| Hybrid | Burns shares worth half the gain and credits that half. The rest stays in shares. |
| Compound | Records the gain in `total_harvested`. Shares do not change. |

`yield_balance` is a fixed XNT claim. It earns no further yield.

A negative settled gain stays on the books at harvest. After a price drop, nothing is credited until the position recovers past its previous value, so recovered principal cannot become spendable yield.

## Unstaking

`begin_unstake` fixes the payout:

```text
lamports_owed = shares × price / 1e12 + yield_balance
```

The shares are removed and the amount joins `total_pending_unstake`. From the next epoch, `complete_unstake` pays exactly that amount or reverts with `ReserveIlliquid`. It never pays a partial amount.

The exit value does not change during the wait, so a pool loss in that window falls on the remaining holders.

## Liquidity

- `flush_reserve_to_pool` deposits only `reserve − rent − L`.
- `withdraw_from_pool` works only when the reserve is below `rent + L`, and redeems that shortfall grossed up for the fee.
- Right after an epoch boundary, the stake program can reject withdrawals (`EpochRewardsActive`, `0x10`). The SDK and crank retry.
- The pool setting an XNT deposit or withdrawal authority makes flush or withdraw revert with `UnsupportedPoolConfig`.

The daily crank (`scripts/daily_crank.ts`, via the `vow-crank` systemd timer) runs update, flush, and withdraw when needed. Anyone can call these instructions.

## Insolvency

If liabilities exceed all assets, `update_share_price` keeps the old price and sets `price_epoch = 0`, which halts every freshness-gated instruction. If assets valued before pool fees fall short by more than 0.001 XNT, it also sets `config.insolvent`, which pauses `yield_spend`, `withdraw_yield`, and `complete_unstake` and rejects `deposit_yield_balance`, so early claimants cannot drain what remains. A pool fee change alone halts value-moving instructions but does not pause payouts. The next `update_share_price` that finds the protocol solvent clears both. The pause is not a settlement: if a deficit is permanent, resolving it needs a program upgrade.
