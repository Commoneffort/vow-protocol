# Vow Protocol

**Soulbound on-chain identity for X1.** Users stake XNT to mint a permanent credential tied to their wallet. The credential earns yield, accumulates verifiable reputation, and grants dApps the ability to transact on behalf of the user — without a wallet popup for every action.

- **Program ID**: `7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ` (X1 mainnet)
- **Frontend**: https://vow-protocol.vercel.app
- **RPC**: `https://rpc.mainnet.x1.xyz`

---

## What It Is

Each wallet can hold exactly one Vow identity. It is:

- **Soulbound** — non-transferable. The credential belongs to the wallet that created it, forever.
- **Permanent** — the account never closes. Unstaking transitions the identity to Dormant, not deleted. All history is preserved.
- **Yield-bearing** — staked XNT earns DPoS rewards through the X1 Foundation SPL delegation pool. Yield accrues to `yield_balance` and can be spent by dApps without user interaction.
- **Cross-device** — the identity lives on-chain, not in a browser. Connect the same wallet from any device and the identity, yield balance, and all session keys are immediately accessible.

---

## Why Staking-Backed Identity

Free accounts cost nothing to create, so they prove nothing. A Vow identity requires locking XNT for months or years. The economic commitment creates a verifiable signal:

- A wallet with a 5-year Xenturion identity and 100% commitment fulfillment has skin in the game that cannot be faked or bought cheaply.
- Class tier reflects the depth of commitment — not just current balance, but `highest_class_ever`, which persists through unstake cycles.
- Reputation fields (`total_commitments`, `total_fulfilled`, `cumulative_stake_days`) are append-only and verifiable by anyone without an oracle.

---

## Identity Classes

| Class | Name | Minimum Stake | Lock Period |
|-------|------|--------------|-------------|
| 0 | Ruby | 1 XNT | 30 days |
| 1 | Opal | 101 XNT | 90 days |
| 2 | Topaz | 301 XNT | 180 days |
| 3 | Emerald | 501 XNT | 365 days |
| 4 | Aquamarine | 1,001 XNT | 547 days |
| 5 | Sapphire | 2,001 XNT | 730 days |
| 6 | Amethyst | 5,001 XNT | 1,095 days |
| 7 | Xenturion | 10,001 XNT | 1,825 days |

Topping up stake upgrades the class and resets the lock period. `highest_class_ever` never decreases.

---

## Identity Lifecycle

```
Mint (add_stake + active_stake=true)
  │
  ▼
Active ──── harvest, yield_spend, sessions ────┐
  │                                             │
begin_unstake                              add_stake (top up)
  │
  ▼
Unstaking (lock period must have elapsed)
  │
complete_unstake
  │
  ▼
Dormant (account persists, all history intact, sessions invalid)
  │
  ▼
activate_stake ──► Active again (new lock period, old reputation preserved)
```

---

## Session Keys — How dApps Work Without Wallet Popups

The central feature. A session key lets a dApp spend a user's `yield_balance` autonomously, without a wallet signature on every transaction.

### How a session works

1. **User creates a session** — one wallet signature. The session PDA records: the session keypair's public key, allowed program IDs, daily spend limit, lifetime spend limit, tx/day velocity cap, and expiry.
2. **dApp holds the session keypair** — the dApp signs `yield_spend` transactions using this keypair. The user's main wallet is never touched again.
3. **Protocol enforces limits on-chain** — every `yield_spend` checks: daily cap, lifetime cap, velocity cap, program whitelist, expiry, and that the session has not been invalidated.
4. **User revokes at any time** — `revoke_session` sets `active = false` on-chain immediately. No off-chain revocation list.

### Session key properties

- **PDA seeds**: `["session", vow_state_pubkey, session_index_le4]`
- `session_index: u32` — user-chosen slot (0, 1, 2 …). Deterministic and stable.
- `expiry_ts = 0` — session never expires.
- `program_count = 0` — session can call any program (unrestricted).
- Sessions are invalidated automatically when the user calls `activate_stake` or `complete_unstake` — on-chain enforcement, no manual cleanup needed.

---

## Cross-Device Portability

Vow identity and sessions are stored on-chain. Nothing lives in localStorage that can't be recovered.

### Retrieving an identity

```typescript
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { VowClient } from "./sdk/src/client";

const client = new VowClient(provider);

// Find all identities owned by a wallet — works from any device
const identities = await client.getVowStatesByOwner(walletPublicKey);
// Returns array of { publicKey, account } — typically one entry per wallet

// Or fetch directly if you know the VowState address
const identity = await client.getVowState(vowStatePubkey);
```

### Retrieving session keys

Sessions are PDAs derived from the VowState address and a session index. Query all sessions for an identity:

```typescript
// Fetch all session accounts for this identity (memcmp filter on vow_state field)
const sessions = await client.getSessions(vowStatePubkey);

// Or derive a specific session by index (deterministic)
import { findSessionAccount } from "./sdk/src/pda";
const [sessionPda] = findSessionAccount(vowStatePubkey, 0); // index 0
const session = await program.account.sessionAccount.fetch(sessionPda);

console.log(session.sessionKey.toBase58()); // the session keypair's public key
console.log(session.active);                // bool
console.log(session.dailyLimit.toString()); // lamports
console.log(session.expiryTs.toString());   // unix ts, 0 = never
```

The session PDA stores the **public key** of the session keypair. The private key is held by the dApp that created the session. If a dApp loses the private key, the user can revoke the session and create a new one — the identity is unaffected.

### Typical cross-device flow

1. User logs into dApp on Device A → dApp generates session keypair → user calls `createSession` → dApp stores session private key (e.g., localStorage, encrypted keystore, or device secure enclave).
2. User opens dApp on Device B → dApp calls `getVowStatesByOwner(wallet)` → finds the same VowState PDA → checks existing sessions → if no active session for this device, prompts user to create a new one (index 1, 2, etc.).
3. Each device gets its own session index with independent limits. Revoking one device's session does not affect others.

---

## dApp Integration

### 1. Check if a user has a Vow identity

```typescript
const identities = await client.getVowStatesByOwner(userWallet.publicKey);
if (identities.length === 0) {
  // No identity — prompt user to mint at https://vow-protocol.vercel.app
  return;
}
const { publicKey: vowStatePubkey, account: identity } = identities[0];
```

### 2. Gate by class tier

```typescript
const MIN_CLASS = 3; // Emerald
if (identity.class < MIN_CLASS || !identity.activeStake) {
  throw new Error("Emerald or higher identity required");
}

// highestClassEver persists through unstake cycles
const REPUTATION_GATE = 2; // Topaz — even if currently Ruby
if (identity.highestClassEver < REPUTATION_GATE) {
  throw new Error("Insufficient historical commitment tier");
}
```

### 3. Create a session (user signs once)

```typescript
import { Keypair } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

// Generate session keypair — store private key in your dApp
const sessionKeypair = Keypair.generate();
localStorage.setItem("myapp_session_key", JSON.stringify(Array.from(sessionKeypair.secretKey)));

await client.createSession(
  vowStatePubkey,
  0,                          // session index — pick a stable slot for your app
  sessionKeypair.publicKey,
  [MY_PROGRAM_ID],            // program whitelist
  {
    expiryTs: new BN(0),                          // never expires
    dailyLimit: new BN(500_000_000),              // 0.5 XNT/day
    lifetimeLimit: new BN(10_000_000_000),        // 10 XNT total
    velocityLimit: 100,                           // max 100 tx/day
  }
);
```

### 4. Spend yield without wallet interaction (server-side or dApp backend)

```typescript
// Restore session keypair from storage
const stored = JSON.parse(localStorage.getItem("myapp_session_key"));
const sessionKeypair = Keypair.fromSecretKey(Uint8Array.from(stored));

// Build a provider using the session keypair as the wallet
const sessionWallet = new Wallet(sessionKeypair);
const sessionProvider = new AnchorProvider(connection, sessionWallet, {});
const sessionClient = new VowClient(sessionProvider);

// Now yield_spend is signed by the session key — no user popup
// Called via your on-chain program's CPI into yield_spend
```

### 5. CPI from your Rust program

```rust
use anchor_lang::prelude::*;

pub fn process_action(ctx: Context<MyAction>, cost: u64) -> Result<()> {
    vow::cpi::yield_spend(
        CpiContext::new(
            ctx.accounts.vow_program.to_account_info(),
            vow::cpi::accounts::YieldSpend {
                config: ctx.accounts.vow_config.to_account_info(),
                vow_state: ctx.accounts.vow_state.to_account_info(),
                session_account: ctx.accounts.session_account.to_account_info(),
                calling_program: ctx.accounts.my_program.to_account_info(),
                app_registry: None,
                reserve: ctx.accounts.vow_reserve.to_account_info(),
                destination: ctx.accounts.treasury.to_account_info(),
                session_signer: ctx.accounts.session_signer.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        ),
        cost,
    )?;
    Ok(())
}
```

The protocol verifies on-chain: session is active, `calling_program` is in the session's whitelist, daily and lifetime caps not exceeded, session has not been invalidated by a stake event.

### 6. Verify session validity before calling (off-chain)

```typescript
import { findSessionAccount } from "./sdk/src/pda";

async function isSessionValid(
  client: VowClient,
  vowStatePubkey: PublicKey,
  sessionIndex: number
): Promise<boolean> {
  const [sessionPda] = findSessionAccount(vowStatePubkey, sessionIndex);
  const [session, identity] = await Promise.all([
    client.program.account.sessionAccount.fetch(sessionPda),
    client.getVowState(vowStatePubkey),
  ]);
  const now = Math.floor(Date.now() / 1000);
  return (
    session.active &&
    identity.activeStake &&
    (session.expiryTs.toNumber() === 0 || now < session.expiryTs.toNumber()) &&
    session.startTs.toNumber() > (identity as any).sessionsInvalidatedAt.toNumber()
  );
}
```

---

## Yield Modes

Users choose how their staking yield is handled:

| Mode | Behavior |
|------|----------|
| `Treasury` | 100% → `yield_balance`. Available to harvest or spend via sessions. |
| `Hybrid` | 50% compounded into shares, 50% → `yield_balance`. |
| `Compound` | 100% compounded. `yield_balance` always 0. Gain realized at unstake. |

Switching modes calls `settle_idnft` first — existing gain is locked in at the current price before the mode changes.

---

## Reading Identity Data

All fields are readable directly from the `VowState` account. No oracle, no off-chain API.

| Field | Type | Meaning |
|-------|------|---------|
| `owner` | `Pubkey` | Wallet — permanent, never changes |
| `class` | `u8` | Current tier (0–7) |
| `highest_class_ever` | `u8` | Peak tier across all stake cycles |
| `active_stake` | `bool` | Active vs Dormant |
| `principal_lamports` | `u64` | Current staked amount |
| `yield_balance` | `u64` | Spendable yield (lamports) |
| `shares` | `u64` | Pool share position |
| `accrued_gain` | `i64` | Pending gain since last harvest |
| `yield_mode` | `enum` | Treasury / Hybrid / Compound |
| `first_staked_at` | `i64` | Unix timestamp of first ever stake |
| `unlock_at` | `i64` | When principal can be unstaked |
| `total_commitments` | `u32` | Commitments created (append-only) |
| `total_fulfilled` | `u32` | Commitments fulfilled (append-only) |
| `cumulative_stake_days` | `u64` | Total days staked across all cycles |
| `sessions_invalidated_at` | `i64` | Sessions created before this timestamp are invalid |
| `nonce` | `u64` | Sequential token number |

---

## PDA Derivation

```typescript
import {
  findProtocolConfig,
  findReserve,
  findAssetId,
  findVowState,
  findSessionAccount,
  findUnstakeEscrow,
  findAppRegistry,
  findAuthorityProfile,
  PROGRAM_ID,
} from "./sdk/src/pda";

// Config and reserve are singletons
const [config] = findProtocolConfig();    // seeds: ["config"]
const [reserve] = findReserve();          // seeds: ["reserve"]

// Identity: nonce → asset ID → vow state
const [assetId] = findAssetId(nonce);     // seeds: ["vow_asset", nonce_le8]
const [vowState] = findVowState(assetId); // seeds: ["vow", asset_id]

// Session: deterministic by vow state + index
const [sessionPda] = findSessionAccount(vowState, 0); // seeds: ["session", vow_state, index_le4]

// Unstake escrow (one per identity, reused across cycles)
const [escrow] = findUnstakeEscrow(vowState); // seeds: ["unstake", vow_state]
```

---

## Authority Profiles (Default Session Parameters)

dApps can publish an `AuthorityProfile` — a PDA that stores default session limits for their program. When a user creates a session referencing an authority profile, the session is pre-filled with the dApp's published defaults.

```typescript
// dApp publishes defaults once
await client.createAuthorityProfile(
  profileId,   // 8-byte identifier you choose
  {
    defaultDailyLimit: new BN(500_000_000),
    defaultLifetimeLimit: new BN(0),  // 0 = no cap
    defaultExpiryDays: 30,
    defaultAllowedProgramIds: [MY_PROGRAM_ID],
  }
);

// User's session creation can reference the profile
// Frontend pre-fills limits from the profile — user sees them before signing
```

---

## Permissionless Cranks

These instructions can be called by anyone — no admin key required:

| Instruction | What it does |
|-------------|-------------|
| `update_share_price` | Reads X1 Foundation SPL pool ratio, updates `config.current_share_price`. Call daily to keep yield accrual accurate. |
| `flush_reserve_to_pool` | Deposits idle SOL from the reserve into the SPL pool, receiving pXNT. This is what earns yield. |
| `withdraw_from_pool` | Redeems pXNT for SOL to cover a pending unstake. Only succeeds if `reserve < escrow.lamports_owed`. |
| `harvest` | Settles pending gain for an identity and credits `yield_balance`. |

The protocol's daily systemd crank calls `update_share_price` and `flush_reserve_to_pool` automatically, but anyone can call them.

---

## Agent and Bot Integration

Vow Protocol is designed for autonomous agents. The session key mechanism means an agent can transact on behalf of a user indefinitely with no further human interaction.

```typescript
// User authorizes agent once
const agentKeypair = Keypair.generate();
await client.createSession(
  vowStatePubkey,
  1,                          // index 1 = agent slot
  agentKeypair.publicKey,
  [AGENT_PROGRAM_ID],
  {
    expiryTs: new BN(0),                    // never expires
    dailyLimit: new BN(100_000_000),        // 0.1 XNT/day cap
    lifetimeLimit: new BN(1_000_000_000),   // 1 XNT max
    velocityLimit: 50,
  }
);

// Securely transfer agentKeypair.secretKey to the agent

// Agent loop (no user required after this)
while (true) {
  const task = await pollForTask();
  if (task) {
    await agentProgram.methods.executeTask(task.id)
      .accounts({ vowState: vowStatePubkey, sessionAccount: agentSessionPda, ... })
      .signers([agentKeypair])
      .rpc();
  }
}
```

Multi-agent pattern: one session per agent (index 0 = browser, 1 = trading bot, 2 = AI assistant), each with independent daily limits and program whitelists.

---

## Build and Test

```bash
# Build program
anchor build

# Run tests (starts local validator automatically)
anchor test

# Sync IDL to frontend SDK after build
cp target/idl/vow.json frontend/src/sdk/vow.json
cp target/types/vow.ts frontend/src/sdk/vow-types.ts
```

Tests cover: initialize, mint, share price mechanics, harvest, sessions, soulbound invariants, security edge cases. 34 tests, all passing.

---

## Deployment

```bash
# Deploy to X1 mainnet (upgrade authority = vow-key.json)
anchor deploy \
  --provider.cluster https://rpc.mainnet.x1.xyz \
  --provider.wallet ~/.config/solana/vow-key.json

# Initialize on fresh deploy
RPC=https://rpc.mainnet.x1.xyz \
  SPL_STAKE_POOL=X1SPaMUM1A8E1vKL8XQAB5rxKarJbqtWFFSNFs8f7Av \
  SPL_POOL_MINT=pXNTyoqQsskHdZ7Q1rnP25FEyHHjissbs7n6RRN2nP5 \
  npx ts-node --skip-project \
  --compiler-options '{"resolveJsonModule":true,"esModuleInterop":true}' \
  scripts/initialize-protocol.ts
```

### Live mainnet PDAs

| Account | Address |
|---------|---------|
| Program | `7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ` |
| Config | `2EeU6bRB248wEZquPPoSPyJLa5Ps93p3ubvQayq3UyBe` |
| Reserve | `4mn9erFousBJp1NWCfCosZVjoatHnD16pZTN3K6t1pqC` |
| SPL Pool | `X1SPaMUM1A8E1vKL8XQAB5rxKarJbqtWFFSNFs8f7Av` |
| pXNT Mint | `pXNTyoqQsskHdZ7Q1rnP25FEyHHjissbs7n6RRN2nP5` |

---

## Project Structure

```
programs/vow/src/
  instructions/
    admin/          — initialize, set_admin, verify_app, dev helpers
    pool/           — update_share_price, flush_reserve_to_pool, withdraw_from_pool
    vow/            — mint, add_stake, activate_stake, begin_unstake, complete_unstake
    session/        — create_session, revoke_session, close_session
    treasury/       — yield_spend, withdraw_yield, deposit_yield_balance
    harvest.rs      — settle and credit accrued gain
    commitment/     — record_commitment, record_fulfillment (reputation)
    authority_profile/ — dApp default session params
  state/            — all account structs
  errors.rs
  constants.rs

sdk/src/
  client.ts         — VowClient (all instructions as typed methods)
  pda.ts            — PDA derivation helpers
  types.ts          — TypeScript types

scripts/
  daily_crank.ts    — update_share_price + flush_reserve_to_pool
  initialize-protocol.ts
  check_yield.ts

tests/              — 34 anchor tests
docs/               — spec, integration guide, pool-share model, commitment model
```
