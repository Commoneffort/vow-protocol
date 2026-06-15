# IDNFT Integration Guide

## Quick Start

```typescript
import { IdNftClient, findIdNftState, LAMPORTS_PER_XNT } from "@x1/idnft-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";

const client = new IdNftClient(provider);

// Mint a Ruby IDNFT (1 XNT, 30-day lock)
const { assetId, idnftState } = await client.mintIdNft(
  1 * LAMPORTS_PER_XNT,
  { compound: {} }
);
```

---

## Identity State

```typescript
const state = await client.getIdNftState(idnftState);

// Lifecycle
const isActive = state.activeStake;     // Active vs Dormant
const isMatured = state.matured;
const owner = state.owner;              // soulbound — never changes

// Reputation (append-only)
const firstStakedAt = new Date(state.firstStakedAt.toNumber() * 1000);
const totalCommitments = state.totalCommitments;
const totalFulfilled = state.totalFulfilled;
const cumulativeStakeDays = state.cumulativeStakeDays.toNumber();
const highestClass = CLASS_NAMES[state.highestClassEver];

// Current position
const className = CLASS_NAMES[state.class];
const principalXnt = state.principalLamports.toNumber() / LAMPORTS_PER_XNT;
```

---

## Stake Lifecycle

```typescript
// Initial stake (creates IDNFT)
const { assetId } = await client.mintIdNft(stakeAmount, yieldMode);

// Unstake (two steps — requires maturity)
await client.beginUnstake(idnftState);
// ... wait one epoch ...
await client.completeUnstake(idnftState);
// IDNFT is now Dormant; wallet received principal + yield

// Re-activate (any time after complete_unstake)
await client.activateStake(idnftState, newStakeAmount, newYieldMode);
// IDNFT is Active again; old sessions invalidated
```

---

## Session Integration (App / Game)

### 1. Owner creates a session for your program

```typescript
import { findSessionAccount } from "@x1/idnft-sdk";

const sessionKeypair = Keypair.generate();
await client.createSession(
  idnftState,
  sessionKeypair.publicKey,
  [MY_GAME_PROGRAM_ID],           // allowed_program_ids
  {
    expiryTs: new BN(Date.now() / 1000 + 86400 * 30),
    dailyLimit: new BN(1_000_000_000),    // 1 XNT/day
    lifetimeLimit: new BN(30_000_000_000), // 30 XNT total
    velocityLimit: 1000,
  }
);
```

### 2. Your program calls yield_spend via CPI

```rust
use anchor_lang::prelude::*;

pub fn charge_player(ctx: Context<ChargePlayer>, amount: u64) -> Result<()> {
    idnft_program::cpi::yield_spend(
        CpiContext::new(
            ctx.accounts.idnft_program.to_account_info(),
            idnft_program::cpi::accounts::YieldSpend {
                config: ctx.accounts.idnft_config.to_account_info(),
                stake_pool: ctx.accounts.idnft_stake_pool.to_account_info(),
                idnft_state: ctx.accounts.idnft_state.to_account_info(),
                session_account: ctx.accounts.session_account.to_account_info(),
                calling_program: ctx.accounts.this_program.to_account_info(),
                app_registry: None,
                reserve: ctx.accounts.idnft_reserve.to_account_info(),
                destination: ctx.accounts.destination.to_account_info(),
                session_signer: ctx.accounts.session_signer.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        ),
        amount,
    )?;
    Ok(())
}
```

The `calling_program` account must be your own program's account (executable, in the session's `allowed_program_ids`).

### 3. Validate a session (off-chain check before CPI)

```typescript
const session = await client.getSessionAccount(idnftState, sessionKeypair.publicKey);
const identity = await client.getIdNftState(idnftState);
const now = Math.floor(Date.now() / 1000);

const isValid =
  session.active &&
  now < session.expiryTs.toNumber() &&
  session.startTs.toNumber() > identity.sessionsInvalidatedAt.toNumber() &&
  identity.activeStake;
```

---

## Yield

```typescript
// Harvest accrued gain
await client.harvest(idnftState);

// Withdraw yield_balance to wallet
await client.withdrawYield(idnftState);

// Check pending gain (before harvest)
const pendingGain = await client.getPendingGain(idnftState);
```

---

## Authority Profile (Default Session Parameters)

```typescript
await client.createAuthorityProfile(
  profileId,         // 8-byte identifier
  {
    defaultDailyLimit: new BN(1_000_000_000),
    defaultLifetimeLimit: new BN(0),   // 0 = no limit
    defaultExpiryDays: 30,
    defaultAllowedProgramIds: [MY_GAME_PROGRAM_ID],
  }
);

// Sessions created with this profile inherit its defaults
await client.createSession(idnftState, sessionKey, programIds, params, authorityProfile);
```

---

## Explorer Display

| Field | Source |
|---|---|
| Owner | `IdNftState.owner` (permanent) |
| Class | `CLASS_NAMES[state.class]` |
| Status | `state.activeStake ? "Active" : "Dormant"` |
| First staked | `new Date(state.firstStakedAt * 1000)` |
| Total commitments | `state.totalCommitments` |
| Fulfilled commitments | `state.totalFulfilled` |
| Cumulative stake days | `state.cumulativeStakeDays` |
| Highest class ever | `CLASS_NAMES[state.highestClassEver]` |
| Current principal | `state.principalLamports / 1e9` XNT |
| Yield balance | `state.yieldBalance / 1e9` XNT |
| Unlock date | `new Date(state.unlockAt * 1000)` |

---

## Program Addresses (Testnet)

```
Program: HRwze7aVokE5fjfm2qVn9rVq5CAAFiD3BPEFMGei8edF
Frontend: https://vow-protocol.vercel.app
RPC:     https://rpc.testnet.x1.xyz
```
