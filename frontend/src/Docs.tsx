import React from "react";
import { CLASS_NAMES, LOCK_DAYS } from "./sdk/types";

const S: Record<string, React.CSSProperties> = {
  card:    { border: "1px solid #ddd", borderRadius: 6, padding: 24, marginTop: 20 },
  h2:      { marginTop: 0, marginBottom: 12, fontSize: 18 },
  h3:      { marginTop: 0, marginBottom: 10, fontSize: 15 },
  p:       { fontSize: 13, lineHeight: 1.8, color: "#333", marginTop: 0, marginBottom: 10 },
  table:   { width: "100%", borderCollapse: "collapse" as const, fontSize: 13, marginTop: 12 },
  th:      { textAlign: "left" as const, padding: "8px 12px", background: "#f5f5f5", borderBottom: "2px solid #ddd", fontSize: 12, fontWeight: 700 },
  td:      { padding: "7px 12px", borderBottom: "1px solid #f0f0f0", verticalAlign: "top" as const },
  check:   { color: "#27ae60", fontWeight: 700 },
  cross:   { color: "#c0392b", fontWeight: 700 },
  partial: { color: "#e67e22", fontWeight: 700 },
  tag:     { display: "inline-block", padding: "2px 8px", borderRadius: 3, background: "#e8f4fd", color: "#2980b9", fontSize: 11, fontWeight: 700, marginRight: 6 },
  badge:   (c: string) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 3, background: c, color: "#fff", fontSize: 11, fontWeight: 700 }),
  code:    { fontFamily: "monospace", fontSize: 12, background: "#f4f4f4", padding: "12px 16px", borderRadius: 4, lineHeight: 1.6, whiteSpace: "pre" as const, overflowX: "auto" as const, display: "block", marginTop: 8 },
  hint:    { fontSize: 12, color: "#888", marginTop: 4, marginBottom: 0 },
};

const CLASS_COLORS = ["#e74c3c","#8e44ad","#d4ac0d","#27ae60","#1abc9c","#2980b9","#8e44ad","#2c3e50"];
const STAKE_TIERS = ["1–100","101–300","301–500","501–1,000","1,001–2,000","2,001–5,000","5,001–10,000","10,001+"];
const CLASS_FEATURES = [
  "Entry identity. Basic session support.",
  "Established identity. Reputation building.",
  "Verified identity. Mid-tier reputation.",
  "Reputable identity. Sub-year commitment.",
  "Senior identity. 18-month commitment.",
  "Elite identity. 2-year commitment.",
  "Distinguished. 3-year commitment.",
  "Xenturion. Max class. 5-year commitment.",
];

export default function Docs() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", paddingBottom: 40 }}>

      {/* Resource links */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 4, flexWrap: "wrap" as const }}>
        <a
          href="https://github.com/Commoneffort/vow-protocol"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#24292f", textDecoration: "none", fontSize: 13, fontWeight: 600, border: "1px solid #d0d7de", borderRadius: 6, padding: "5px 12px", background: "#f6f8fa" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Source on GitHub
        </a>
        <span style={{ color: "#999", fontSize: 12 }}>
          Program ID: <code style={{ fontSize: 11, background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ</code>
        </span>
      </div>

      {/* What it is */}
      <div style={S.card}>
        <h2 style={S.h2}>What is Vow Protocol?</h2>
        <p style={S.p}>
          Vow Protocol is an <strong>on-chain identity and session-key system</strong> for X1 Network.
          Each user mints a single soulbound <em>Vow identity</em> — a permanent program account tied to their
          wallet that cannot be transferred or sold, enforced by a one-per-wallet index on-chain. The account stays
          on-chain forever as an identity credential, even across unstake/re-stake cycles.
        </p>
        <p style={S.p}>
          Staking XNT into the protocol activates the identity, assigns a <strong>class tier</strong>
          (Ruby → Xenturion), and begins earning yield through the X1 Foundation stake pool.
          The identity's <strong>reputation fields</strong> — first stake date, total commitments,
          fulfilled commitments, cumulative stake days, highest class ever — are append-only and
          never reset, building a permanent on-chain history.
        </p>
        <p style={{ ...S.p, marginBottom: 0 }}>
          <strong>Session keys</strong> are lightweight keypairs that dApps hold to spend yield on a
          user's behalf — without requiring the user's main wallet to sign each transaction. Each session
          has hard limits (daily spend, lifetime spend, tx-per-day, allowed programs, expiry) enforced
          entirely on-chain. Users can revoke sessions instantly at any time.
        </p>
      </div>

      {/* Comparison table */}
      <div style={S.card}>
        <h2 style={S.h2}>Comparison</h2>
        <p style={S.p}>How Vow Protocol compares to existing identity and session primitives:</p>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Property</th>
                <th style={S.th}>Vow Protocol</th>
                <th style={S.th}>Standard Sessions<br /><span style={{ fontSize: 10, fontWeight: 400 }}>(typical wallet session keys)</span></th>
                <th style={S.th}>SBTs<br /><span style={{ fontSize: 10, fontWeight: 400 }}>(ERC-5192 / cNFT)</span></th>
                <th style={S.th}>ENS / SNS</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Non-transferable identity", "✓","✗","✓","✗"],
                ["Permanent on-chain credential", "✓","✗","✓","✓"],
                ["Deterministic PDA recovery", "✓","✗","✗","—"],
                ["Stake-backed (skin in the game)", "✓","✗","✗","✗"],
                ["Yield generation", "✓","✗","✗","✗"],
                ["Spend-limit session keys", "✓","Partial","✗","✗"],
                ["Revocable by owner", "✓ (session)","✓","Partial","✓"],
                ["dApp-spendable yield (CPI)", "✓","✗","✗","✗"],
                ["Class / reputation tiers", "✓","✗","Partial","✗"],
                ["No wallet popup after auth", "✓","✓","✗","✗"],
              ].map(([prop, vow, sess, sbt, ens]) => (
                <tr key={prop as string}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{prop}</td>
                  {[vow, sess, sbt, ens].map((v, i) => (
                    <td key={i} style={S.td}>
                      <span style={
                        v === "✓" ? S.check :
                        v === "✗" ? S.cross :
                        v === "Partial" ? S.partial : {}
                      }>{v}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session key deep-dive */}
      <div style={S.card}>
        <h2 style={S.h2}>Session Keys — How They Work</h2>

        <h3 style={S.h3}>Two wallet signatures to start playing</h3>
        <p style={S.p}>
          Day-to-day use takes <strong>two signatures</strong>: one to mint the identity, one to create a session.
          After that, game moves, payments, and yield collection are handled by the session key or permissionless
          cranks. The wallet is needed again only for owner actions such as adding stake, unstaking,
          withdrawing yield, or managing sessions.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Action</th>
                <th style={S.th}>Who signs</th>
                <th style={S.th}>Frequency</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["mintVow","Main wallet","Once ever per identity"],
                ["createSession","Main wallet","Once per session (per app/device)"],
                ["update_share_price","Anyone — permissionless crank","Once per epoch; the SDK prepends it to value-moving transactions"],
                ["harvest","Anyone — no owner signature required","Game cranks before yield_spend"],
                ["deposit_yield_balance","Session key, game server, or user","To seed yield_balance before rewards accrue"],
                ["yield_spend","Session key only — no wallet","Every in-game payment"],
                ["Game move instructions","Session key (if game accepts it)","Every game action"],
              ].map(([a,w,f]) => (
                <tr key={a as string}>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{a}</td>
                  <td style={S.td}>{w}</td>
                  <td style={{ ...S.td, fontSize: 12, color: "#666" }}>{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 style={{ ...S.h3, marginTop: 16 }}>Why harvest needs no wallet signature</h3>
        <p style={S.p}>
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>harvest</code> has
          no <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>owner</code> constraint
          on-chain — it is permissionless. The game backend can call it on the player's behalf at any time.
          A well-integrated game will crank <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>update_share_price</code> then
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3, marginLeft: 4 }}>harvest</code> automatically
          before attempting any <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_spend</code>.
          The player's wallet is never involved.
        </p>

        <h3 style={{ ...S.h3, marginTop: 4 }}>When yield_spend fails: zero balance</h3>
        <p style={S.p}>
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_spend</code> requires{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_balance {">"} 0</code>.
          There are two ways to get yield_balance above zero:
        </p>
        <ol style={{ fontSize: 13, lineHeight: 2, color: "#333", paddingLeft: 20, margin: "0 0 8px 0" }}>
          <li><strong>Wait for rewards:</strong> as the stake pool earns, share price rises. Run <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>harvest</code> to credit the gain as yield_balance (Treasury/Hybrid modes only).</li>
          <li><strong>Direct deposit:</strong> call <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>deposit_yield_balance(amount)</code> — any signer (user wallet, session key, dApp server) can fund an identity's yield_balance immediately. The deposit goes to the shared reserve and is credited instantly. This lets early users, game servers, or the session key itself bootstrap spending without waiting for yield.</li>
        </ol>
        <p style={S.p}>
          The dApp demo uses the second path: fund the session key with XNT, and when you click Execute, the session key auto-deposits into yield_balance then immediately calls yield_spend — all without the user's wallet.
        </p>

        <h3 style={{ ...S.h3, marginTop: 4 }}>Session keys are full X1 signers</h3>
        <p style={S.p}>
          A session key is a standard X1 (SVM) keypair. It can sign <em>any</em> instruction — game moves,
          position opens, order submissions, anything. The Vow protocol's on-chain enforcement only applies
          to <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_spend</code> calls.
          For all other instructions, the game simply verifies the session PDA on-chain
          to confirm the keypair is legitimately delegated by the identity owner before accepting it as
          a valid authority.
        </p>

        <h3 style={{ ...S.h3, marginTop: 4 }}>Session keys do not own positions</h3>
        <p style={S.p}>
          Positions, game state, and accounts on external programs must be keyed to the player's wallet or{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>VowState</code> address
          — not the session key pubkey. The session key is a <em>delegated operator</em>, not an owner.
          With this design, a player using session #0 on desktop and session #1 on mobile both see and
          manage the same game account — no fragmentation.
        </p>

        <h3 style={{ ...S.h3, marginTop: 4 }}>On-chain limits enforced per session</h3>
        <p style={{ ...S.p, marginBottom: 0 }}>Each session enforces for <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_spend</code> only:</p>
        <ul style={{ fontSize: 13, lineHeight: 2, color: "#333", marginTop: 6 }}>
          <li><strong>Allowed programs</strong> — with a list, spends must arrive by CPI from a listed program, signed by its <code>vow_caller</code> PDA. An empty list is unrestricted: the key can pay any address</li>
          <li><strong>Daily spend limit</strong> — resets at 00:00 UTC (0 = no limit)</li>
          <li><strong>Lifetime spend limit</strong> — hard cap for the session's entire duration (0 = no limit)</li>
          <li><strong>Velocity limit</strong> — max yield_spend calls per UTC day (0 = no limit)</li>
          <li><strong>Expiry</strong> — auto-deactivates after a timestamp (0 = never)</li>
          <li><strong>Spend source</strong> — only <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_balance</code>; a session cannot withdraw or unstake your stake</li>
        </ul>
      </div>

      {/* Gaming use case */}
      <div style={S.card}>
        <h2 style={S.h2}>Use Case: Gaming</h2>
        <p style={S.p}>
          A blockchain game integrates Vow Protocol to enable <strong>completely wallet-free gameplay</strong>
          after a one-time setup. The player signs twice at the start — mint and create session — and never
          touches their wallet again. The game handles everything else.
        </p>
        <h3 style={S.h3}>Exact flow</h3>
        <ol style={{ fontSize: 13, lineHeight: 2.2, color: "#333", paddingLeft: 20, margin: 0 }}>
          <li><strong>Mint identity</strong> — one wallet signature. Creates the permanent on-chain credential.</li>
          <li><strong>Create session</strong> — one wallet signature. Game generates a keypair, player signs once to authorize it.</li>
          <li><strong>Play</strong> — session key signs all game move instructions. No wallet popup. Game accounts are keyed to the player's identity, not the session key.</li>
          <li><strong>Payment</strong> — when the game charges for an item, it calls <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>harvest</code> permissionlessly, then <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_spend</code> with the session key. No player signature. All silent.</li>
          <li><strong>Zero balance</strong> — if yield hasn't accrued yet, the game server (or session key) can call <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>deposit_yield_balance</code> to seed the player's balance. This lets the game onboard users before their staking rewards kick in.</li>
        </ol>
        <h3 style={{ ...S.h3, marginTop: 16 }}>Class-gating</h3>
        <p style={{ ...S.p, marginBottom: 0 }}>
          Games can gate content, guilds, or ranked modes by class tier. A Sapphire-class player (≥ 2001 XNT,
          2-year lock) has verifiable capital locked on-chain. That makes fake accounts more expensive, though it does not prove
          one person controls only one wallet.
        </p>
      </div>

      {/* Perps use case */}
      <div style={S.card}>
        <h2 style={S.h2}>Use Case: Perps / Trading Bots</h2>
        <p style={S.p}>
          A perpetuals DEX or trading-bot service needs to execute on behalf of a user without requiring
          constant wallet signatures. Vow Protocol session keys are the answer.
        </p>
        <h3 style={S.h3}>Flow</h3>
        <ol style={{ fontSize: 13, lineHeight: 2.2, color: "#333", paddingLeft: 20, margin: 0 }}>
          <li>User connects to the DEX and authorizes a session for the perps program ID.</li>
          <li>Session has a per-day limit (e.g. 10 XNT) and a lifetime cap (e.g. 50 XNT).</li>
          <li>Trading bot holds the session keypair and submits positions without user action.</li>
          <li>User can revoke the session instantly from any device — atomic on-chain.</li>
        </ol>
        <h3 style={{ ...S.h3, marginTop: 16 }}>Risk controls</h3>
        <p style={{ ...S.p, marginBottom: 0 }}>
          The session's limits are a spend cap enforced by the protocol, not the dApp: even a compromised
          dApp <em>cannot</em> exceed them. They cap what is paid out of yield_balance, not trading losses
          inside the dApp's own program.
          Sessions can only spend <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_balance</code>; they cannot unstake or withdraw the staked position.
        </p>
      </div>

      {/* Class table */}
      <div style={S.card}>
        <h2 style={S.h2}>Class Tiers</h2>
        <p style={S.p}>
          Class is determined by total staked XNT and sets the lock duration. It is never downgraded —
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3, fontSize: 12 }}>highest_class_ever</code> is an append-only reputation field.
          Use <strong>Add Stake</strong> on an active identity to increase your principal and upgrade class.
          <strong> Every top-up re-locks the whole position</strong> for the full class duration from that day,
          even within the same class or after the position had matured.
        </p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Class</th>
              <th style={S.th}>Name</th>
              <th style={S.th}>Stake range (XNT)</th>
              <th style={S.th}>Lock period</th>
              <th style={S.th}>Character</th>
            </tr>
          </thead>
          <tbody>
            {CLASS_NAMES.map((name, i) => (
              <tr key={name}>
                <td style={S.td}>
                  <span style={S.badge(CLASS_COLORS[i])}>{i}</span>
                </td>
                <td style={{ ...S.td, fontWeight: 700 }}>{name}</td>
                <td style={S.td}>{STAKE_TIERS[i]}</td>
                <td style={S.td}>{LOCK_DAYS[i]} days</td>
                <td style={{ ...S.td, fontSize: 12, color: "#666" }}>{CLASS_FEATURES[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Developer quick-start */}
      <div style={S.card}>
        <h2 style={S.h2}>Developer Quick-Start</h2>
        <p style={S.p}>Program ID: <code style={{ fontSize: 12, background: "#f4f4f4", padding: "2px 6px", borderRadius: 3 }}>7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ</code> (X1 Mainnet)</p>
        <code style={S.code}>{`// Install
npm install @coral-xyz/anchor @solana/web3.js

// Initialize client
import { VowClient } from "./sdk/client";
const client = new VowClient(provider);

// Create a session (one wallet signature)
const sessionIndex = 0;
const sessionKeypair = Keypair.generate();
await client.createSession(
  vowStatePubkey,
  sessionIndex,              // deterministic PDA slot
  sessionKeypair.publicKey,  // ephemeral key for the dApp
  [YOUR_PROGRAM_ID],         // restrict to your program only
  {
    expiryTs: new BN(Date.now() / 1000 + 86400 * 30), // 30 days
    dailyLimit: new BN(1_000_000_000),  // 1 XNT/day
    lifetimeLimit: new BN(10_000_000_000), // 10 XNT total
    velocityLimit: 100, // 100 tx/day
  }
);

// Derive the session PDA from index (no chain scan needed)
const [sessionPda] = findSessionAccount(vowStatePubkey, sessionIndex);

// Optional: deposit directly into yield_balance (session key, user, or dApp server can call)
const [unstakeEscrow] = findUnstakeEscrow(vowStatePubkey);
await program.methods.depositYieldBalance(new BN(amount))
  .accounts({ config, vowState: vowStatePubkey, reserve, unstakeEscrow,
              depositor: sessionKeypair.publicKey, systemProgram })
  .signers([sessionKeypair])  // session key pays from its own XNT, credits identity's yield_balance
  .rpc();

// Spend yield. A whitelisted session must be spent by CPI FROM your program:
//   let (auth, bump) = Pubkey::find_program_address(&[b"vow_caller"], &crate::ID);
//   vow::cpi::yield_spend(CpiContext::new_with_signer(vow_program, YieldSpend {
//       config, vow_state, session_account,
//       calling_program,          // your program's account
//       app_registry,             // PDA ["app", your_program]; required, may be empty
//       reserve, destination, session_signer, system_program,
//       caller_authority: Some(auth_account),
//   }, &[&[b"vow_caller", &[bump]]]), amount)?;
//
// Your program must choose or validate \`destination\` itself: Vow does not.
await myProgram.methods.buyItem(new BN(amount))
  .accounts({ /* the accounts above */ sessionSigner: sessionKeypair.publicKey })
  .preInstructions(await client.freshPriceIxs()) // payouts need this epoch's price
  .signers([sessionKeypair])
  .rpc();`}
        </code>
      </div>

      {/* Portability & Cross-Device */}
      <div style={S.card}>
        <h2 style={S.h2}>Portability &amp; Cross-Device</h2>
        <p style={S.p}>
          A Vow identity is a <strong>program-derived account on X1</strong>. It exists entirely on-chain —
          nothing is stored in your browser, phone, or any device. Connect the same wallet on any device
          and you instantly have full access to your identity, reputation, sessions, and yield.
        </p>
        <h3 style={S.h3}>How recovery works</h3>
        <p style={S.p}>
          The identity PDA is derived from your <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3, fontSize: 12 }}>asset_id</code>,
          which is stored on-chain at a deterministic address from your mint index. Given your wallet address,
          any client can enumerate all identities you own in a single RPC call:
        </p>
        <code style={S.code}>{`// Find all Vow identities owned by this wallet
const identities = await client.getVowStatesByOwner(walletPublicKey);
// Returns all VowState accounts with owner == walletPublicKey
// Works on any device, any client, any time — no backup files needed`}</code>
        <h3 style={{ ...S.h3, marginTop: 16 }}>Sessions are keypairs, not device-bound</h3>
        <p style={S.p}>
          A session is a keypair and a set of on-chain spending limits. The protocol has no concept of
          "device" — if you export a session keypair to two devices, both can use it concurrently.
          The shared limits (<code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>spent_today</code>,{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>spent_total</code>) live on-chain in the session PDA, so combined spending
          across all devices is still capped — there is no double-spend risk.
        </p>
        <p style={S.p}>
          The pattern of one session per device (index 0 = browser, 1 = phone) is an organizational
          convenience so you can revoke a lost device's session without affecting others. It is not a
          protocol requirement — one session shared across all your devices works fine.
        </p>
        <h3 style={{ ...S.h3, marginTop: 12 }}>Recoverable session keys — reconstruct on any device</h3>
        <p style={S.p}>
          All session PDAs are enumerable on-chain by identity:{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>getSessions(vowState)</code>{" "}
          uses a <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>getProgramAccounts</code> memcmp filter and returns every session for that identity from any device.
          Public keys, limits, and status are all readable on-chain. The private key is a different matter.
        </p>
        <p style={S.p}>
          Session keys created with the optional{" "}<strong>Recoverable Session</strong> setting are derived
          deterministically from your wallet signature using a structured domain-separated message:
        </p>
        <code style={S.code}>{`// Derivation message — domain + program + identity + nonce, impossible to collide
const msg = new TextEncoder().encode(
  "VOW Session Authorization\\n" +
  "Domain: " + window.location.origin + "\\n" +   // separates keys per site (wallets do not enforce it)
  "Program: 7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ\\n" +
  "Identity: <vowState>\\n" +
  "Nonce: <creationNonce>\\n" +  // read from SessionAccount.creation_nonce on-chain
  "Version: 2"
);

const sig = await wallet.signMessage(msg);   // 64-byte Ed25519 signature
// SHA-256 the full signature to eliminate seed bias from using raw prefix bytes
const hashBuffer = await crypto.subtle.digest("SHA-256", sig);
const sessionKeypair = Keypair.fromSeed(new Uint8Array(hashBuffer));
// Same wallet + same origin + same program + same identity + same nonce = same keypair, always`}</code>
        <p style={S.p}>
          Ed25519 signing is deterministic — there is no random nonce (unlike ECDSA). The same message signed
          by the same wallet always produces identical bytes. No secret needs to be exported, backed up, or
          transferred between devices.
        </p>
        <h3 style={{ ...S.h3, marginTop: 12 }}>Security model for session keys</h3>
        <p style={S.p}>
          <strong>Session keys are hot keys.</strong> A derived session keypair is only as secure as your
          browser's localStorage. A compromised browser can read it. <strong>The Domain line is not enforced by
          the wallet:</strong> a phishing site can ask you to sign the same text, and that signature rebuilds the
          key. Only sign a "VOW Session Authorization" message on the real site. This is an intentional trade-off:
        </p>
        <ul style={{ fontSize: 13, lineHeight: 2.0, color: "#444", paddingLeft: 20, margin: "0 0 8px 0" }}>
          <li>The session key is <strong>bounded</strong> — daily limit, lifetime limit, program whitelist, and expiry are all enforced on-chain.</li>
          <li>The session key is <strong>scoped</strong> — within Vow it can only call <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_spend</code> within its limits (plus permissionless instructions anyone can call). It cannot unstake, change yield mode, or withdraw the staked position.</li>
          <li>The wallet remains the root authority — only the main wallet can create, revoke, or modify sessions.</li>
          <li>Revoke a session immediately if you suspect a device is compromised: <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>revokeSession(vowState, index)</code> takes effect on-chain instantly.</li>
        </ul>
        <h3 style={{ ...S.h3, marginTop: 12 }}>Restore cannot resurrect invalidated sessions</h3>
        <p style={S.p}>
          Restoring a session key on a new device only reconstructs the private key locally.{" "}
          <strong>On-chain authority is enforced independently</strong> by the program every time{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_spend</code> is called.
          The program checks all four conditions before accepting any spend:
        </p>
        <ul style={{ fontSize: 13, lineHeight: 2.0, color: "#444", paddingLeft: 20, margin: "0 0 8px 0" }}>
          <li><code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>session.active == true</code> — revoked sessions fail here</li>
          <li><code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>expiry_ts == 0 || now &lt; expiry_ts</code> — expired sessions fail here</li>
          <li><code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>session.start_ts &gt;= vow.sessions_invalidated_at</code> — sessions from before an unstake/reactivate cycle fail here</li>
          <li><code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>vow.active_stake == true</code> — dormant identities fail here</li>
        </ul>
        <p style={S.p}>
          Having the private key is necessary but not sufficient. A restored key for a revoked session cannot spend.
        </p>
        <h3 style={{ ...S.h3, marginTop: 12 }}>Wallet compatibility</h3>
        <p style={S.p}>
          Recoverable sessions depend on <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>signMessage</code> producing identical bytes for the same input across
          sessions and devices. Ed25519 signing is deterministic, but a wallet can change how it formats or signs messages.
          Before relying on session recovery in production, verify <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>signMessage</code> determinism on any additional
          wallet you plan to support by signing the same message on two devices and comparing pubkeys.
          If a wallet does not guarantee deterministic <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>signMessage</code>, use the{" "}
          <strong>One-Time Session</strong> option instead.
        </p>
        <h3 style={{ ...S.h3, marginTop: 12 }}>Index reuse — solved by on-chain nonce</h3>
        <p style={S.p}>
          Recoverable session derivation uses both <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>session_index</code>{" "}
          and <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>creation_nonce</code> as inputs.
          The <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>creation_nonce</code> is a global counter
          stored in <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>VowState.session_nonce</code> that
          increments on every <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>create_session</code> call.
          Its value at creation time is stored in{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>SessionAccount.creation_nonce</code>, making the
          derivation message unique per creation — even if the same index slot is reused.
        </p>
        <p style={S.p}>
          When you restore a session on a new device, the UI reads{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>creation_nonce</code> from the on-chain{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>SessionAccount</code> and passes it to the derivation.
          A stale dApp holding an old key for a recycled slot will find its key no longer matches the current
          session's <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>session_key</code> pubkey and will receive an{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>SessionInactive</code> error on-chain.
        </p>
        <h3 style={{ ...S.h3, marginTop: 12 }}>To recover sessions on a new device</h3>
        <p style={{ ...S.p }}>
          Connect wallet → load identity → open the Sessions panel → click <strong>Restore</strong> next to any session.
          The protocol re-derives the keypair and verifies it against the on-chain{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>session_key</code> pubkey.
          If it matches, the key is stored locally and the session is usable immediately.
          If it does not match, the session was created as a One-Time Session — revoke it and create a new Recoverable Session.
        </p>
        <h3 style={{ ...S.h3, marginTop: 12 }}>yield_spend does not change identity or reputation</h3>
        <p style={{ ...S.p, marginBottom: 0 }}>
          Playing a game or any <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_spend</code> transaction
          only moves XNT from the reserve and decrements your yield_balance.
          Reputation fields (<code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>totalCommitments</code>,{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>cumulativeStakeDays</code>,{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>highestClassEver</code>, etc.) are
          updated only by staking operations: <em>mintVow</em>, <em>activateStake</em>, and <em>completeUnstake</em>.
        </p>
      </div>

      {/* dApp Integration & Listing */}
      <div style={S.card}>
        <h2 style={S.h2}>dApp Integration &amp; Listing</h2>
        <p style={S.p}>
          Any X1 program can integrate Vow Protocol. There is no gated SDK or approval process.
          dApps interact through on-chain CPI calls to the Vow program.
        </p>
        <h3 style={S.h3}>Integration steps</h3>
        <ol style={{ fontSize: 13, lineHeight: 2.2, color: "#333", paddingLeft: 20, margin: 0 }}>
          <li>Register your program: optionally call <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>register_app(program_id)</code> to publish your program ID on-chain. Registration is permissionless and not required to receive spends.</li>
          <li>On user connect: call <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>getVowStatesByOwner(wallet)</code> — returns their identity instantly with no off-chain lookup.</li>
          <li>Create a session: generate a keypair, ask the user to sign <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>createSession</code> once.</li>
          <li>Transact: your program calls <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_spend</code> by CPI, signing with its <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>["vow_caller"]</code> PDA, with the session key as a transaction signer. Your program must validate the destination.</li>
        </ol>
        <h3 style={{ ...S.h3, marginTop: 16 }}>Class gating</h3>
        <p style={S.p}>
          Read <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>state.class</code> (current tier) and
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3, marginLeft: 4 }}>state.highestClassEver</code> (peak tier, never decreases) to gate features by commitment level.
          A Sapphire user (≥ 2001 XNT, 2-year lock) cannot fake or borrow their credential — it requires real
          capital locked on-chain.
        </p>
        <h3 style={{ ...S.h3, marginTop: 16 }}>Authority profiles</h3>
        <p style={{ ...S.p, marginBottom: 0 }}>
          A wallet can store its own <strong>AuthorityProfile</strong>: reusable session defaults for daily limit,
          lifetime limit, expiry, and allowed programs. A session can only use a profile owned by the same wallet, so a
          dApp cannot publish one for its users. Values passed when creating the session override the defaults.
        </p>
      </div>

      {/* Identity Lifecycle */}
      <div style={S.card}>
        <h2 style={S.h2}>Identity Lifecycle — Stacking &amp; Renewal</h2>
        <p style={S.p}>
          A Vow identity persists <strong>forever on-chain</strong> as a credential regardless of stake state.
          Unstaking transitions the identity to <em>Dormant</em> — not deleted. You can re-activate it at any time
          with a new stake, optionally at a higher class.
        </p>
        <h3 style={S.h3}>Full cycle</h3>
        <code style={S.code}>{`// 1. Mint — creates the permanent credential
await client.mintVow(stakeAmount, yieldMode);

// 2. Unstake when lock expires (two steps)
await client.beginUnstake(vowState);    // locks position in escrow
// wait until the next epoch
await client.completeUnstake(vowState); // receives shares × exit price + yield_balance

// Identity is now Dormant — credential stays on-chain forever
// Sessions are automatically invalidated

// 3. Re-activate at any time (can upgrade class by staking more)
await client.activateStake(vowState, newStakeAmount, newYieldMode);
// Identity is Active again with fresh lock period`}</code>
        <h3 style={{ ...S.h3, marginTop: 16 }}>What persists across cycles (permanent)</h3>
        <ul style={{ fontSize: 13, lineHeight: 2, color: "#333", marginTop: 6, paddingLeft: 20 }}>
          <li><code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>first_staked_at</code> — original mint timestamp, immutable</li>
          <li><code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>total_commitments</code> — increments on every mint and activate_stake</li>
          <li><code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>total_fulfilled</code> — increments only when unstaking after lock period expires</li>
          <li><code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>cumulative_stake_days</code> — total active stake days across all cycles</li>
          <li><code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>highest_class_ever</code> — never decreases; records peak commitment tier</li>
        </ul>
        <h3 style={{ ...S.h3, marginTop: 16 }}>What resets on re-activation</h3>
        <p style={{ ...S.p, marginBottom: 0 }}>
          Shares, yield_balance, and sessions reset on each new stake position. Reputation fields never reset.
          This design rewards <em>long-term serial stakers</em> — someone who stakes, matures, unstakes, and re-stakes
          ten times has a richer on-chain history than someone who staked once and never moved.
        </p>
      </div>

      {/* Yield Modes */}
      <div style={S.card}>
        <h2 style={S.h2}>Yield Modes — Treasury, Hybrid, Compound</h2>
        <p style={S.p}>
          Each identity chooses how its stake pool rewards are distributed.
          The mode is set at mint and can be changed any time with <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>update_yield_mode</code>.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Mode</th>
                <th style={S.th}>What harvest does</th>
                <th style={S.th}>yield_balance</th>
                <th style={S.th}>Best for</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Treasury","Burns shares equal to gain, credits yield_balance","Grows with each harvest","dApp spending and withdrawals"],
                ["Hybrid","50% to shares (compound), 50% to yield_balance","Grows at half rate","Balance of growth and liquidity"],
                ["Compound","Gain tracked in total_harvested; no transfers","Always 0 — cannot be spent","Pure staking, maximum long-term growth"],
              ].map(([m, h, y, b]) => (
                <tr key={m}>
                  <td style={{ ...S.td, fontWeight: 700 }}>{m}</td>
                  <td style={S.td}>{h}</td>
                  <td style={S.td}>{y}</td>
                  <td style={{ ...S.td, fontSize: 12, color: "#666" }}>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 style={{ ...S.h3, marginTop: 16 }}>Concrete example — 1,000 XNT at 7% APY over 1 year</h3>
        <ul style={{ fontSize: 13, lineHeight: 2.2, color: "#333", paddingLeft: 20, margin: 0 }}>
          <li><strong>Treasury:</strong> harvest once → about 70 XNT in yield_balance, available to spend or withdraw. Shares worth the gain are burned, and yield_balance no longer earns yield.</li>
          <li><strong>Hybrid:</strong> harvest → 35 XNT in yield_balance + 35 XNT compounded into shares.</li>
          <li><strong>Compound:</strong> no harvested yield_balance. On unstake → receive about 1,070 XNT minus pool fees. Cannot spend yield mid-stake.</li>
        </ul>
        <p style={{ ...S.p, marginTop: 12, marginBottom: 0 }}>
          Switching modes is instant — <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>update_yield_mode</code> calls
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3, marginLeft: 4 }}>settle_idnft</code> first,
          locking in any accrued gain at the old mode before the change takes effect. No yield is lost during a mode switch.
        </p>
      </div>

      {/* Session Key Funding */}
      <div style={S.card}>
        <h2 style={S.h2}>Session Key Funding &amp; Spending</h2>
        <p style={S.p}>
          A session key is an X1 keypair. It needs a small XNT balance to pay network transaction fees.
          This is <strong>entirely separate</strong> from yield — its own balance pays fees, while purchases come from yield_balance.
        </p>
        <h3 style={S.h3}>Two separate XNT flows — fee vs. payment</h3>
        <ul style={{ fontSize: 13, lineHeight: 2, color: "#333", paddingLeft: 20, marginTop: 6 }}>
          <li><strong>Session key XNT (fees):</strong> X1 transactions currently cost about 0.002 XNT each, so 0.01 XNT covers roughly five. This is separate from yield. Send XNT to the session key's address after creating it.</li>
          <li><strong>yield_balance (the payment):</strong> The actual amount spent via yield_spend comes from the identity's yield_balance, which is backed by the shared protocol reserve. The session key's own XNT is never the payment. It only covers network fees.</li>
        </ul>
        <h3 style={{ ...S.h3, marginTop: 16 }}>Funding yield_balance directly</h3>
        <p style={S.p}>
          Anyone — user wallet, session key, or dApp server — can call{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>deposit_yield_balance(amount)</code> to
          deposit XNT into the protocol reserve and instantly credit the identity's yield_balance.
          This means the session key can fund the user's yield on their behalf without any wallet interaction.
          The deposit requires active_stake=true and is blocked if an unstake is in progress (to prevent the deposit being stranded outside the escrow payout). The credited yield is available for yield_spend immediately.
        </p>
        <h3 style={{ ...S.h3, marginTop: 16 }}>How yield_spend flows</h3>
        <ol style={{ fontSize: 13, lineHeight: 2.2, color: "#333", paddingLeft: 20, margin: 0 }}>
          <li>Protocol checks: session active and not expired or invalidated, identity active, caller authorized, app not blocked, limits not exceeded, reserve liquid.</li>
          <li>Transfers <em>amount</em> XNT from the <strong>shared reserve PDA</strong> to <em>destination</em>.</li>
          <li>Decrements <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>identity.yield_balance</code> by the same amount.</li>
          <li>Updates session's <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>spent_today</code> and <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>spent_total</code>.</li>
          <li>The session key pays the network fee (about 0.002 XNT) from its own balance, not from yield_balance.</li>
        </ol>
      </div>

      {/* Authentication & Permissions */}
      <div style={S.card}>
        <h2 style={S.h2}>Authentication &amp; Permissions</h2>
        <p style={S.p}>
          The authentication model is: <strong>one wallet signature creates a session; zero wallet signatures
          after that.</strong> The session key handles all subsequent interactions within its declared scope.
        </p>
        <h3 style={S.h3}>What a session key can do</h3>
        <ul style={{ fontSize: 13, lineHeight: 2, color: "#333", paddingLeft: 20, marginTop: 6 }}>
          <li>Call <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_spend</code> up to its daily and lifetime limits</li>
          <li>If whitelisted, spend only through a CPI from a program in <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>allowed_program_ids</code>. If the list is empty, pay any address</li>
          <li>Operate until its <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>expiry_ts</code> (0 = never expires)</li>
        </ul>
        <h3 style={{ ...S.h3, marginTop: 16 }}>What a session key cannot do</h3>
        <ul style={{ fontSize: 13, lineHeight: 2, color: "#333", paddingLeft: 20, marginTop: 6 }}>
          <li>Unstake or withdraw the staked position (it can only spend yield_balance)</li>
          <li>Create new sessions, revoke sessions, or change yield mode</li>
                    <li>Exceed its declared spend limits even if yield_balance is larger</li>
          <li>Survive identity re-activation — <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>sessions_invalidated_at</code> is updated on every activate_stake and complete_unstake</li>
        </ul>
        <h3 style={{ ...S.h3, marginTop: 16 }}>Revocation</h3>
        <p style={{ ...S.p, marginBottom: 0 }}>
          Call <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>revokeSession(vowState, sessionIndex)</code> with the owner wallet — the session's
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3, marginLeft: 4 }}>active</code> field is set to false on-chain immediately.
          No off-chain revocation list, no propagation delay. The revocation is atomic with the transaction.
        </p>
      </div>

      {/* Wallet-free transactions */}
      <div style={S.card}>
        <h2 style={S.h2}>Transactions Without Wallet Popups</h2>
        <p style={S.p}>
          After the one-time session authorization, the user never sees another wallet popup.
          Every subsequent <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>yield_spend</code> is signed exclusively by the session key
          held by the dApp. From the user's perspective: click → confirmed, with no wallet prompt. These transactions still have network fees, paid by the session key.
        </p>
        <h3 style={S.h3}>Which operations require user wallet signature</h3>
        <ul style={{ fontSize: 13, lineHeight: 2, color: "#333", paddingLeft: 20, marginTop: 6 }}>
          <li><strong>Require wallet:</strong> mintVow, addStake, activateStake, createSession, revokeSession, closeSession, withdrawYield, beginUnstake, completeUnstake, updateYieldMode</li>
          <li><strong>No wallet popup (session key signs and pays the fee):</strong> yield_spend</li>
          <li><strong>Permissionless cranks (any signer):</strong> updateSharePrice, flushReserveToPool, withdrawFromPool, harvest, depositYieldBalance</li>
        </ul>
        <h3 style={{ ...S.h3, marginTop: 16 }}>Fee model</h3>
        <p style={{ ...S.p, marginBottom: 0 }}>
          The session key pays about 0.002 XNT per yield_spend in network fees from its own XNT balance.
          The actual <em>payment</em> (the yield being spent) comes from the pool reserve. These are two
          separate flows: fee = session key's XNT, payment = user's yield_balance from the reserve.
          If a dApp wants to provide fully zero-cost UX, it can fund the session key on the user's behalf.
        </p>
      </div>

      {/* Agent Integration */}
      <div style={S.card}>
        <h2 style={S.h2}>Agent &amp; Bot Integration</h2>
        <p style={S.p}>
          Vow Protocol session keys are designed for <strong>autonomous agents</strong> — AI assistants,
          trading bots, automated scripts — that need to transact on-chain without requiring human co-signing
          on every action. The user authorizes once; the agent acts within declared limits indefinitely.
        </p>
        <h3 style={S.h3}>Integration pattern</h3>
        <code style={S.code}>{`// 1. User (or setup script) creates a session for the agent
const agentKeypair = Keypair.generate();
await client.createSession(
  vowState,
  sessionIndex,                    // e.g. 1 = "AI assistant"
  agentKeypair.publicKey,
  [AGENT_PROGRAM_ID],              // restrict to agent's program
  {
    expiryTs: new BN(0),           // 0 = never expires
    dailyLimit: new BN(100_000),   // 0.0001 XNT/day cap
    lifetimeLimit: new BN(0),      // 0 = no lifetime cap
    velocityLimit: 50,             // 50 tx/day max
  }
);

// 2. User sends agentKeypair.secretKey to the agent (secure channel)

// 3. Agent operates autonomously — no human needed
const agentKeypair = Keypair.fromSecretKey(storedSecretKey);
const conn = new Connection(RPC_URL);

// A whitelisted session can't call yieldSpend directly (CallerNotAuthorized).
// The agent calls AGENT_PROGRAM, which validates the payment and CPIs into Vow.
async function agentSpend(vowState, sessAcc, amount, destination) {
  const tx = await agentProgram.methods
    .pay(new BN(amount))
    .accounts({ ..., destination, sessionSigner: agentKeypair.publicKey })
    .preInstructions(await client.freshPriceIxs())
    .transaction();
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = agentKeypair.publicKey;
  tx.sign(agentKeypair);
  const sig = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
  return sig;
}`}</code>
        <h3 style={{ ...S.h3, marginTop: 16 }}>Multi-agent setup</h3>
        <p style={{ ...S.p, marginBottom: 0 }}>
          Create one session per agent (index 0 = browser, 1 = trading bot, 2 = AI assistant, etc.).
          Each session has independent limits and an independent keypair. A rogue or compromised agent
          can only spend up to its declared <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>daily_limit</code> and
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3, marginLeft: 4 }}>lifetime_limit</code>.
          Revoke a specific agent session without affecting any other. A session cannot unstake or withdraw the staked position. Always whitelist agent sessions and set a cap.
        </p>
      </div>

      {/* Design Rationale */}
      <div style={S.card}>
        <h2 style={S.h2}>Why Soulbound Identity? The Design Rationale</h2>
        <h3 style={S.h3}>Why staking-backed?</h3>
        <p style={S.p}>
          Free accounts are free to create — so they're free to abuse. A Vow identity costs real XNT
          locked for months or years. This creates <strong>economic skin in the game</strong>: the identity
          holder has something to lose. Sybils, spam accounts, and bots face capital cost, not just inconvenience.
          The higher the class, the larger and longer the commitment — a Xenturion identity (10,000+ XNT,
          5-year lock) represents a verifiable, irreversible signal of long-term alignment.
        </p>
        <h3 style={S.h3}>Why soulbound?</h3>
        <p style={S.p}>
          Identity that can be sold is identity that can be rented, borrowed, or laundered.
          Vow identities are non-transferable by design. The reputation fields attached to the account — first
          stake date, fulfilled commitments, cumulative stake days — belong to the person who built them.
          They cannot be purchased on a secondary market. This makes class tiers a genuine measure of
          commitment, not wealth.
        </p>
        <h3 style={S.h3}>Why permanent?</h3>
        <p style={S.p}>
          Reputation should not evaporate. When a user unstakes, their identity becomes Dormant —
          not deleted. Five years of staking history remains readable on-chain forever as a credential.
          A verified Emerald (365-day lock fulfilled) with six prior commitments is a richer signal than
          a fresh account, regardless of what it holds today.
        </p>
        <h3 style={S.h3}>Why session keys?</h3>
        <p style={{ ...S.p, marginBottom: 0 }}>
          Web3's UX problem is the constant wallet popup. Every transaction breaks flow. Games, trading bots,
          and AI agents cannot operate if they must interrupt the user for every on-chain action.
          Session keys delegate a narrow, time-limited, spend-capped permission slice to the dApp —
          enough to function, not enough to cause harm. The user signs once and forgets about it until they
          want to revoke.
        </p>
      </div>

      {/* Share price + risks */}
      <div style={S.card}>
        <h2 style={S.h2}>Share Price, Fees &amp; Solvency</h2>
        <p style={S.p}>
          Every share is an equal claim on what the protocol can actually pay out. The price is
          <strong> NAV / total shares</strong>, refreshed by the permissionless <code>update_share_price</code> crank.
        </p>
        <code style={S.code}>{`liabilities L = all yield balances + pending unstakes
liquid XNT  S = reserve balance − rent
pXNT value  P = pXNT × pool rate × (1 − withdrawal fee)

if S ≥ L:  NAV = P + (S − L) × (1 − deposit fee) × (1 − withdrawal fee)
else:      NAV = P − (L − S)

price = min(NAV / total_shares, 1.25 × redeemable pool rate)`}</code>
        <ul style={{ fontSize: 13, lineHeight: 2, color: "#333", paddingLeft: 20, marginTop: 10 }}>
          <li><strong>Entry:</strong> new stake buys shares net of the pool's deposit and withdrawal fees (0.1% each today), so existing holders don't pay a newcomer's fees.</li>
          <li><strong>Freshness:</strong> mint, add_stake, activate_stake, harvest, begin_unstake, and update_yield_mode revert with <code>PriceStale</code> unless the price was refreshed for the current epoch. Payouts (yield_spend, withdraw_yield, complete_unstake) need the same refresh, so a new epoch's loss is seen before anyone is paid. The SDK prepends it, and it waits for the X1 pool's own epoch update.</li>
          <li><strong>Exit:</strong> the payout is fixed at begin_unstake. complete_unstake pays it in full or reverts with <code>ReserveIlliquid</code>, never a partial amount.</li>
          <li><strong>Liquidity:</strong> flushes keep rent, yield balances, and pending unstakes in liquid XNT. If the reserve is short, anyone can redeem just enough pXNT.</li>
          <li><strong>Insolvency:</strong> if assets before pool fees fall short of liabilities by more than 0.001 XNT, value-moving instructions halt, payouts pause, and new yield deposits are rejected, so early claimants can't drain what remains. A pool fee change alone halts value-moving instructions but does not freeze payouts. Everything resumes at the next price update once the protocol is solvent.</li>
        </ul>
        <h3 style={{ ...S.h3, marginTop: 12 }}>Risks and trust assumptions</h3>
        <ul style={{ fontSize: 13, lineHeight: 2, color: "#333", paddingLeft: 20, margin: 0 }}>
          <li><strong>Program upgrades:</strong> the program is upgradeable by a single key, which is also the admin. There is no pause function.</li>
          <li><strong>Stake pool:</strong> funds depend on the X1 Foundation stake pool program, its operators, and validator performance. Share value can fall.</li>
          <li><strong>Locks:</strong> stake cannot be withdrawn before maturity, and a top-up restarts the lock on the whole position.</li>
          <li><strong>Session keys:</strong> a leaked key can spend yield_balance up to its limits. An unrestricted session can pay any address.</li>
          <li><strong>Losses:</strong> after a price drop, harvest credits nothing until the position recovers past its previous value.</li>
          <li><strong>Reputation:</strong> only the owner can write an identity's one-time commitment record, and the owner chooses when. Treat <code>commitment_score</code> as a display metric and prefer the fields on VowState.</li>
        </ul>
      </div>

      {/* Permissionless Mechanisms */}
      <div style={S.card}>
        <h2 style={S.h2}>Permissionless Mechanisms</h2>
        <p style={S.p}>
          Several protocol operations are fully permissionless — anyone can call them, no admin key needed.
          These are the "cranks" that keep the protocol healthy without requiring trust in any operator.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Instruction</th>
                <th style={S.th}>Who can call</th>
                <th style={S.th}>What it does</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["update_share_price","Anyone (fee payer only)","Sets share price to NAV / total shares: reserve XNT + redeemable pXNT − amounts owed, capped at 1.25× the pool rate. Records the pool epoch and fees. If the protocol is insolvent, it halts value-moving instructions instead."],
                ["flush_reserve_to_pool","Anyone (fee payer only)","Deposits only idle reserve XNT into the X1 Foundation stake pool for pXNT (this is what earns yield). XNT backing yield balances and pending unstakes always stays liquid."],
                ["withdraw_from_pool","Anyone — gated by need","Redeems just enough pXNT to cover what the protocol owes right now (yield balances + pending unstakes). Reverts if the reserve already covers it. Stake withdrawals pause briefly after each epoch boundary, so callers may need to retry."],
                ["backfill_owner_index","Anyone (pays rent)","One-time creation of the one-per-wallet index for identities minted before it existed."],
                ["register_app","Anyone (pays rent)","Publishes a program in the app registry. Registration grants no privileges."],
                
                ["harvest","Anyone (fee payer only)","Settles an identity's gain at the fresh share price and applies its yield mode. No owner signature required."],
                ["deposit_yield_balance","Any depositor (signs and pays)","Deposits XNT directly into the reserve and credits the target identity's yield_balance. Session keys, dApp servers, or users can call this."],
              ].map(([ix, who, what]) => (
                <tr key={ix as string}>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{ix}</td>
                  <td style={S.td}>{who}</td>
                  <td style={{ ...S.td, fontSize: 12, color: "#555" }}>{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 style={{ ...S.h3, marginTop: 16 }}>Why permissionless?</h3>
        <p style={S.p}>
          If the share price crank required admin keys, the protocol's yield accounting would halt every time
          the admin is offline. Permissionless cranks mean any node, keeper bot, or curious user can keep the
          protocol running. These operations take no user-supplied balances or prices, and the accounts they read are
          pinned on-chain. Donations to the reserve can move NAV, so the price is capped relative to the pool rate.
        </p>
        <h3 style={{ ...S.h3, marginTop: 16 }}>What requires admin</h3>
        <p style={{ ...S.p, marginBottom: 0 }}>
          Admin-gated operations (require the keypair in <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>ProtocolConfig.admin</code>):{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>set_admin</code> (the new admin must co-sign),{" "}
          
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>verify_app</code>,{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>block_app</code>,{" "}
          and the testnet-only <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>set_mint_counter</code>, <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>dev_set_share_price</code>, and <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>dev_fast_unlock</code>.
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3 }}>initialize</code> must be signed by the program upgrade authority.
          All pool cranks are permissionless. The upgrade authority can replace the program, so it is the protocol's ultimate trust root.
          Current protocol admin:{" "}
          <code style={{ background: "#f4f4f4", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>BPmZB128HNvmzubP4rwJTTNLmk9ucK71Jtqt7MowKV8M</code>.
          Phase 2 replaces this key with on-chain multisig governance.
        </p>
      </div>

    </div>
  );
}
