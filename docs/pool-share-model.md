# Pool-Share Model

## Overview

IDNFT uses the same pool-share accounting model as xNFT. Each IDNFT owns **shares** in a shared pool of delegated XNT while in Active Identity state.

```
share_price = (pool_lamports - total_yield_claims) / total_shares
```

For the full worked example and math, see `/home/owlx1/xNFT/docs/pool-share-model.md`. The accounting formula is identical across both protocols.

---

## IDNFT-specific behaviour

### Shares at activate_stake

When `activate_stake()` is called on a Dormant identity, shares are issued at the current share price — the same as a fresh mint. There is no "re-entry penalty" or discount.

```
new_shares = stake_lamports * SHARE_PRECISION / current_share_price
```

### Shares at complete_unstake

When `complete_unstake()` is called, `shares` was already zeroed by `begin_unstake()` and `lamports_owed` was computed at that time:

```
lamports_owed = shares * share_price_at_begin_unstake / SHARE_PRECISION
              + yield_balance
```

The IDNFT is then set to Dormant (`active_stake = false`) with `shares = 0`. The identity account stays on-chain.

### Dormant identity has zero shares

A Dormant IDNFT holds no pool shares. It does not accrue yield. `update_share_price()` ignores it (no pool_stake account to sum).

### Reputation is independent of shares

`cumulative_stake_days`, `total_commitments`, etc. are stored in `IdNftState` and are unaffected by share mechanics. They are updated at `complete_unstake` time and represent real historical stake duration, not share count.

---

## Share Price Crank

`update_share_price()` is a permissionless instruction that should be called after each epoch's rewards land on the validator stake accounts.

Script: `scripts/update-share-price.ts`

```bash
cd /home/owlx1/IDNFT
npx ts-node --skip-project scripts/update-share-price.ts
```
