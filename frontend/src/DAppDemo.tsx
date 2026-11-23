/**
 * DAppDemo.tsx — simulates a dApp integrating with the Vow Protocol.
 *
 * Step 1: Read identity (no wallet needed — just the Vow address)
 * Step 2: Authorize dApp (one wallet signature, creates a session)
 * Step 3: dApp transaction using only the session key — no wallet popup
 */
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { VowClient } from "./sdk/client";
import { CLASS_NAMES, LAMPORTS_PER_XNT } from "./sdk/types";
import * as pda from "./sdk/pda";
import { X1Wallet } from "./useX1Wallet";

const RPC = import.meta.env.VITE_RPC_URL ?? "https://rpc.mainnet.x1.xyz";
const EXPLORER = "https://explorer.x1.xyz/tx/";
const DEMO_DAPP_NAME = "X1 Demo Game";
const LS_KEY = "vow_demo_session_v2";

interface StoredSession {
  vowState: string;
  sessionPubkey: string;
  sessionSecretKey: number[];
  sessionIndex: number;
  txSig: string;
  createdAt: number;
}

const S: Record<string, React.CSSProperties> = {
  card:     { border: "1px solid #ddd", borderRadius: 6, padding: 20, marginTop: 16 },
  step:     { display: "flex", gap: 16, alignItems: "flex-start" },
  num:      { flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: "#1a1a1a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 },
  numDone:  { flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: "#27ae60", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 },
  btn:      { padding: "7px 16px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 },
  btnGreen: { padding: "7px 16px", background: "#27ae60", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 },
  btnGray:  { padding: "7px 16px", background: "#555", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 },
  status:   { marginTop: 8, padding: "8px 12px", background: "#f4f4f4", fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" as const, borderRadius: 4, whiteSpace: "pre-wrap" as const },
  err:      { marginTop: 8, padding: "8px 12px", background: "#fff0f0", border: "1px solid #fcc", fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" as const, borderRadius: 4 },
  ok:       { marginTop: 8, padding: "8px 12px", background: "#f0fff0", border: "1px solid #9d9", fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" as const, borderRadius: 4, whiteSpace: "pre-wrap" as const },
  badge:    (ok: boolean) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 12, background: ok ? "#27ae60" : "#888", color: "#fff", fontWeight: 700, fontSize: 12 }),
  kv:       { display: "grid", gridTemplateColumns: "160px 1fr", gap: "3px 8px", fontSize: 12, marginTop: 6 },
  k:        { color: "#888" },
  v:        { fontWeight: 600, fontFamily: "monospace", fontSize: 11 },
};

function fmtXnt(n: BN | number | undefined) {
  if (n === undefined) return "—";
  const v = typeof n === "number" ? n : n.toNumber();
  return (v / LAMPORTS_PER_XNT).toFixed(4) + " XNT";
}
function fmtDate(ts: BN | number | undefined) {
  if (ts === undefined) return "—";
  const v = typeof ts === "number" ? ts : ts.toNumber();
  return v === 0 ? "Never expires" : new Date(v * 1000).toLocaleString();
}
function short(s: string) { return s.slice(0, 12) + "…" + s.slice(-6); }

interface Props {
  wallet: X1Wallet;
  client: VowClient | null;
  lastVowState: string;
}

export default function DAppDemo({ wallet, client, lastVowState }: Props) {
  const [vowAddr, setVowAddr] = useState(lastVowState);
  const [identity, setIdentity] = useState<any>(null);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionOnChain, setSessionOnChain] = useState<any>(null);

  const [s1, setS1] = useState("");
  const [s1err, setS1err] = useState("");
  const [s2, setS2] = useState("");
  const [s2err, setS2err] = useState("");
  const [s3, setS3] = useState("");
  const [s3err, setS3err] = useState("");
  const [busy, setBusy] = useState(false);

  // Custom session limits
  const [limitDailyXnt, setLimitDailyXnt] = useState(0.01);
  const [limitLifetimeXnt, setLimitLifetimeXnt] = useState(0.1);
  const [limitVelocity, setLimitVelocity] = useState(10);
  const [limitExpiryDays, setLimitExpiryDays] = useState(7);
  const [showLimits, setShowLimits] = useState(false);

  // Fund session key
  const [fundXnt, setFundXnt] = useState(0.01);
  const [fundStatus, setFundStatus] = useState("");

  // Read-only client — works without wallet connection for RPC reads
  const readClient = useMemo(() => {
    const conn = new Connection(RPC, "confirmed");
    const dummy = { publicKey: PublicKey.default, signTransaction: async (tx: any) => tx, signAllTransactions: async (txs: any) => txs };
    return new VowClient(new AnchorProvider(conn, dummy as any, { commitment: "confirmed" }));
  }, []);

  // Load saved session on mount; migrate old format that lacks sessionIndex
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    try {
      const stored: StoredSession = JSON.parse(raw);
      if (typeof stored.sessionIndex === "number") setSession(stored);
      else localStorage.removeItem(LS_KEY); // old format without index — discard
    } catch { localStorage.removeItem(LS_KEY); }
  }, []);

  // ── Step 1: read identity ────────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    if (!vowAddr) { setS1err("Paste your Vow identity address above."); return; }
    setS1("Reading identity…"); setS1err(""); setIdentity(null);
    try {
      const pk = new PublicKey(vowAddr);
      const state = await readClient.getVowState(pk);
      setIdentity(state);
      setS1("✓ Identity loaded.");
      // If session stored, pre-fetch its on-chain state
      if (session && session.vowState === vowAddr) {
        const [sessAcc] = pda.findSessionAccount(pk, session.sessionIndex);
        const data = await readClient.program.account.sessionAccount.fetchNullable(sessAcc);
        setSessionOnChain(data);
      }
    } catch (e: any) {
      setS1(""); setS1err("✗ " + e.message);
    }
  }, [readClient, vowAddr, session]);

  // ── Step 2: authorize dApp (one wallet signature) ───────────────────────────
  const handleAuthorize = useCallback(async () => {
    if (!identity) { setS2err("Load identity first (step 1)."); return; }
    if (!client) { setS2err("Connect your wallet first — the authorization needs one signature."); return; }
    if (!identity.activeStake) { setS2err("Identity is dormant. Activate stake first."); return; }

    setS2("Creating session…"); setS2err(""); setBusy(true);
    try {
      const sessions = await readClient.getSessions(new PublicKey(vowAddr));
      const sessionIndex = sessions.length > 0
        ? Math.max(...sessions.map((s: any) => s.account.sessionIndex as number)) + 1
        : 0;

      const sessionKeypair = Keypair.generate();
      const expiryTs = limitExpiryDays > 0
        ? new BN(Math.floor(Date.now() / 1000) + 86400 * limitExpiryDays)
        : new BN(0);
      const txSig = await client.createSession(
        new PublicKey(vowAddr),
        sessionIndex,
        sessionKeypair.publicKey,
        [], // unrestricted: any program (demo)
        {
          expiryTs,
          dailyLimit: new BN(Math.round(limitDailyXnt * LAMPORTS_PER_XNT)),
          lifetimeLimit: new BN(Math.round(limitLifetimeXnt * LAMPORTS_PER_XNT)),
          velocityLimit: limitVelocity,
        }
      );

      const stored: StoredSession = {
        vowState: vowAddr,
        sessionPubkey: sessionKeypair.publicKey.toBase58(),
        sessionSecretKey: Array.from(sessionKeypair.secretKey),
        sessionIndex,
        txSig,
        createdAt: Date.now(),
      };
      localStorage.setItem(LS_KEY, JSON.stringify(stored));
      setSession(stored);

      // Fetch on-chain session state
      const [sessAcc] = pda.findSessionAccount(new PublicKey(vowAddr), sessionIndex);
      const data = await readClient.program.account.sessionAccount.fetch(sessAcc);
      setSessionOnChain(data);

      setS2(`✓ Session #${sessionIndex} created.\nTx: ${txSig}`);
    } catch (e: any) {
      setS2(""); setS2err("✗ " + e.message);
    } finally { setBusy(false); }
  }, [client, readClient, vowAddr, identity, limitDailyXnt, limitLifetimeXnt, limitVelocity, limitExpiryDays]);

  // ── Fund session key ─────────────────────────────────────────────────────────
  const handleFund = useCallback(async () => {
    if (!client || !session) return;
    setFundStatus("Transferring…");
    try {
      const lamports = Math.round(fundXnt * LAMPORTS_PER_XNT);
      const { Transaction: Tx, SystemProgram: SP } = await import("@solana/web3.js");
      const tx = new Tx().add(SP.transfer({
        fromPubkey: client.provider.wallet.publicKey,
        toPubkey: new PublicKey(session.sessionPubkey),
        lamports,
      }));
      const conn = readClient.provider.connection;
      const { blockhash } = await conn.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = client.provider.wallet.publicKey;
      const signed = await client.provider.wallet.signTransaction(tx);
      const sig = await conn.sendRawTransaction(signed.serialize());
      await conn.confirmTransaction(sig, "confirmed");
      setFundStatus(`✓ Sent ${fundXnt} XNT to session key.`);
    } catch (e: any) { setFundStatus("✗ " + e.message); }
  }, [client, readClient, session, fundXnt]);

  // ── Step 3: dApp transaction (session key only, no wallet) ──────────────────
  const handleDappTx = useCallback(async () => {
    if (!session) { setS3err("Create a session first (step 2)."); return; }

    setS3("Verifying session on-chain…"); setS3err(""); setBusy(true);
    try {
      const vowPk = new PublicKey(session.vowState);
      const [sessAcc] = pda.findSessionAccount(vowPk, session.sessionIndex);
      const data = await readClient.program.account.sessionAccount.fetch(sessAcc);
      setSessionOnChain(data);

      if (!data.active) {
        setS3err("Session is revoked.");
        setBusy(false);
        return;
      }

      // Re-fetch identity for current yield balance (may have changed since Step 1 read)
      const freshIdentity = await readClient.getVowState(vowPk);
      const yieldBal = (freshIdentity.yieldBalance as any)?.toNumber?.() ?? 0;

      const sessionKeypair = Keypair.fromSecretKey(Uint8Array.from(session.sessionSecretKey));
      const conn = readClient.provider.connection;
      const [configPda] = pda.findProtocolConfig();
      const [reservePda] = pda.findReserve();

      // If yield_balance is zero but the session key has funds, use the session key to
      // deposit directly into the reserve — no wallet needed.
      let currentYieldBal = yieldBal;
      if (currentYieldBal === 0) {
        const skBalance = await conn.getBalance(sessionKeypair.publicKey, "confirmed");
        const DEPOSIT_AMOUNT = Math.round(0.001 * LAMPORTS_PER_XNT); // 0.001 XNT
        const FEES = 6_000_000; // two txs at ~0.002 XNT each, leaving the key rent-exempt

        if (skBalance >= DEPOSIT_AMOUNT + FEES) {
          setS3("Session key has funds but yield_balance is 0 — depositing from session key into reserve…");
          const [unstakeEscrowPda] = pda.findUnstakeEscrow(vowPk);
          const depositTx = await readClient.program.methods
            .depositYieldBalance(new BN(DEPOSIT_AMOUNT))
            .accounts({
              config: configPda,
              vowState: vowPk,
              reserve: reservePda,
              depositor: sessionKeypair.publicKey,
              systemProgram: new PublicKey("11111111111111111111111111111111"),
              unstakeEscrow: unstakeEscrowPda,
            })
            .transaction();

          const { blockhash: dh, lastValidBlockHeight: dlvb } = await conn.getLatestBlockhash("confirmed");
          depositTx.recentBlockhash = dh;
          depositTx.feePayer = sessionKeypair.publicKey;
          depositTx.sign(sessionKeypair);
          const depositSig = await conn.sendRawTransaction(depositTx.serialize());
          await conn.confirmTransaction({ signature: depositSig, blockhash: dh, lastValidBlockHeight: dlvb }, "confirmed");
          currentYieldBal = DEPOSIT_AMOUNT;
          setS3(`✓ Deposited 0.001 XNT from session key into reserve. Now executing yield_spend…`);
        }
      }

      if (currentYieldBal > 0) {
        const amount = Math.min(Math.round(0.0005 * LAMPORTS_PER_XNT), currentYieldBal);
        const destination = freshIdentity.owner as PublicKey;

        const tx = await readClient.program.methods
          .yieldSpend(new BN(amount))
          .accounts({
            config: configPda,
            vowState: vowPk,
            sessionAccount: sessAcc,
            callingProgram: new PublicKey("11111111111111111111111111111111"),
            // Required (may be uninitialized): pinned PDA so a blocked app can't be skipped.
            appRegistry: pda.findAppRegistry(new PublicKey("11111111111111111111111111111111"))[0],
            reserve: reservePda,
            destination,
            sessionSigner: sessionKeypair.publicKey,
            systemProgram: new PublicKey("11111111111111111111111111111111"),
            // Demo session is unrestricted (program_count = 0), so no caller PDA is needed.
            callerAuthority: null,
          })
          .preInstructions(await readClient.freshPriceIxs()) // payouts need this epoch's solvency check
          .transaction();

        const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = sessionKeypair.publicKey;
        tx.sign(sessionKeypair);

        const txSig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
        await conn.confirmTransaction({ signature: txSig, blockhash, lastValidBlockHeight }, "confirmed");

        const updated = await readClient.program.account.sessionAccount.fetch(sessAcc);
        setSessionOnChain(updated);
        setS3(`✓ yield_spend executed — session key signed, no wallet popup.\nAmount: ${fmtXnt(amount)}\nTx: ${txSig}`);
      } else {
        // No funds anywhere — show guidance
        const isCompound = "compound" in (freshIdentity.yieldMode as any ?? {});
        const lines = [
          `✓ Session #${session.sessionIndex} verified on-chain.`,
          `Session key: ${short(session.sessionPubkey)}`,
          `Spent today: ${fmtXnt(data.spentToday)} / ${data.dailyLimit.toNumber() === 0 ? "∞" : fmtXnt(data.dailyLimit)}`,
          `Expiry: ${fmtDate(data.expiryTs)}`,
          isCompound
            ? "\n⚠ Identity is in Compound mode — yield stays as shares, not spendable. Switch to Treasury or Hybrid in Identity Lookup."
            : "\n⚠ Fund the session key (step 2) and click Execute again. The session key will auto-deposit into your yield_balance and execute the transaction — no wallet needed.",
        ].join("\n");
        setS3(lines);
      }
    } catch (e: any) {
      setS3(""); setS3err("✗ " + e.message);
    } finally { setBusy(false); }
  }, [session, readClient, client, identity, vowAddr]);

  const handleClearSession = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setSession(null);
    setSessionOnChain(null);
    setS2("Session cleared.");
  }, []);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* Explainer */}
      <div style={{ ...S.card, background: "#f0f4ff", border: "1px solid #c7d5ff" }}>
        <strong style={{ fontSize: 14 }}>How dApp integration works</strong>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: "#333", margin: "8px 0 0" }}>
          The user authenticates once with their main wallet — that's it.
          Every subsequent action uses a lightweight <strong>session key</strong> held by the dApp.
          No wallet popups. No signing requests. The session can only spend from <strong>yield_balance</strong>,
          never directly from your staked position. You can revoke it at any time.
        </p>
      </div>

      {/* ── Step 1 ── */}
      <div style={S.card}>
        <div style={S.step}>
          <div style={identity ? S.numDone : S.num}>1</div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>Read identity</strong>
            <p style={{ fontSize: 12, color: "#666", margin: "4px 0 8px" }}>
              No wallet needed — the dApp reads your Vow identity via a public RPC call.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={vowAddr}
                onChange={e => setVowAddr(e.target.value)}
                placeholder="Your Vow identity address"
                style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 13, width: 360 }}
              />
              <button onClick={handleConnect} disabled={busy} style={S.btn}>Connect</button>
            </div>
            {s1 && <div style={S.ok}>{s1}</div>}
            {s1err && <div style={S.err}>{s1err}</div>}

            {identity && (
              <div style={{ marginTop: 10, padding: 10, background: "#f8f9fa", borderRadius: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={S.badge(identity.activeStake)}>{identity.activeStake ? "Active" : "Dormant"}</span>
                  <strong>{CLASS_NAMES[identity.class]} Identity</strong>
                  <span style={{ fontSize: 12, color: "#888" }}>class {identity.class}</span>
                </div>
                <div style={S.kv}>
                  <span style={S.k}>Staked</span><span style={S.v}>{fmtXnt(identity.principalLamports)}</span>
                  <span style={S.k}>Yield balance</span><span style={S.v}>{fmtXnt(identity.yieldBalance)}</span>
                  <span style={S.k}>Commitments</span><span style={S.v}>{identity.totalCommitments?.toString()}</span>
                  <span style={S.k}>Stake days</span><span style={S.v}>{identity.cumulativeStakeDays?.toString()}</span>
                </div>
                {!identity.activeStake && (
                  <div style={{ fontSize: 11, color: "#c0392b", marginTop: 6 }}>⚠ Dormant — activate stake to enable sessions.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Step 2 ── */}
      <div style={S.card}>
        <div style={S.step}>
          <div style={session ? S.numDone : S.num}>2</div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>
              {session ? "Session active" : `Authorize ${DEMO_DAPP_NAME}`}
            </strong>
            {!session ? (
              <>
                <p style={{ fontSize: 12, color: "#666", margin: "4px 0 8px" }}>
                  One wallet signature. After this the dApp holds the session key — no more popups.
                </p>
                <div style={{ fontSize: 12, color: "#555", background: "#fffbf0", padding: "8px 10px", borderRadius: 4, marginBottom: 8, lineHeight: 1.8 }}>
                  <strong>What you authorize:</strong><br />
                  · {limitDailyXnt} XNT/day · {limitLifetimeXnt} XNT lifetime · {limitVelocity} tx/day
                  · {limitExpiryDays > 0 ? `${limitExpiryDays} days` : "no expiry"}<br />
                  · Only from yield_balance · ⚠ Unrestricted demo session: this key can pay any address up to these limits
                </div>

                {/* Custom limits toggle */}
                <div style={{ marginBottom: 10 }}>
                  <button style={{ ...S.btnGray, fontSize: 12, padding: "4px 10px" }}
                    onClick={() => setShowLimits(v => !v)}>
                    {showLimits ? "▲ Hide limits" : "▼ Customize limits"}
                  </button>
                  {showLimits && (
                    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        ["Daily limit (XNT)", limitDailyXnt, setLimitDailyXnt, 0.001],
                        ["Lifetime limit (XNT)", limitLifetimeXnt, setLimitLifetimeXnt, 0.001],
                        ["Tx/day (0=∞)", limitVelocity, setLimitVelocity, 1],
                        ["Expiry (days, 0=∞)", limitExpiryDays, setLimitExpiryDays, 1],
                      ].map(([label, val, setter, step]) => (
                        <label key={label as string} style={{ display: "block" }}>
                          <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>{label as string}</div>
                          <input type="number" min={0} step={step as number} value={val as number}
                            onChange={e => (setter as any)(Number(e.target.value))}
                            style={{ padding: "4px 6px", border: "1px solid #ccc", borderRadius: 3, fontSize: 12, width: "100%" }} />
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {!wallet.connected && (
                  <div style={{ fontSize: 12, color: "#c0392b", marginBottom: 8 }}>
                    ⚠ Connect your wallet first (top of the main page) — one signature needed.
                  </div>
                )}
                <button
                  onClick={handleAuthorize}
                  disabled={busy || !identity?.activeStake || !wallet.connected}
                  style={{ ...S.btnGreen, opacity: (identity?.activeStake && wallet.connected) ? 1 : 0.45 }}
                >
                  {busy ? "Signing…" : `Authorize ${DEMO_DAPP_NAME} (1 signature)`}
                </button>
              </>
            ) : (
              <div style={{ marginTop: 8 }}>
                <div style={S.kv}>
                  <span style={S.k}>Session index</span><span style={S.v}>#{session.sessionIndex}</span>
                  <span style={S.k}>Session key</span><span style={S.v}>{short(session.sessionPubkey)}</span>
                  <span style={S.k}>Created</span><span style={S.v}>{new Date(session.createdAt).toLocaleString()}</span>
                  {sessionOnChain && <>
                    <span style={S.k}>Spent today</span><span style={S.v}>{fmtXnt(sessionOnChain.spentToday)}</span>
                    <span style={S.k}>Total spent</span><span style={S.v}>{fmtXnt(sessionOnChain.spentTotal)}</span>
                    <span style={S.k}>Expiry</span><span style={S.v}>{fmtDate(sessionOnChain.expiryTs)}</span>
                  </>}
                </div>
                {session.txSig && (
                  <a href={EXPLORER + session.txSig} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: "#2980b9", display: "block", marginTop: 6 }}>
                    View authorization tx on explorer ↗
                  </a>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    onClick={() => navigator.clipboard.writeText(session.sessionPubkey)}
                    style={{ ...S.btnGray, fontSize: 12 }}>
                    Copy session pubkey
                  </button>
                  <button onClick={handleClearSession} style={{ ...S.btnGray, fontSize: 12 }}>
                    Clear session
                  </button>
                </div>

                {/* Fund session key */}
                <div style={{ marginTop: 12, padding: "10px 12px", background: "#f8f9fa", borderRadius: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Fund session key for fees</div>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>
                    Session keys need XNT to pay tx fees (about 0.002 XNT each). Transfer from your connected wallet.
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="number" min={0.001} step={0.001} value={fundXnt}
                      onChange={e => setFundXnt(Number(e.target.value))}
                      style={{ padding: "4px 8px", border: "1px solid #ccc", borderRadius: 3, fontSize: 12, width: 100 }} />
                    <span style={{ fontSize: 12, color: "#666" }}>XNT</span>
                    <button onClick={handleFund} disabled={busy || !client}
                      style={{ ...S.btn, fontSize: 12, opacity: client ? 1 : 0.5 }}>
                      Fund
                    </button>
                  </div>
                  {fundStatus && <div style={{ ...S.status, marginTop: 6 }}>{fundStatus}</div>}
                </div>
              </div>
            )}
            {s2 && (
              <div style={S.ok}>
                {s2}
                {session?.txSig && s2.includes(session.txSig) && (
                  <><br /><a href={EXPLORER + session.txSig} target="_blank" rel="noreferrer" style={{ color: "#27ae60" }}>
                    View on explorer ↗
                  </a></>
                )}
              </div>
            )}
            {s2err && <div style={S.err}>{s2err}</div>}
          </div>
        </div>
      </div>

      {/* ── Step 3 ── */}
      <div style={S.card}>
        <div style={S.step}>
          <div style={S.num}>3</div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>dApp transaction — no wallet popup</strong>
            <p style={{ fontSize: 12, color: "#666", margin: "4px 0 8px" }}>
              The session key signs. No wallet involved. If your yield_balance is &gt; 0, a real
              <code style={{ background: "#f0f0f0", padding: "1px 4px", borderRadius: 3 }}> yield_spend</code> is executed on-chain.
              If zero, the session state is shown.
            </p>
            <button
              onClick={handleDappTx}
              disabled={busy || !session}
              style={{ ...S.btn, opacity: session ? 1 : 0.45 }}
            >
              {busy ? "Working…" : "Execute dApp transaction (session key only)"}
            </button>
            {s3 && (
              <div style={S.ok}>
                {s3}
                {s3.includes("Tx:") && (
                  <><br /><a href={EXPLORER + s3.split("Tx: ")[1]?.trim()} target="_blank" rel="noreferrer" style={{ color: "#27ae60" }}>
                    View on explorer ↗
                  </a></>
                )}
              </div>
            )}
            {s3err && <div style={S.err}>{s3err}</div>}
          </div>
        </div>
      </div>

      {/* Code reference */}
      <div style={S.card}>
        <strong style={{ fontSize: 14 }}>Integration reference (TypeScript)</strong>
        <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>
          Only step 2 touches the user's wallet.
        </p>
        <pre style={{ ...S.status, marginTop: 8 }}>{`// Step 1 — read identity (no signing, any RPC)
const vow = await program.account.vowState.fetch(vowPubkey);
if (!vow.activeStake) throw new Error("Dormant identity");

// Step 2 — create session (ONE wallet signature, done once)
const sessionKeypair = Keypair.generate(); // stored by dApp
const sessionIndex = 0; // deterministic slot
await client.createSession(vowPubkey, sessionIndex, sessionKeypair.publicKey,
  [MY_PROGRAM_ID],   // restrict to this dApp
  { expiryTs: ..., dailyLimit: ..., lifetimeLimit: ..., velocityLimit: ... }
);

// Step 3 — every dApp action (NO wallet, session key signs)
// A whitelisted session can only be spent by CPI from MY_PROGRAM_ID, which signs
// with its PDA [b"vow_caller"]. Inside your on-chain program:
//
//   let (auth, bump) = Pubkey::find_program_address(&[b"vow_caller"], &crate::ID);
//   vow::cpi::yield_spend(
//       CpiContext::new_with_signer(vow_program, accounts /* caller_authority: auth */,
//           &[&[b"vow_caller", &[bump]]]),
//       amount)?;
//
// Client side, the session key signs the outer tx calling YOUR program:
await myProgram.methods.buyItem(new BN(amount))
  .accounts({ vowState: vowPubkey, sessionAccount, reserve, destination,
              sessionSigner: sessionKeypair.publicKey, callerAuthority, ... })
  .preInstructions(await client.freshPriceIxs()) // payouts need this epoch's price
  .signers([sessionKeypair])   // ← session key, not user wallet
  .rpc();`}
        </pre>
      </div>

    </div>
  );
}
