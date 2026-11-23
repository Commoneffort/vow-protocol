/**
 * Session-key simulator. It reads an identity from the chain but never signs, sends a
 * transaction, or creates a key. The rule order mirrors the program's yield_spend checks.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { VowClient } from "./sdk/client";
import { CLASS_NAMES, LAMPORTS_PER_XNT } from "./sdk/types";
import { X1Wallet } from "./useX1Wallet";

const RPC = import.meta.env.VITE_RPC_URL ?? "https://rpc.mainnet.x1.xyz";
const LEGACY_DEMO_KEY = "vow_demo_session_v2";
const SAMPLE_BALANCE = 1;

interface Action { label: string; app: string; amount: number; allowed: boolean; }
interface LogEntry { id: number; ok: boolean; text: string; code?: string; }

const ACTIONS: Action[] = [
  { label: "Buy a power-up", app: "X1 Arcade", amount: 0.01, allowed: true },
  { label: "Renew a season pass", app: "X1 Arcade", amount: 0.04, allowed: true },
  { label: "Attempt a large purchase", app: "X1 Arcade", amount: 0.5, allowed: true },
  { label: "Unknown app tries to charge you", app: "Unlisted program", amount: 0.01, allowed: false },
];

const xnt = (n: number) => `${n.toFixed(n < 0.01 && n > 0 ? 4 : 3)} XNT`;

function Meter({ label, used, max, unit }: { label: string; used: number; max: number; unit?: string }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const fmt = (n: number) => (unit ? `${n} ${unit}` : xnt(n));
  return (
    <div className="meter">
      <div className="meter-row"><span>{label}</span><span>{fmt(used)} / {max > 0 ? fmt(max) : "no limit"}</span></div>
      <div className="meter-track"><div className="meter-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

interface Props {
  wallet: X1Wallet;
  client: VowClient | null;
  lastVowState: string;
}

export default function DAppDemo({ lastVowState }: Props) {
  const [vowAddr, setVowAddr] = useState(lastVowState);
  const [identity, setIdentity] = useState<any>(null);
  const [readStatus, setReadStatus] = useState("");
  const [daily, setDaily] = useState(0.05);
  const [lifetime, setLifetime] = useState(0.2);
  const [velocity, setVelocity] = useState(5);
  const [authorized, setAuthorized] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [spentToday, setSpentToday] = useState(0);
  const [spentTotal, setSpentTotal] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [balance, setBalance] = useState(SAMPLE_BALANCE);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [legacyKey, setLegacyKey] = useState(false);

  useEffect(() => {
    try { setLegacyKey(!!localStorage.getItem(LEGACY_DEMO_KEY)); } catch { setLegacyKey(false); }
  }, []);

  const reader = useMemo(() => {
    const kp = Keypair.generate();
    const w = { publicKey: kp.publicKey, signTransaction: async (t: any) => t, signAllTransactions: async (t: any) => t };
    return new VowClient(new AnchorProvider(new Connection(RPC, "confirmed"), w as any, { commitment: "confirmed" }));
  }, []);

  const reset = useCallback((start: number) => {
    setAuthorized(false); setRevoked(false); setSpentToday(0); setSpentTotal(0); setTxCount(0); setBalance(start); setLog([]);
  }, []);

  const readIdentity = useCallback(async () => {
    if (!vowAddr.trim()) { setReadStatus("Paste a Vow identity address, or use the sample balance."); return; }
    setReadStatus("Reading from X1…");
    try {
      const state = await reader.getVowState(new PublicKey(vowAddr.trim()));
      setIdentity(state);
      setReadStatus("");
      const y = (state.yieldBalance as BN).toNumber() / LAMPORTS_PER_XNT;
      reset(y > 0 ? y : SAMPLE_BALANCE);
    } catch {
      setIdentity(null);
      setReadStatus("No Vow identity found at that address.");
    }
  }, [reader, vowAddr, reset]);

  const push = (ok: boolean, text: string, code?: string) =>
    setLog(l => [{ id: Date.now() + Math.random(), ok, text, code }, ...l].slice(0, 7));

  const attempt = (a: Action) => {
    const name = `${a.label} (${xnt(a.amount)})`;
    if (revoked) return push(false, `${name} rejected: the session was revoked.`, "SessionInactive");
    if (!a.allowed) return push(false, `${a.app} is not on this session's whitelist.`, "ProgramNotAllowed");
    if (velocity > 0 && txCount >= velocity) return push(false, `${name} rejected: daily transaction limit reached.`, "VelocityLimitExceeded");
    if (daily > 0 && spentToday + a.amount > daily + 1e-9) return push(false, `${name} rejected: over the daily limit.`, "DailyLimitExceeded");
    if (lifetime > 0 && spentTotal + a.amount > lifetime + 1e-9) return push(false, `${name} rejected: over the lifetime limit.`, "LifetimeLimitExceeded");
    if (balance + 1e-9 < a.amount) return push(false, `${name} rejected: not enough yield balance.`, "InsufficientYieldBalance");
    setSpentToday(v => v + a.amount); setSpentTotal(v => v + a.amount); setTxCount(v => v + 1); setBalance(v => v - a.amount);
    push(true, `${name} approved with no wallet popup.`);
  };

  const removeLegacyKey = () => {
    try { localStorage.removeItem(LEGACY_DEMO_KEY); } catch { /* storage unavailable */ }
    setLegacyKey(false);
  };

  return (
    <div>
      <div className="sim-banner">Simulation: nothing here signs or sends a transaction, and no key is created or stored.</div>

      {legacyKey && (
        <div className="notice">
          This browser still holds a session key from the old live demo. Removing it does not revoke that session,
          so revoke it under <strong>App → Sessions</strong> if it is still active.{" "}
          <button className="btn btn-sm" style={{ background: "#7a4300", color: "#fff", marginLeft: 6 }} onClick={removeLegacyKey}>Remove stored key</button>
        </div>
      )}

      <div className="sim-grid ws-sessions">
        <section className="panel">
          <span className="eyebrow">Step 1</span>
          <h2 style={{ margin: "4px 0 6px" }}>Set the boundaries</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
            These are the limits your wallet would sign once. Optionally load a real identity, read-only.
          </p>
          <label className="field">Vow identity (optional)
            <input value={vowAddr} onChange={e => setVowAddr(e.target.value)} placeholder="Identity address" />
          </label>
          <button className="btn btn-sm" style={{ marginTop: 8, background: "var(--ink)", color: "#fff" }} onClick={readIdentity}>Read identity</button>
          {readStatus && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{readStatus}</div>}
          {identity && (
            <div style={{ fontSize: 13, marginTop: 8 }}>
              <strong>{CLASS_NAMES[identity.class]}</strong> · {identity.activeStake ? "Active" : "Dormant"} ·{" "}
              {identity.totalFulfilled?.toString()} of {identity.totalCommitments?.toString()} commitments fulfilled
            </div>
          )}
          <div className="field-grid" style={{ marginTop: 14 }}>
            <label className="field">Daily limit (XNT)
              <input type="number" min={0} step={0.01} value={daily} disabled={authorized} onChange={e => setDaily(Number(e.target.value))} />
            </label>
            <label className="field">Lifetime limit (XNT)
              <input type="number" min={0} step={0.01} value={lifetime} disabled={authorized} onChange={e => setLifetime(Number(e.target.value))} />
            </label>
            <label className="field">Transactions per day
              <input type="number" min={0} step={1} value={velocity} disabled={authorized} onChange={e => setVelocity(Number(e.target.value))} />
            </label>
            <label className="field">Allowed program
              <input value="X1 Arcade" disabled />
            </label>
          </div>
          {!authorized
            ? <button className="btn btn-gold" style={{ marginTop: 14, width: "100%" }} onClick={() => setAuthorized(true)}>Simulate authorizing this session</button>
            : <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn" style={{ flex: 1, background: "#b3263f", color: "#fff" }} disabled={revoked} onClick={() => { setRevoked(true); push(false, "You revoked the session. It stops working immediately.", "SessionInactive"); }}>{revoked ? "Revoked" : "Revoke session"}</button>
                <button className="btn" style={{ flex: 1, background: "var(--surface-2)", borderColor: "var(--line)", color: "var(--text)" }} onClick={() => reset(identity && (identity.yieldBalance as BN).toNumber() > 0 ? (identity.yieldBalance as BN).toNumber() / LAMPORTS_PER_XNT : SAMPLE_BALANCE)}>Start over</button>
              </div>}
        </section>

        <section className="panel">
          <span className="eyebrow">Step 2</span>
          <h2 style={{ margin: "4px 0 6px" }}>Let the app act</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
            Each action runs the same checks as the on-chain program. Try to break the limits.
          </p>
          <div className="sim-actions">
            {ACTIONS.map(a => (
              <button key={a.label} className="sim-action" disabled={!authorized} style={{ opacity: authorized ? 1 : 0.5 }} onClick={() => attempt(a)}>
                <span>{a.label}<br /><small>{a.app}</small></span><span>{xnt(a.amount)}</span>
              </button>
            ))}
          </div>
          <Meter label="Spent today" used={spentToday} max={daily} />
          <Meter label="Lifetime spend" used={spentTotal} max={lifetime} />
          <Meter label="Transactions today" used={txCount} max={velocity} unit="tx" />
          <div className="meter meter-row"><span>Simulated yield balance</span><strong style={{ color: "var(--text)" }}>{xnt(balance)}</strong></div>
          <ul className="sim-log" aria-live="polite">
            {log.map(e => (
              <li key={e.id} style={{ ["--c" as any]: e.ok ? "#0d8a5b" : "#b3263f" }}>
                {e.ok ? "✓" : "✕"} {e.text} {e.code && <code>{e.code}</code>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel ws-sessions">
        <h2>How a real integration works</h2>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          A whitelisted session is spent by your program through CPI, signed with its <code>vow_caller</code> PDA.
          Your program must validate the destination. See Docs for the full guide.
        </p>
        <pre style={{ background: "var(--ink)", color: "#e9e5f3", padding: 16, borderRadius: 10, overflowX: "auto", fontSize: 12, lineHeight: 1.6 }}>{`// One wallet signature
await client.createSession(vowState, 0, sessionKey.publicKey, [MY_PROGRAM_ID], {
  expiryTs, dailyLimit, lifetimeLimit, velocityLimit,
});

// Every later action: the session key signs, with no wallet popup
await myProgram.methods.buyItem(new BN(amount))
  .accounts({ vowState, sessionAccount, reserve, destination,
              sessionSigner: sessionKey.publicKey, callerAuthority })
  .preInstructions(await client.freshPriceIxs())
  .signers([sessionKey])
  .rpc();`}</pre>
      </section>
    </div>
  );
}
