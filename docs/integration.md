# Vow Protocol Integration Guide

The SDK lives in `sdk/src` (`frontend/src/sdk` is its source of truth). It is not published to npm, so copy or vendor it.

```typescript
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { VowClient, findOwnerIndex, findSessionAccount, LAMPORTS_PER_XNT } from "./sdk/src";

const client = new VowClient(provider);
```

## Find a user's identity

```typescript
const [indexPda] = findOwnerIndex(wallet);
const index = await client.program.account.ownerIndex.fetchNullable(indexPda);
if (!index) throw new Error("No Vow identity");

const vowState = index.vowState;
const identity = await client.getVowState(vowState);
```

Two legacy wallets hold more than one identity. `getVowStatesByOwner(wallet)` returns all of them.

## Gate by class

```typescript
const isActive = identity.activeStake;
const currentClass = identity.class;       // current tier
const peakClass = identity.highestClassEver; // never decreases
```

Check `activeStake` when the gate requires capital at stake right now. During an unstake, `activeStake` remains true while `shares` is 0, so also require `identity.shares.gtn(0)`.

## Stake lifecycle

```typescript
const { vowState } = await client.mintVow(10 * LAMPORTS_PER_XNT, { treasury: {} });

// Warning: re-locks the WHOLE position for its full class duration.
await client.addStake(vowState, 1 * LAMPORTS_PER_XNT);

await client.beginUnstake(vowState);      // after maturity; fixes the payout
await client.completeUnstake(vowState);   // next epoch; redeems pXNT if needed

await client.activateStake(vowState, 5 * LAMPORTS_PER_XNT, { compound: {} });
```

The SDK prepends `update_share_price` to value-moving instructions. If you build transactions yourself, prepend `await client.freshPriceIxs()` or they revert with `PriceStale`.

## Create a session

```typescript
const sessionKey = Keypair.generate();
const sessionIndex = 0;

await client.createSession(vowState, sessionIndex, sessionKey.publicKey, [MY_PROGRAM_ID], {
  expiryTs: new BN(Math.floor(Date.now() / 1000) + 30 * 86_400),
  dailyLimit: new BN(1 * LAMPORTS_PER_XNT),
  lifetimeLimit: new BN(10 * LAMPORTS_PER_XNT),
  velocityLimit: 100,
});
```

Recommended for every integration:

- **Always pass a program whitelist.** An empty list lets the key pay any address.
- **Always set a daily or lifetime cap.** `0` means no limit.
- **Always set an expiry.** `0` means the session never expires.

## Spend by CPI

A whitelisted session must be spent by your program, which signs with its `["vow_caller"]` PDA.

```rust
use anchor_lang::prelude::*;

pub fn charge(ctx: Context<Charge>, amount: u64) -> Result<()> {
    // Vow does not restrict the destination. This check is your program's job.
    require_keys_eq!(ctx.accounts.destination.key(), MY_TREASURY);

    let seeds: &[&[&[u8]]] = &[&[b"vow_caller", &[ctx.bumps.vow_caller]]];
    vow::cpi::yield_spend(
        CpiContext::new_with_signer(
            ctx.accounts.vow_program.to_account_info(),
            vow::cpi::accounts::YieldSpend {
                config: ctx.accounts.vow_config.to_account_info(),
                vow_state: ctx.accounts.vow_state.to_account_info(),
                session_account: ctx.accounts.session_account.to_account_info(),
                calling_program: ctx.accounts.this_program.to_account_info(),
                app_registry: ctx.accounts.app_registry.to_account_info(),
                reserve: ctx.accounts.vow_reserve.to_account_info(),
                destination: ctx.accounts.destination.to_account_info(),
                session_signer: ctx.accounts.session_signer.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                caller_authority: Some(ctx.accounts.vow_caller.to_account_info()),
            },
            seeds,
        ),
        amount,
    )?;
    Ok(())
}
```

`app_registry` is the PDA `["app", your_program_id]`. It is required but can be uninitialized.

If your program accepts a caller-supplied `destination` without checking it, a leaked session key can use your program to pay itself, up to the session limits.

## Check a session off-chain

```typescript
const [sessionPda] = findSessionAccount(vowState, sessionIndex);
const session = await client.program.account.sessionAccount.fetch(sessionPda);
const now = Math.floor(Date.now() / 1000);

const usable =
  session.active &&
  identity.activeStake &&
  (session.expiryTs.isZero() || now < session.expiryTs.toNumber()) &&
  session.startTs.gte(identity.sessionsInvalidatedAt);
```

## Yield

```typescript
await client.harvest(vowState);                     // anyone can call
await client.depositYieldBalance(vowState, amount); // any signer can fund an identity
await client.withdrawYield(vowState);               // owner only
const pending = await client.getPendingGain(vowState);
```

Compound mode produces no harvested `yield_balance`. Only Treasury and Hybrid harvests credit it.

## Common errors

| Error | Meaning | Action |
|---|---|---|
| `PriceStale` | Price not current, or protocol halted | Prepend `update_share_price`. If it persists, check the pool's epoch update. |
| `ReserveIlliquid` | Reserve needs pXNT redeemed | Call `withdraw_from_pool`, then retry. |
| `CallerNotAuthorized` | Whitelisted session spent without CPI proof | Spend through the whitelisted program. |
| `ProgramNotAllowed` | Program not in the session whitelist | Create a session that lists it. |
| `AppBlocked` | Program is blocked | Contact the protocol admin. |
| `SessionInvalidated` | Session predates the current stake cycle | Create a new session. |
| `SessionInactive` | Wrong key, or revoked session | Check the key and session state. |
| `ProtocolInsolvent` | Payouts paused: liabilities exceed assets | Wait for recovery; resumes at the next price update once solvent. |
| `0x10` from the stake program | Epoch rewards window | Retry after a few minutes. |
