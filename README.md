# Vow Protocol

**Soulbound on-chain identity for X1.** Users stake XNT to mint a permanent credential tied to their wallet. The credential earns yield, accumulates verifiable reputation, and grants dApps the ability to transact on behalf of the user — without a wallet popup for every action.

- **Program ID**: `7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ` (X1 mainnet)
- **Frontend**: https://x1vow.xyz
- **RPC**: `https://rpc.mainnet.x1.xyz`

---

## What It Is

Each wallet can hold exactly one Vow identity (enforced on-chain by the `["owner_index", wallet]` PDA; the few wallets that minted several before enforcement keep them, grandfathered). It is:

- **Soulbound** — non-transferable. The credential belongs to the wallet that created it, forever.
- **Permanent** — the account never closes. Unstaking transitions the identity to Dormant, not deleted. All history is preserved.
- **Yield-bearing** — staked XNT earns DPoS rewards through the X1 Foundation SPL delegation pool. Harvesting in Treasury or Hybrid mode moves gain into `yield_balance`, which sessions can spend without a wallet popup.
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

Every top-up (`add_stake`) re-locks the whole position for the (possibly upgraded) class duration — topped-up principal is always committed for a full lock. `highest_class_ever` never decreases.

---

## Identity Lifecycle

```
Mint (stake + active_stake=true)
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
- `program_count = 0` — unrestricted: the session key can pay **any address** up to its limits.
- `program_count > 0` — spends must arrive by CPI from a listed program, signed by that program's `["vow_caller"]` PDA.
- `daily_limit`, `lifetime_limit`, or `velocity_limit = 0` — no limit of that type. Daily counters reset at 00:00 UTC.
- Sessions are invalidated automatically when the user calls `activate_stake` or `complete_unstake` — on-chain enforcement, no manual cleanup needed.

---

## Cross-Device Portability

Vow identity and session records are stored on-chain. Session **private keys** are not: Recoverable Session keys can be re-derived with a wallet signature, while One-Time keys cannot be recovered if lost.

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
  // No identity — prompt user to mint at https://x1vow.xyz
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
    // Vow does not restrict the destination. Your program must pin or validate it.
    require_keys_eq!(ctx.accounts.treasury.key(), MY_TREASURY);

    let bump = ctx.bumps.vow_caller;
    let signer: &[&[&[u8]]] = &[&[b"vow_caller", &[bump]]];
    vow::cpi::yield_spend(
        CpiContext::new_with_signer(
            ctx.accounts.vow_program.to_account_info(),
            vow::cpi::accounts::YieldSpend {
                config: ctx.accounts.vow_config.to_account_info(),
                vow_state: ctx.accounts.vow_state.to_account_info(),
                session_account: ctx.accounts.session_account.to_account_info(),
                calling_program: ctx.accounts.my_program.to_account_info(),
                // Required PDA ["app", my_program]; may be uninitialized.
                app_registry: ctx.accounts.app_registry.to_account_info(),
                reserve: ctx.accounts.vow_reserve.to_account_info(),
                destination: ctx.accounts.treasury.to_account_info(),
                session_signer: ctx.accounts.session_signer.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                caller_authority: Some(ctx.accounts.vow_caller.to_account_info()),
            },
            signer,
        ),
        cost,
    )?;
    Ok(())
}
```

The protocol verifies on-chain: the session is active, unexpired, and not invalidated; `calling_program` is whitelisted and signed through its `vow_caller` PDA; the app is not blocked; and the spend limits hold.

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
    session.startTs.toNumber() >= (identity as any).sessionsInvalidatedAt.toNumber()
  );
}
```

---

## Yield Modes

Users choose how their staking yield is handled:

| Mode | Behavior |
|------|----------|
| `Treasury` | On harvest, 100% of the gain → `yield_balance` (shares worth the gain are burned). Withdrawable or spendable via sessions. |
| `Hybrid` | On harvest, 50% stays in shares, 50% → `yield_balance`. |
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
| `shares` | `u128` | Pool share position |
| `accrued_gain` | `i64` | Settled gain not yet harvested |
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

A wallet can store its own `AuthorityProfile`: reusable session defaults for daily limit, lifetime limit, expiry, and allowed programs. `create_session` accepts only a profile owned by the signing wallet, so a dApp cannot publish one on behalf of its users. The SDK does not wrap these instructions; call them through `client.program.methods`.

Values passed to `create_session` override the defaults. An empty `allowed_program_ids` inherits the profile's list, and `default_expiry_days = 0` means no expiry.

```typescript
const profileId = Buffer.from("defaults"); // 8 bytes
const [authorityProfile] = findAuthorityProfile(wallet.publicKey, profileId);

await client.program.methods
  .createAuthorityProfile([...profileId], {
    defaultDailyLimit: new BN(500_000_000),
    defaultLifetimeLimit: new BN(5_000_000_000),
    defaultExpiryDays: 30,
    defaultAllowedProgramIds: [MY_PROGRAM_ID],
    metadataUri: Buffer.from(""),
  })
  .accountsStrict({ authorityProfile, wallet: wallet.publicKey, systemProgram: SystemProgram.programId })
  .rpc();
```

---

## Permissionless Cranks

These instructions require **no admin key** — anyone can call them:

| Instruction | Who can call | What it does |
|-------------|-------------|--------------|
| `update_share_price` | Anyone (fee payer only) | Sets the share price to **NAV / total_shares**, where NAV is what the protocol can actually pay out: reserve XNT + pXNT at the pool rate net of the withdrawal fee, minus everything owed (yield balances + pending unstakes). Records the pool's epoch and fees. Value-moving instructions (mint, add_stake, activate_stake, harvest, begin_unstake, update_yield_mode) fail with `PriceStale` unless this ran for the current epoch — clients prepend it to the same transaction. Payouts (`yield_spend`, `withdraw_yield`, `complete_unstake`) require the same refresh, so a new epoch's loss is seen before anyone is paid. |
| `flush_reserve_to_pool` | Anyone (fee payer only) | Deposits only **idle** reserve XNT into the X1 stake pool. XNT backing yield balances and pending unstakes always stays liquid, so `yield_spend` / `withdraw_yield` / `complete_unstake` never get stranded. Referral-fee account is pinned to the reserve's own pXNT ATA. |
| `withdraw_from_pool` | Anyone, gated by need | Redeems just enough pXNT (grossed up for the pool fee) to cover what the protocol owes right now. Reverts with `ReserveSufficient` otherwise, so nobody can drain the position. Right after an epoch boundary the stake program briefly rejects withdrawals (`EpochRewardsActive`, 0x10) — retry. |
| `harvest` | Anyone (fee payer only) | Settles pending gain for an identity and applies its yield mode. No owner signature required — games and dApps can crank this permissionlessly. |
| `deposit_yield_balance` | Any depositor (signs and pays) | Deposits XNT into the reserve and credits an identity's `yield_balance`. Session keys, dApp servers, or users can call this to seed spending before yield accrues. |

### What actually requires admin

Only these instructions check `config.admin` and require its signature:

| Instruction | Why admin |
|-------------|-----------|
| `initialize` | One-time setup — must be signed by the program's **upgrade authority**; sets `config.admin` to the signer |
| `set_admin` | Transfers admin to a new key — the **new admin must co-sign** (`scripts/set_admin.ts`) |
| `verify_app` / `block_app` | App registry curation. `block_app` stops whitelisted spends through that app; it does not constrain unrestricted sessions, which can name any program |
| `set_mint_counter` / `dev_set_share_price` / `dev_fast_unlock` | Testnet only — blocked when real SPL pool is configured |

Current protocol admin: `BPmZB128HNvmzubP4rwJTTNLmk9ucK71Jtqt7MowKV8M`  
Same key as the program upgrade authority (`~/.config/solana/vow-key.json`).

The protocol's daily systemd crank (`scripts/daily_crank.ts`) calls `update_share_price`, `flush_reserve_to_pool` and, when needed, `withdraw_from_pool`, but anyone can call them.

### Fair-share accounting

Every share is an equal claim on what the protocol can actually redeem. New stake buys shares at its value *net of the pool round-trip fees it will incur* (0.1% in + 0.1% out today), so existing holders never pay a newcomer's fees, and flushing, withdrawing, depositing or spending yield never moves the price. Unstakers are paid exactly `shares × price + yield_balance` as locked in at `begin_unstake` — `complete_unstake` reverts (`ReserveIlliquid`) rather than ever paying a partial amount. Verified on a mainnet fork: `tests/run-mainnet-fork-test.sh`.

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
      // agentProgram validates the payment and CPIs into yield_spend with its vow_caller PDA
      .accounts({ vowState: vowStatePubkey, sessionAccount: agentSessionPda, ... })
      .preInstructions(await client.freshPriceIxs()) // payouts need this epoch's price
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

# Tests (throwaway validators on port 28899+)
anchor test                     # core suite (12)
tests/run-local-tests.sh        # core + CPI + audit regression suites (27)
tests/run-mainnet-fork-test.sh  # clones the live pool and identities; fair-share checks
cargo test -p vow --lib         # NAV math unit tests (8)

# Sync IDL + SDK after build (frontend/src/sdk is the source of truth)
scripts/sync-idl.sh
```

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

### Frontend hosting

The frontend is served from https://x1vow.xyz by nginx.

```bash
sudo bash deploy/install-x1vow.sh   # nginx site + TLS certificate (safe to re-run)
deploy/publish-frontend.sh          # build from the lockfile and switch releases atomically
```

The former Vercel URLs are redirect-only (`deploy/vercel-redirect`).

### Live mainnet PDAs

| Account | Address |
|---------|---------|
| Program | `7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ` |
| Config | `2EeU6bRB248wEZquPPoSPyJLa5Ps93p3ubvQayq3UyBe` |
| Reserve | `4mn9erFousBJp1NWCfCosZVjoatHnD16pZTN3K6t1pqC` |
| SPL Pool | `X1SPaMUM1A8E1vKL8XQAB5rxKarJbqtWFFSNFs8f7Av` |
| pXNT Mint | `pXNTyoqQsskHdZ7Q1rnP25FEyHHjissbs7n6RRN2nP5` |
| Protocol admin | `BPmZB128HNvmzubP4rwJTTNLmk9ucK71Jtqt7MowKV8M` |
| Upgrade authority | `BPmZB128HNvmzubP4rwJTTNLmk9ucK71Jtqt7MowKV8M` (same key) |

---

## Project Structure

```
programs/vow/src/
  instructions/
    admin/          — initialize, set_admin, verify_app, dev helpers
    pool/           — update_share_price, flush_reserve_to_pool, withdraw_from_pool
    vow/            — mint, add_stake, activate_stake, begin_unstake, complete_unstake,
                      update_yield_mode, backfill_owner_index
    session/        — create_session, revoke_session, close_session
    treasury/       — yield_spend, withdraw_yield, deposit_yield_balance
    harvest.rs      — settle and credit accrued gain
    commitment/     — record_commitment, record_fulfillment (reputation)
    authority_profile/ — dApp default session params
  pool_math.rs      — stake-pool parsing and NAV share-price math
  state/            — all account structs
  errors.rs
  constants.rs

sdk/src/
  client.ts         — VowClient (all instructions as typed methods)
  pda.ts            — PDA derivation helpers
  types.ts          — TypeScript types

scripts/
  daily_crank.ts    — update_share_price + flush_reserve_to_pool + withdraw_from_pool (if short)
  initialize-protocol.ts
  check_yield.ts

tests/              — core, CPI, and mainnet-fork suites
docs/               — spec, integration guide, pool-share model, commitment model
frontend/           — reference web app
deploy/             — nginx, TLS, publish, and redirect configuration
```
