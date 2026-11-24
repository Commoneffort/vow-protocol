import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Connection, PublicKey, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { VowClient } from "./sdk/client";
import { CLASS_NAMES, LOCK_DAYS, LAMPORTS_PER_XNT } from "./sdk/types";
import * as pda from "./sdk/pda";
import { useX1Wallet } from "./useX1Wallet";
import idl from "./sdk/vow.json";
import Admin from "./Admin";
import DAppDemo from "./DAppDemo";
import Docs from "./Docs";
import VowCard from "./components/VowCard";
import Landing from "./components/Landing";

const RPC = import.meta.env.VITE_RPC_URL ?? "https://rpc.mainnet.x1.xyz";
const connection = new Connection(RPC, "confirmed");

// ── Error translation ─────────────────────────────────────────────────────────
const FRIENDLY_ERRORS: Record<string, string> = {
  IdentityAlreadyActive: "Identity already has active stake.",
  IdentityInactive: "Identity is dormant — activate stake first.",
  NotMatured: "Lock period has not expired yet.",
  AlreadyUnstaking: "Unstake already in progress.",
  StakeNotDeactivated: "Wait until the next epoch after Begin Unstake, then complete it.",
  InsufficientStake: "Amount too small: an identity needs at least 1 XNT, and a deposit must be large enough to buy shares.",
  PriceStale: "The share price can't be refreshed yet. The X1 stake pool may not have updated for this epoch, or the protocol has halted value-moving actions. Try again shortly.",
  ReserveIlliquid: "The reserve needs to redeem pXNT first. Your funds are safe. Retry in a few minutes.",
  InsufficientYieldBalance: "Not enough yield balance.",
  SharesUnderflow: "Nothing to harvest: this identity's position is already in the unstake process.",
  UnsupportedPoolConfig: "The X1 stake pool currently restricts XNT deposits or withdrawals.",
  ReserveSufficient: "Nothing to redeem: the reserve already holds everything it owes.",
  StakeAccountMismatch: "A stake pool account did not match the protocol configuration.",
  CallerNotAuthorized: "This session is restricted to specific programs, so it can only be spent through one of them.",
  AppBlocked: "This app has been blocked by the protocol.",
  ProtocolInsolvent: "Payouts are paused because protocol liabilities exceed its assets. They resume automatically once it is solvent.",
};
const PROGRAM_ERRORS = new Map<number, string>(((idl as any).errors ?? []).map((x: any) => [x.code, x.name]));
const camel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function fmtError(e: any): string {
  const msg: string = e?.message ?? String(e);
  const text = `${msg} ${(e?.logs ?? e?.transactionLogs ?? []).join(" ")}`;
  const hex = text.match(/custom program error: 0x([0-9a-f]+)/i);
  const code = hex ? parseInt(hex[1], 16) : null;
  const name = (code !== null ? PROGRAM_ERRORS.get(code) : undefined)
    ?? Object.keys(FRIENDLY_ERRORS).find(k => text.includes(k));
  if (name) {
    const key = camel(name);
    const known = FRIENDLY_ERRORS[key];
    if (known) return known;
    const def = ((idl as any).errors ?? []).find((x: any) => camel(x.name) === key);
    return `✗ ${def?.msg ?? key}`;
  }
  if (/already in use/i.test(text)) return "This wallet already has a Vow identity (one per wallet).";
  if (code === 0x10) return "Stake withdrawals pause briefly after each epoch boundary. Retry in a few minutes.";
  if (code === 1 || /insufficient (lamports|funds)/i.test(text)) return "Insufficient balance.";
  if (msg.includes("Account does not exist") || msg.includes("has no data"))
    return "Account not found on-chain. Check the address.";
  return `✗ ${msg}`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--line)", borderTop: "3px solid var(--accent)", borderRadius: 14, boxShadow: "var(--shadow)", padding: 24, marginTop: 18 };
const BTN: React.CSSProperties = { marginTop: 12, padding: "10px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13.5, fontWeight: 650 };
const BTN_RED: React.CSSProperties = { ...BTN, background: "#b3263f" };
const BTN_GRAY: React.CSSProperties = { ...BTN, background: "var(--ink-2)" };
const BTN_GREEN: React.CSSProperties = { ...BTN, background: "#0d8a5b" };
const BTN_SM: React.CSSProperties = { padding: "4px 10px", background: "#5d5868", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 };
const BTN_SM_RED: React.CSSProperties = { ...BTN_SM, background: "#b3263f" };
const INPUT: React.CSSProperties = { padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--surface)", color: "var(--text)" };
const STATUS: React.CSSProperties = { marginTop: 12, padding: "10px 12px", background: "var(--accent-soft)", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 12, wordBreak: "break-all", borderRadius: 8 };
const LABEL: React.CSSProperties = { fontWeight: 650, marginRight: 6, fontSize: 13 };
const BADGE_ACTIVE: React.CSSProperties = { display:"inline-block", padding:"3px 11px", borderRadius:99, background:"#0d8a5b", color:"#fff", fontWeight:700, fontSize:12 };
const BADGE_DORMANT: React.CSSProperties = { ...BADGE_ACTIVE, background:"#77727f" };
const HINT: React.CSSProperties = { fontSize: 13, color: "var(--muted)", marginTop: 4 };

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(ts: number) { return ts > 0 ? new Date(ts * 1000).toISOString().slice(0, 10) : "—"; }
function fmtXnt(lamports: BN | number, dec = 4) {
  const n = typeof lamports === "number" ? lamports : lamports.toNumber();
  return (n / LAMPORTS_PER_XNT).toFixed(dec) + " XNT";
}
function short(pk: string) { return pk.slice(0, 8) + "…" + pk.slice(-6); }
function daysFromNow(days: number) { return Math.floor(Date.now() / 1000 + days * 86400); }
const classForXnt = (x: number) => x >= 10001 ? 7 : x >= 5001 ? 6 : x >= 2001 ? 5
  : x >= 1001 ? 4 : x >= 501 ? 3 : x >= 301 ? 2 : x >= 101 ? 1 : 0;

const YIELD_MODES = [
  {
    key: "treasury",
    label: "Treasury",
    desc: "100% of yield goes to your withdrawable yield balance. Harvest credits your yield_balance so you can withdraw it or spend it in dApps via session keys. Recommended for interactive use.",
  },
  {
    key: "hybrid",
    label: "Hybrid",
    desc: "50% of yield auto-compounds as shares, 50% goes to a withdrawable yield balance. Harvest moves the treasury half to your yield_balance so you can withdraw or spend it via session keys.",
  },
  {
    key: "compound",
    label: "Compound",
    desc: "All yield stays as pool shares — your stake value grows automatically. No yield_balance is ever produced, so you cannot spend yield in dApps or withdraw it. Gains are only realized when you unstake.",
    warn: "Compound mode produces no spendable yield. Use Treasury or Hybrid if you want to spend yield in dApps.",
  },
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function App() {
  const wallet = useX1Wallet();
  const [tab, setTab] = useState<"overview" | "user" | "admin" | "demo" | "docs">("overview");
  const [protocolReady, setProtocolReady] = useState<boolean | null>(null);

  const client = useMemo(() => {
    if (!wallet.publicKey) return null;
    const provider = new AnchorProvider(connection, {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    }, { commitment: "confirmed" });
    return new VowClient(provider);
  }, [wallet.publicKey]);

  useEffect(() => {
    if (!client) { setProtocolReady(null); return; }
    client.getProtocolConfig().then(() => setProtocolReady(true)).catch(() => setProtocolReady(false));
  }, [client]);

  // ── Mint ───────────────────────────────────────────────────────────────────
  const [stakeXnt, setStakeXnt] = useState(1);
  const [yieldMode, setYieldMode] = useState<"compound" | "hybrid" | "treasury">("treasury");
  const [mintStatus, setMintStatus] = useState("");
  const [lastVowState, setLastVowState] = useState("");

  // When wallet connects, restore their last known identity and auto-populate lookup
  useEffect(() => {
    // Never carry one wallet's identity over to another: forms default to this address.
    setLastVowState("");
    setIdentity(null);
    setMyIdentities([]);
    setSessions([]);
    setSessionVow(null);
    if (!wallet.publicKey) return;
    const saved = localStorage.getItem(`vow_identity_${wallet.publicKey.toBase58()}`);
    if (saved) setLastVowState(saved);
  }, [wallet.publicKey?.toBase58()]);

  const previewClass = classForXnt(Math.floor(stakeXnt));

  // One identity per wallet is enforced on-chain by the OwnerIndex PDA.
  const [ownedIdentity, setOwnedIdentity] = useState<string | null>(null);
  useEffect(() => {
    setOwnedIdentity(null);
    if (!client || !wallet.publicKey) return;
    const [indexPda] = pda.findOwnerIndex(wallet.publicKey);
    client.program.account.ownerIndex.fetchNullable(indexPda)
      .then((i: any) => {
        const addr = i ? i.vowState.toBase58() : null;
        setOwnedIdentity(addr);
        if (addr) setLastVowState(prev => prev || addr);
      })
      .catch(() => setOwnedIdentity(null));
  }, [client, wallet.publicKey?.toBase58()]);

  const handleMint = useCallback(async () => {
    if (!client) return;
    setMintStatus("Minting…");
    try {
      const { vowState } = await client.mintVow(Math.round(stakeXnt * LAMPORTS_PER_XNT), { [yieldMode]: {} } as any);
      setOwnedIdentity(vowState.toBase58());
      setLastVowState(vowState.toBase58());
      localStorage.setItem(`vow_identity_${client.provider.wallet.publicKey.toBase58()}`, vowState.toBase58());
      setMintStatus(`✓ Minted — Vow identity address: ${vowState.toBase58()}`);
    } catch (e: any) { setMintStatus(fmtError(e)); }
  }, [client, stakeXnt, yieldMode]);

  // ── Identity lookup ────────────────────────────────────────────────────────
  const [lookupAddr, setLookupAddr] = useState("");
  const [identity, setIdentity] = useState<any>(null);
  const [lookupStatus, setLookupStatus] = useState("");
  const cardRef = useRef<SVGSVGElement>(null);

  const handleDownloadCard = useCallback(() => {
    if (!cardRef.current || !identity) return;
    const svgStr = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"
      + new XMLSerializer().serializeToString(cardRef.current);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vow-${CLASS_NAMES[identity.class ?? 0].toLowerCase()}-${String((identity.nonce as any)?.toNumber?.() ?? 0).padStart(6, "0")}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [identity]);
  const [myIdentities, setMyIdentities] = useState<string[]>([]);

  const handleFindMine = useCallback(async () => {
    if (!client || !wallet.publicKey) return;
    setLookupStatus("Searching for your Vow identities…");
    try {
      const found = await client.getVowStatesByOwner(wallet.publicKey);
      if (found.length === 0) {
        setLookupStatus("No Vow identities found for this wallet.");
        setMyIdentities([]);
      } else {
        const addrs = found.map((f: any) => f.publicKey.toBase58());
        setMyIdentities(addrs);
        // Auto-fill with first result
        setLookupAddr(addrs[0]);
        setLastVowState(addrs[0]);
        localStorage.setItem(`vow_identity_${wallet.publicKey.toBase58()}`, addrs[0]);
        setLookupStatus(`Found ${found.length} identity${found.length > 1 ? " (click to switch)" : ""}. Loading…`);
        const state = await client.getVowState(found[0].publicKey);
        setIdentity({ ...state, _addr: addrs[0] });
        setLookupStatus("");
      }
    } catch (e: any) { setLookupStatus("✗ " + e.message); }
  }, [client, wallet.publicKey]);

  const handleLookup = useCallback(async () => {
    if (!client) return;
    const addr = lookupAddr || lastVowState;
    if (!addr) return;
    setLookupStatus("Loading…");
    try {
      const state = await client.getVowState(new PublicKey(addr));
      setIdentity({ ...state, _addr: addr });
      setLookupStatus("");
    } catch (e: any) { setLookupStatus(fmtError(e)); setIdentity(null); }
  }, [client, lookupAddr, lastVowState]);

  // ── Switch yield mode ─────────────────────────────────────────────────────
  const [switchModeTarget, setSwitchModeTarget] = useState<"treasury" | "hybrid" | "compound">("treasury");
  const [switchModeStatus, setSwitchModeStatus] = useState("");
  const handleSwitchYieldMode = useCallback(async () => {
    if (!client || !identity?._addr) return;
    setSwitchModeStatus("Switching…");
    try {
      await client.updateYieldMode(new PublicKey(identity._addr), { [switchModeTarget]: {} } as any);
      const updated = await client.getVowState(new PublicKey(identity._addr));
      setIdentity({ ...updated, _addr: identity._addr });
      setSwitchModeStatus(`✓ Yield mode switched to ${switchModeTarget}`);
    } catch (e: any) { setSwitchModeStatus(fmtError(e)); }
  }, [client, identity, switchModeTarget]);

  // ── Harvest / Withdraw ─────────────────────────────────────────────────────
  const [harvestAddr, setHarvestAddr] = useState("");
  const [harvestStatus, setHarvestStatus] = useState("");
  const handleHarvest = useCallback(async () => {
    if (!client) return;
    const addr = harvestAddr || lastVowState;
    if (!addr) return;
    setHarvestStatus("Harvesting…");
    try {
      const stateBefore = await client.getVowState(new PublicKey(addr));
      // Dormant identities have shares=0 so settle_idnft is a no-op; accrued_gain
      // may be a stale tracker from before unstake — don't report it as pending yield.
      const gain = stateBefore.activeStake
        ? await client.getPendingGain(new PublicKey(addr))
        : null;
      await client.harvest(new PublicKey(addr));
      // Refresh displayed identity so yield_balance updates immediately
      const updated = await client.getVowState(new PublicKey(addr));
      if (identity?._addr === addr) setIdentity({ ...updated, _addr: addr });
      const gainLamports = gain?.toNumber() ?? 0;
      const gainMsg = gain !== null
        ? ` — ${Math.max(0, gainLamports / LAMPORTS_PER_XNT).toFixed(6)} XNT credited`
        : " (identity dormant, no pending gain)";
      setHarvestStatus(`✓ Harvested${gainMsg}`);
    } catch (e: any) { setHarvestStatus(fmtError(e)); }
  }, [client, harvestAddr, lastVowState, identity]);

  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [withdrawStatus, setWithdrawStatus] = useState("");
  const handleWithdraw = useCallback(async () => {
    if (!client || !withdrawAddr) return;
    setWithdrawStatus("Withdrawing…");
    try {
      const xnt = withdrawAmt.trim() === "" ? null : Number(withdrawAmt);
      if (xnt !== null && (!Number.isFinite(xnt) || xnt <= 0)) { setWithdrawStatus("Enter a positive XNT amount, or leave blank for all."); return; }
      await client.withdrawYield(new PublicKey(withdrawAddr), xnt === null ? undefined : Math.round(xnt * LAMPORTS_PER_XNT));
      setWithdrawStatus("✓ Withdrawn");
    } catch (e: any) { setWithdrawStatus(fmtError(e)); }
  }, [client, withdrawAddr, withdrawAmt]);

  const [depositAddr, setDepositAddr] = useState("");
  const [depositXnt, setDepositXnt] = useState(0.01);
  const [depositStatus, setDepositStatus] = useState("");
  const handleDeposit = useCallback(async () => {
    if (!client) return;
    const addr = depositAddr || lastVowState;
    if (!addr) return;
    try {
      const target = await client.getVowState(new PublicKey(addr));
      if (!(target.owner as PublicKey).equals(client.provider.wallet.publicKey)
        && !window.confirm(`This identity belongs to another wallet:\n${(target.owner as PublicKey).toBase58()}\n\nOnly that wallet can withdraw this deposit. Send ${depositXnt} XNT anyway?`)) {
        setDepositStatus("Cancelled — nothing was sent.");
        return;
      }
      setDepositStatus("Depositing…");
      await client.depositYieldBalance(new PublicKey(addr), Math.round(depositXnt * LAMPORTS_PER_XNT));
      setDepositStatus(`✓ Deposited ${depositXnt} XNT into yield_balance`);
    } catch (e: any) { setDepositStatus(fmtError(e)); }
  }, [client, depositAddr, depositXnt, lastVowState]);

  // ── Unstake ────────────────────────────────────────────────────────────────
  const [unstakeAddr, setUnstakeAddr] = useState("");
  const [unstakeStatus, setUnstakeStatus] = useState("");
  const handleBeginUnstake = useCallback(async () => {
    if (!client || !unstakeAddr) return;
    setUnstakeStatus("Beginning unstake…");
    try {
      await client.beginUnstake(new PublicKey(unstakeAddr));
      setUnstakeStatus("✓ Unstake begun — your payout is now fixed. Complete it in the next epoch.");
    } catch (e: any) { setUnstakeStatus(fmtError(e)); }
  }, [client, unstakeAddr]);
  const handleCompleteUnstake = useCallback(async () => {
    if (!client || !unstakeAddr) return;
    setUnstakeStatus("Completing unstake…");
    try {
      await client.completeUnstake(new PublicKey(unstakeAddr));
      setUnstakeStatus("✓ Unstake complete — identity is now Dormant. Your Vow credential remains on-chain.");
    } catch (e: any) { setUnstakeStatus(fmtError(e)); }
  }, [client, unstakeAddr]);

  // ── Add Stake ──────────────────────────────────────────────────────────────
  const [addStakeAddr, setAddStakeAddr] = useState("");
  const [addStakeXnt, setAddStakeXnt] = useState(1);
  const [addStakeStatus, setAddStakeStatus] = useState("");
  const handleAddStake = useCallback(async () => {
    if (!client) return;
    const addr = addStakeAddr || lastVowState;
    if (!addr) return;
    try {
      const lamports = Math.round(addStakeXnt * LAMPORTS_PER_XNT);
      const before = await client.getVowState(new PublicKey(addr));
      const newClass = classForXnt(Math.floor(((before.principalLamports as BN).toNumber() + lamports) / LAMPORTS_PER_XNT));
      const unlock = new Date(Date.now() + LOCK_DAYS[newClass] * 86_400_000).toISOString().slice(0, 10);
      const ok = window.confirm(
        `Adding stake re-locks your ENTIRE position.\n\n` +
        `New class: ${CLASS_NAMES[newClass]}\nLock: ${LOCK_DAYS[newClass]} days from today (until about ${unlock})\n` +
        `Current unlock date: ${fmtDate((before.unlockAt as BN).toNumber())}\n\n` +
        `You cannot unstake any of it before the new date. Continue?`
      );
      if (!ok) { setAddStakeStatus("Cancelled — nothing was changed."); return; }
      setAddStakeStatus("Adding stake…");
      await client.addStake(new PublicKey(addr), lamports);
      const updated = await client.getVowState(new PublicKey(addr));
      setAddStakeStatus(
        `✓ Stake added — new principal: ${(updated.principalLamports as BN).toNumber() / LAMPORTS_PER_XNT} XNT · class: ${CLASS_NAMES[updated.class as number]}`
      );
      if (identity?._addr === addr) setIdentity({ ...updated, _addr: addr });
    } catch (e: any) { setAddStakeStatus(fmtError(e)); }
  }, [client, addStakeAddr, lastVowState, addStakeXnt, identity]);

  // ── Activate ───────────────────────────────────────────────────────────────
  const [activateAddr, setActivateAddr] = useState("");
  const [activateXnt, setActivateXnt] = useState(1);
  const [activateMode, setActivateMode] = useState<"compound" | "hybrid" | "treasury">("compound");
  const [activateStatus, setActivateStatus] = useState("");
  const handleActivate = useCallback(async () => {
    if (!client || !activateAddr) return;
    setActivateStatus("Activating stake…");
    try {
      await client.activateStake(new PublicKey(activateAddr), Math.round(activateXnt * LAMPORTS_PER_XNT), { [activateMode]: {} } as any);
      setActivateStatus("✓ Stake activated — identity is now Active");
    } catch (e: any) { setActivateStatus(fmtError(e)); }
  }, [client, activateAddr, activateXnt, activateMode]);

  // ── Sessions ───────────────────────────────────────────────────────────────
  const [sessionIdnft, setSessionIdnft] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionVow, setSessionVow] = useState<any>(null);

  // Create session form
  const [newSessionIndex, setNewSessionIndex] = useState(0);
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionKey, setNewSessionKey] = useState("");
  const [newPrograms, setNewPrograms] = useState(""); // comma-separated
  const [newExpiryDays, setNewExpiryDays] = useState(30);
  const [newDailyLimitXnt, setNewDailyLimitXnt] = useState(0.1);
  const [newLifetimeLimitXnt, setNewLifetimeLimitXnt] = useState(1);
  const [newVelocityLimit, setNewVelocityLimit] = useState(0);
  const [sessionStatus, setSessionStatus] = useState("");
  const [sessionNames, setSessionNames] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("vowSessionNames") ?? "{}"); } catch { return {}; }
  });
  // Holds the auto-generated keypair from the most recent session creation (shown once, then cleared)
  const [lastGenKp, setLastGenKp] = useState<{ pubkey: string; secret: string } | null>(null);
  // Portable session key derivation
  const [portableSession, setPortableSession] = useState(false);
  // Sessions are app-locked unless the owner explicitly opts out.
  const [allowAnyDestination, setAllowAnyDestination] = useState(false);

  const VOW_PROGRAM_ID = "7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ";
  const LEGACY_ORIGIN = "https://vow-protocol.vercel.app";

  // Derive a session keypair deterministically from wallet + identity + on-chain creation nonce.
  // Same inputs → same keypair on every device. Ed25519 is deterministic (no random nonce).
  // S-1/S-2: Full signature is hashed (SHA-256) before seeding — prevents seed bias from
  //          using only the first 32 bytes of a 64-byte signature.
  // S-4: Domain (origin) is included in the signed message — prevents cross-site session
  //      key derivation attacks where a malicious site tricks the user into signing the
  //      same message to steal their session key.
  const deriveSessionKeypair = useCallback(async (vowAddr: string, creationNonce: number, domain = window.location.origin): Promise<Keypair> => {
    const msg = new TextEncoder().encode(
      `VOW Session Authorization\nDomain: ${domain}\nProgram: ${VOW_PROGRAM_ID}\nIdentity: ${vowAddr}\nNonce: ${creationNonce}\nVersion: 2`
    );
    const sig = await wallet.signMessage(msg);
    if (!sig || sig.length < 64) {
      throw new Error("Wallet returned an invalid signature — your wallet may not support deterministic signMessage. Use a One-Time session instead.");
    }
    const hashBuffer = await crypto.subtle.digest("SHA-256", sig);
    return Keypair.fromSeed(new Uint8Array(hashBuffer));
  }, [wallet]);

  // Restore a Recoverable Session key on a new device using the on-chain creation_nonce.
  // Reads creation_nonce from the SessionAccount, re-derives keypair, verifies pubkey match.
  const handleRestoreSessionKey = useCallback(async (vowAddr: string, sessionIndex: number, expectedPubkey: string, creationNonce: number) => {
    setSessionStatus(`Signing to restore the key. Check your wallet: the message must read \"VOW Session Authorization\" with Domain: ${window.location.origin}. Never sign it on any other site.`);
    try {
      let kp = await deriveSessionKeypair(vowAddr, creationNonce);
      // Sessions created before the move to x1vow.xyz were derived under the old site address.
      if (kp.publicKey.toBase58() !== expectedPubkey && window.location.origin !== LEGACY_ORIGIN) {
        setSessionStatus("Checking for a session created on the previous site — one more signature…");
        kp = await deriveSessionKeypair(vowAddr, creationNonce, LEGACY_ORIGIN);
      }
      if (kp.publicKey.toBase58() !== expectedPubkey) {
        setSessionStatus("✗ Key mismatch — this session was created with a One-Time (random) key. Cannot restore from wallet. Revoke it and create a new Recoverable Session.");
        return;
      }
      localStorage.setItem(`vow_sk_${vowAddr}_${sessionIndex}`, Buffer.from(kp.secretKey).toString("hex"));
      setSessionStatus(`✓ Session #${sessionIndex} key restored on this device`);
      setSessions(prev => [...prev]);
    } catch (e: any) { setSessionStatus(fmtError(e)); }
  }, [deriveSessionKeypair]);

  // Fund session key
  const [fundTarget, setFundTarget] = useState("");
  const [fundXnt, setFundXnt] = useState(0.01);
  const [fundStatus, setFundStatus] = useState("");

  const loadSessions = useCallback(async (addr?: string) => {
    if (!client) return;
    const target = addr || sessionIdnft || lastVowState;
    if (!target) return;
    setSessionsLoading(true);
    try {
      const [found, vow] = await Promise.all([
        client.getSessions(new PublicKey(target)),
        client.getVowState(new PublicKey(target)),
      ]);
      setSessions(found);
      setSessionVow(vow);
      if (found.length > 0) {
        const maxIdx = Math.max(...found.map((s: any) => s.account.sessionIndex as number));
        setNewSessionIndex(maxIdx + 1);
      }
    } catch { setSessions([]); }
    setSessionsLoading(false);
  }, [client, sessionIdnft, lastVowState]);

  const handleCreateSession = useCallback(async () => {
    if (!client) return;
    const addr = sessionIdnft || lastVowState;
    if (!addr) { setSessionStatus("Enter Vow identity address"); return; }
    const unrestricted = newPrograms.trim() === "";
    if (unrestricted && !allowAnyDestination) {
      setSessionStatus("Add the program address of the app this session is for, or tick \"Allow any destination\" if you hold the key yourself.");
      return;
    }
    const uncapped = newDailyLimitXnt === 0 && newLifetimeLimitXnt === 0;
    if ((unrestricted || uncapped) && !window.confirm(
      `${unrestricted ? "This session is UNRESTRICTED: its key can pay any address.\n" : ""}` +
      `${uncapped ? "It has NO SPEND CAP: its key can spend your entire yield balance.\n" : ""}\nCreate it anyway?`
    )) { setSessionStatus("Cancelled — no session was created."); return; }
    setSessionStatus("Creating session…");
    try {
      setLastGenKp(null);
      let key: PublicKey;
      let genKp: Keypair | null = null;
      if (newSessionKey) {
        key = new PublicKey(newSessionKey);
      } else if (portableSession) {
        setSessionStatus("Reading on-chain nonce…");
        const vowStateAcc = await client.getVowState(new PublicKey(addr));
        const creationNonce = (vowStateAcc.sessionNonce as BN).toNumber();
        setSessionStatus(`Waiting for your wallet signature. Check your wallet: the message must read \"VOW Session Authorization\" with Domain: ${window.location.origin}. Never sign it on any other site.`);
        genKp = await deriveSessionKeypair(addr, creationNonce);
        key = genKp.publicKey;
      } else {
        genKp = Keypair.generate();
        key = genKp.publicKey;
      }
      setSessionStatus("Creating session…");
      const programIds = newPrograms
        .split(",").map(s => s.trim()).filter(Boolean)
        .map(s => new PublicKey(s));
      const expiry = newExpiryDays > 0 ? daysFromNow(newExpiryDays) : 0;
      await client.createSession(new PublicKey(addr), newSessionIndex, key, programIds, {
        expiryTs: new BN(expiry),
        dailyLimit: new BN(Math.round(newDailyLimitXnt * LAMPORTS_PER_XNT)),
        lifetimeLimit: new BN(Math.round(newLifetimeLimitXnt * LAMPORTS_PER_XNT)),
        velocityLimit: newVelocityLimit,
      });
      if (newSessionName) {
        const nameKey = `${addr}:${newSessionIndex}`;
        const updated = { ...sessionNames, [nameKey]: newSessionName };
        setSessionNames(updated);
        localStorage.setItem("vowSessionNames", JSON.stringify(updated));
      }
      if (genKp) {
        const secretHex = Buffer.from(genKp.secretKey).toString("hex");
        if (portableSession) {
          // Store key; creation_nonce is on-chain in the SessionAccount — no need to cache it here
          localStorage.setItem(`vow_sk_${addr}_${newSessionIndex}`, secretHex);
          setSessionStatus(`✓ Session #${newSessionIndex} created — Recoverable Session key stored locally`);
        } else {
          setLastGenKp({ pubkey: genKp.publicKey.toBase58(), secret: secretHex });
          setSessionStatus(`✓ Session #${newSessionIndex} created`);
        }
      } else {
        setSessionStatus(`✓ Session #${newSessionIndex} created`);
      }
      await loadSessions(addr);
    } catch (e: any) { setSessionStatus(fmtError(e)); }
  }, [client, sessionIdnft, lastVowState, newSessionIndex, newSessionName, sessionNames, newSessionKey, newPrograms, newExpiryDays, newDailyLimitXnt, newLifetimeLimitXnt, newVelocityLimit, loadSessions, portableSession, deriveSessionKeypair, allowAnyDestination]);

  // A revoked or closed session's key is useless on-chain; don't leave it in storage.
  const forgetSessionKey = (vowAddr: string, sessionIndex: number) => {
    try { localStorage.removeItem(`vow_sk_${vowAddr}_${sessionIndex}`); } catch { /* storage unavailable */ }
  };

  const handleRevokeSession = useCallback(async (vowAddr: string, sessionIndex: number) => {
    if (!client) return;
    try {
      await client.revokeSession(new PublicKey(vowAddr), sessionIndex);
      forgetSessionKey(vowAddr, sessionIndex);
      setSessionStatus(`✓ Session #${sessionIndex} revoked — its key was deleted from this browser`);
      await loadSessions(vowAddr);
    } catch (e: any) { setSessionStatus(fmtError(e)); }
  }, [client, loadSessions]);

  const handleCloseSession = useCallback(async (vowAddr: string, sessionIndex: number) => {
    if (!client) return;
    try {
      await client.closeSession(new PublicKey(vowAddr), sessionIndex);
      forgetSessionKey(vowAddr, sessionIndex);
      setSessionStatus(`✓ Session #${sessionIndex} closed — rent reclaimed, key deleted from this browser`);
      await loadSessions(vowAddr);
    } catch (e: any) { setSessionStatus(fmtError(e)); }
  }, [client, loadSessions]);

  const handleFundSession = useCallback(async () => {
    if (!client || !fundTarget || fundXnt <= 0) return;
    setFundStatus("Transferring…");
    try {
      const lamports = Math.round(fundXnt * LAMPORTS_PER_XNT);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: client.provider.wallet.publicKey,
          toPubkey: new PublicKey(fundTarget),
          lamports,
        })
      );
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = client.provider.wallet.publicKey;
      const signed = await client.provider.wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");
      setFundStatus(`✓ Sent ${fundXnt} XNT to session key. Tx: ${sig.slice(0,16)}…`);
    } catch (e: any) { setFundStatus(fmtError(e)); }
  }, [client, fundTarget, fundXnt]);

  // ── Active identity ─────────────────────────────────────────────────────
  const [ws, setWs] = useState<"identity" | "topup" | "stake" | "yield" | "sessions">("identity");
  const [connectError, setConnectError] = useState("");
  const wasConnected = useRef(false);

  const handleConnect = useCallback(async () => {
    setConnectError("");
    try { await wallet.connect(); }
    catch (e: any) { setConnectError(e?.message?.includes("not found") ? "No X1 wallet found. Install the X1 Wallet extension, then try again." : "Wallet connection was cancelled or failed."); }
  }, [wallet]);

  useEffect(() => {
    if (wallet.connected && !wasConnected.current && tab === "overview") setTab("user");
    wasConnected.current = wallet.connected;
  }, [wallet.connected]);

  // Owner actions always target the connected wallet's active identity.
  useEffect(() => {
    setAddStakeAddr(lastVowState); setHarvestAddr(lastVowState); setWithdrawAddr(lastVowState);
    setUnstakeAddr(lastVowState); setActivateAddr(lastVowState); setSessionIdnft(lastVowState);
    setDepositAddr(lastVowState);
  }, [lastVowState]);

  const refreshIdentity = useCallback(async () => {
    if (!client || !wallet.publicKey || !lastVowState) return;
    try {
      const state = await client.getVowState(new PublicKey(lastVowState));
      if ((state.owner as PublicKey).equals(wallet.publicKey)) {
        setIdentity({ ...state, _addr: lastVowState });
        setLookupAddr(lastVowState);
      }
    } catch { /* identity not available yet */ }
  }, [client, wallet.publicKey?.toBase58(), lastVowState]);

  useEffect(() => { refreshIdentity(); },
    [refreshIdentity, mintStatus, addStakeStatus, harvestStatus, withdrawStatus, depositStatus, unstakeStatus, activateStatus]);

  useEffect(() => {
    if (ws === "sessions" && lastVowState) loadSessions(lastVowState);
  }, [ws, lastVowState, client]);

  const own = identity?._addr === lastVowState ? identity : null;
  const WORKSPACES = [
    { key: "identity", num: "01", title: "Identity", sub: "Your credential and record", lede: "The soulbound credential tied to your wallet, and the history it has earned.", tab: "#6d4bd1", soft: "#f0ecfb" },
    { key: "topup", num: "02", title: "Top up", sub: "Add XNT to your vow", lede: "Add XNT to your stake to earn more, or to your spending balance so apps can use it right away.", tab: "#c47f00", soft: "#fdf4e2" },
    { key: "stake", num: "03", title: "Stake", sub: "Exit or reactivate", lede: "Unstake when your lock ends, or bring a dormant identity back to life.", tab: "#b3263f", soft: "#fcedf0" },
    { key: "yield", num: "04", title: "Yield", sub: "Harvest and withdraw", lede: "Turn staking rewards into a balance you can withdraw or let apps spend.", tab: "#0d8a5b", soft: "#e7f6f0" },
    { key: "sessions", num: "05", title: "Sessions", sub: "Delegate with limits", lede: "Give apps and agents narrow, revocable authority over your yield.", tab: "#1f62d0", soft: "#e9f1fd" },
  ] as const;
  const activeWs = WORKSPACES.find(w => w.key === ws)!;

  const topbar = (
    <header className="topbar">
      <button className="brand" onClick={() => setTab("overview")} aria-label="Vow Protocol home">
        <span className="brand-mark" /><span>VOW</span>
      </button>
      <span className="net-pill">X1 Mainnet</span>
      <nav className="topnav" aria-label="Main">
        {([["overview", "Overview"], ["user", "App"], ["docs", "Docs"], ["demo", "Demo"], ["admin", "Protocol"]] as const).map(([k, label]) => (
          <button key={k} aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>
      <div className="wallet-area">
        {wallet.connected ? (<>
          <span className="wallet-chip" title={wallet.publicKey?.toBase58()}>{short(wallet.publicKey?.toBase58() ?? "")}</span>
          <button className="btn btn-ghost btn-sm" onClick={wallet.disconnect}>Disconnect</button>
        </>) : (
          <button className="btn btn-gold btn-sm" onClick={handleConnect} disabled={wallet.connecting}>{wallet.connecting ? "Connecting…" : "Connect wallet"}</button>
        )}
      </div>
    </header>
  );
  const footer = (
    <footer className="footer"><div className="footer-inner">
      <span>Vow Protocol · Program <code>7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ</code></span>
      <a href="https://github.com/Commoneffort/vow-protocol" target="_blank" rel="noreferrer">Source on GitHub</a>
    </div></footer>
  );
  const pageHead = (eyebrow: string, title: string, text: string) => (
    <div className="page-head"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>
  );

  if (tab === "overview") return (
    <div className="app-root">
      {topbar}
      <main style={{ flex: 1 }}>
        <Landing connected={wallet.connected} connecting={wallet.connecting} connectError={connectError}
          onConnect={handleConnect} onOpenApp={() => setTab("user")} onOpenDemo={() => setTab("demo")} rpc={RPC} />
      </main>
      {footer}
    </div>
  );

  if (tab === "admin") return (
    <div className="app-root">{topbar}
      <main className="page">
        {pageHead("Protocol", "Protocol health", "Live reserve, pool position, and permissionless maintenance anyone can run.")}
        <Admin wallet={wallet} />
      </main>{footer}
    </div>
  );

  if (tab === "demo") return (
    <div className="app-root">{topbar}
      <main className="page">
        {pageHead("Interactive demo", "See a session key at work", "Set the limits, let an app spend, and watch the protocol's rules hold.")}
        <DAppDemo wallet={wallet} client={client} lastVowState={lastVowState} />
      </main>{footer}
    </div>
  );

  if (tab === "docs") return (
    <div className="app-root">{topbar}
      <main className="page page-narrow">
        {pageHead("Documentation", "Vow Protocol docs", "How the protocol works, what it guarantees, and how to build on it.")}
        <Docs />
      </main>{footer}
    </div>
  );

  // ── App ────────────────────────────────────────────────────────────────
  const needsIdentity = (
    <div className="panel empty">
      <h2>Your vow starts with an identity</h2>
      <p>Mint a soulbound identity to unlock staking, yield, and session keys.</p>
      <button style={{ ...BTN, background: "#6d4bd1" }} onClick={() => setWs("identity")}>Go to Identity</button>
    </div>
  );

  return (
    <div className="app-root">
      {topbar}
      <main className="page">
        {!wallet.connected ? (
          <div className="connect-panel">
            <span className="eyebrow">Your Vow</span>
            <h1>Connect to continue</h1>
            <p>Your identity lives on-chain, so it's available from any device with your wallet.</p>
            <button className="btn btn-gold" onClick={handleConnect} disabled={wallet.connecting}>{wallet.connecting ? "Connecting…" : "Connect X1 Wallet"}</button>
            {connectError && <div className="notice">{connectError}</div>}
            <p style={{ fontSize: 13, marginTop: 18, marginBottom: 0 }}>
              Need a wallet?{" "}
              <a href="https://chromewebstore.google.com/detail/x1-wallet/kcfmcpdmlchhbikbogddmgopmjbflnae" target="_blank" rel="noreferrer">Install X1 Wallet</a>
            </p>
          </div>
        ) : (<>
          {protocolReady === false && <div className="notice">The protocol could not be read from X1 right now. Try again shortly.</div>}
          <div className="workspace">
            <aside className="rail">
              <div className="rail-card">
                <span className="eyebrow">Your Vow</span>
                {own ? (<>
                  <div className="rail-class">{CLASS_NAMES[own.class]}</div>
                  <div className="rail-status">{own.activeStake ? (own.matured ? "Active · matured" : `Active · unlocks ${fmtDate(own.unlockAt?.toNumber())}`) : "Dormant"}</div>
                  <div className="rail-stat"><span>Principal</span><span>{fmtXnt(own.principalLamports, 3)}</span></div>
                  <div className="rail-stat"><span>Yield balance</span><span>{fmtXnt(own.yieldBalance, 4)}</span></div>
                  <div className="rail-stat"><span>Mode</span><span style={{ textTransform: "capitalize" }}>{Object.keys(own.yieldMode)[0]}</span></div>
                  <div className="rail-stat"><span>Vows kept</span><span>{own.totalFulfilled?.toString()} of {own.totalCommitments?.toString()}</span></div>
                  <button className="rail-topup" onClick={() => setWs("topup")}>＋ Top up</button>
                </>) : <div className="rail-status" style={{ marginBottom: 0 }}>No identity yet</div>}
              </div>
              <nav className="ws-nav" aria-label="Workspaces">
                {WORKSPACES.map(w => (
                  <button key={w.key} aria-current={ws === w.key ? "true" : undefined} onClick={() => setWs(w.key)}
                    style={{ ["--tab" as any]: w.tab, ["--tab-soft" as any]: w.soft }}>
                    <span className="ws-num">{w.num}</span>
                    <span className="ws-title">{w.title}</span>
                    <span className="ws-sub">{w.sub}</span>
                  </button>
                ))}
              </nav>
            </aside>
            <div className={`stage ws-${ws}`}>
              <div className="stage-head">
                <span className="stage-num">{activeWs.num}</span>
                <div><h1>{activeWs.title}</h1><p>{activeWs.lede}</p></div>
              </div>
              {ws !== "identity" && !lastVowState && needsIdentity}
              {ws === "identity" && (<>
                {!ownedIdentity && (<>
        {/* ── Mint ────────────────────────────────────────────────────── */}
        <div style={CARD}>
          <h2 style={{ marginTop: 0 }}>Mint Vow Identity</h2>
          <p style={HINT}>
            Staking XNT creates your soulbound identity and enters the X1 Foundation stake pool.
            Class is determined by stake amount and sets the lock duration. Each wallet can hold one identity.
            Your deposit buys shares net of the pool's entry and exit fees (currently 0.1% each), so your opening
            position value is about 0.2% below the amount staked.
          </p>
          {ownedIdentity && (
            <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, background: "#ecfdf5", color: "#065f46", fontSize: 12 }}>
              This wallet already has a Vow identity: <code style={{ fontSize: 11 }}>{ownedIdentity}</code>. Use Add Stake or Activate Stake instead.
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <label>
              <span style={LABEL}>Stake (XNT):</span>
              <input type="number" min={1} value={stakeXnt}
                onChange={e => setStakeXnt(Number(e.target.value))}
                style={{ ...INPUT, width: 80, marginLeft: 4 }} />
            </label>
            <span style={{ marginLeft: 12, color: "#555", fontSize: 13 }}>
              → <strong>{CLASS_NAMES[previewClass]}</strong> class {previewClass} · {LOCK_DAYS[previewClass]} day lock
            </span>
          </div>

          {/* Yield mode selector with full explanations */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Yield mode (enforced on-chain per identity):</div>
            {YIELD_MODES.map(({ key, label, desc, warn }: any) => (
              <label key={key} style={{ display: "flex", gap: 10, marginBottom: 10, cursor: "pointer", alignItems: "flex-start" }}>
                <input type="radio" name="ym" value={key} checked={yieldMode === key}
                  onChange={() => setYieldMode(key as any)} style={{ marginTop: 3, flexShrink: 0 }} />
                <span>
                  <strong style={{ fontSize: 13 }}>{label}</strong>
                  <span style={{ display: "block", fontSize: 12, color: "#666", lineHeight: 1.6, marginTop: 2 }}>{desc}</span>
                  {warn && yieldMode === key && (
                    <span style={{ display: "block", fontSize: 12, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, padding: "4px 8px", marginTop: 4 }}>
                      ⚠ {warn}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <button onClick={handleMint} disabled={!!ownedIdentity} style={{ ...BTN, opacity: ownedIdentity ? 0.45 : 1 }}>Mint</button>
          {mintStatus && <div style={STATUS}>{mintStatus}</div>}
        </div>
                </>)}
        {/* ── Identity lookup ──────────────────────────────────────────── */}
        <div style={CARD}>
          <h2 style={{ marginTop: 0 }}>Your Credential</h2>
          <p style={HINT}>Your soulbound card, position, and permanent reputation. You can also look up any public identity.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label>
              <span style={LABEL}>Vow identity address:</span>
              <input value={lookupAddr} onChange={e => setLookupAddr(e.target.value)}
                placeholder="Any Vow identity address"
                style={{ ...INPUT, width: 360, marginLeft: 4 }} />
            </label>
            <button onClick={handleLookup} style={{ ...BTN, marginTop: 0 }}>Load</button>
            <button onClick={handleFindMine} style={{ ...BTN_GRAY, marginTop: 0 }}
              title="Find all Vow identities owned by your connected wallet">
              Find My Identities
            </button>
          </div>
          {myIdentities.length > 1 && (
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {myIdentities.map((addr, i) => (
                <button key={addr} style={{ ...BTN_SM, background: addr === lookupAddr ? "#1a1a1a" : "#888" }}
                  onClick={async () => {
                    setLookupAddr(addr);
                    setLastVowState(addr);
                    if (!client) return;
                    setLookupStatus("Loading…");
                    try {
                      const state = await client.getVowState(new PublicKey(addr));
                      setIdentity({ ...state, _addr: addr });
                      setLookupStatus("");
                    } catch (e: any) { setLookupStatus("✗ " + (e as any).message); }
                  }}>
                  #{i + 1}: {addr.slice(0, 8)}…{addr.slice(-6)}
                </button>
              ))}
            </div>
          )}
          {lookupStatus && <div style={STATUS}>{lookupStatus}</div>}

          {identity && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <span style={identity.activeStake ? BADGE_ACTIVE : BADGE_DORMANT}>
                  {identity.activeStake ? "Active Identity" : "Dormant Identity"}
                </span>
                <span style={{ fontSize: 12, color: "#666" }}>
                  {CLASS_NAMES[identity.class]} (class {identity.class}) ·{" "}
                  {identity.matured ? "Matured ✓" : `Unlocks ${fmtDate(identity.unlockAt?.toNumber())}`}
                </span>
              </div>

              <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flexShrink: 0 }}>
                  <VowCard
                    ref={cardRef}
                    classIndex={identity.class ?? 0}
                    nonce={(identity.nonce as any)?.toNumber?.() ?? 0}
                    activatedAt={(identity.firstStakedAt as any)?.toNumber?.() ?? 0}
                    maturesAt={(identity.unlockAt as any)?.toNumber?.() ?? 0}
                    activeStake={identity.activeStake ?? false}
                    size={230}
                  />
                  <button onClick={handleDownloadCard}
                    style={{ ...BTN_SM, marginTop: 8, width: "100%", textAlign: "center" }}>
                    ↓ Download SVG
                  </button>
                </div>
                <div style={{ flex: 1, minWidth: 240 }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Account address", <a href={`https://explorer.x1.xyz/address/${identity._addr}`} target="_blank" rel="noreferrer" style={{ fontFamily: "monospace", fontSize: 11 }}>{identity._addr}</a>],
                    ["Owner (permanent)", <code style={{ fontSize: 11 }}>{(identity.owner as PublicKey)?.toBase58()}</code>],
                    ["Principal staked", fmtXnt(identity.principalLamports)],
                    ["Yield balance", fmtXnt(identity.yieldBalance, 6) + " (withdrawable)"],
                    ["Yield mode", Object.keys(identity.yieldMode)[0]],
                    ["Total harvested", fmtXnt(identity.totalHarvested)],
                  ].map(([k, v]) => (
                    <tr key={k as string} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "5px 0", color: "#888", width: 180 }}>{k}</td>
                      <td style={{ padding: "5px 0", fontWeight: 600 }}>{v as React.ReactNode}</td>
                    </tr>
                  ))}
                  {"compound" in (identity.yieldMode ?? {}) && (
                    <tr><td colSpan={2} style={{ paddingTop: 8, paddingBottom: 4 }}>
                      <span style={{ display: "block", fontSize: 12, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, padding: "6px 10px" }}>
                        ⚠ Compound mode — yield_balance stays 0. To spend yield in dApps, switch to Treasury or Hybrid.
                      </span>
                    </td></tr>
                  )}
                  {identity.activeStake && (
                    <tr><td colSpan={2} style={{ paddingTop: 10, paddingBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#555" }}>Switch yield mode:</span>
                        {(["treasury", "hybrid", "compound"] as const).map(m => {
                          const isCurrent = m in (identity.yieldMode ?? {});
                          const isSelected = switchModeTarget === m;
                          return (
                            <button key={m}
                              onClick={() => !isCurrent && setSwitchModeTarget(m)}
                              style={{
                                ...BTN_SM,
                                background: isCurrent ? "#16a34a" : isSelected ? "#1a1a1a" : "#888",
                                cursor: isCurrent ? "default" : "pointer",
                                outline: isSelected && !isCurrent ? "2px solid #60a5fa" : "none",
                                outlineOffset: 1,
                              }}>
                              {m.charAt(0).toUpperCase() + m.slice(1)}{isCurrent ? " ✓" : ""}
                            </button>
                          );
                        })}
                        <button
                          onClick={handleSwitchYieldMode}
                          disabled={switchModeTarget in (identity.yieldMode ?? {})}
                          style={{ ...BTN_SM, background: "#1d4ed8", opacity: switchModeTarget in (identity.yieldMode ?? {}) ? 0.4 : 1 }}>
                          Apply
                        </button>
                        {switchModeStatus && <span style={{ fontSize: 12, color: switchModeStatus.startsWith("✓") ? "#16a34a" : "#dc2626" }}>{switchModeStatus}</span>}
                      </div>
                    </td></tr>
                  )}
                  <tr><td colSpan={2} style={{ paddingTop: 12, fontWeight: 700, fontSize: 12, color: "#444" }}>
                    Reputation (permanent, never reset)
                  </td></tr>
                  {[
                    ["First staked", fmtDate(identity.firstStakedAt?.toNumber())],
                    ["Total stake commitments", identity.totalCommitments?.toString()],
                    ["Fulfilled to maturity", identity.totalFulfilled?.toString()],
                    ["Cumulative stake days", identity.cumulativeStakeDays?.toString() + " days"],
                    ["Highest class ever", CLASS_NAMES[identity.highestClassEver] + ` (class ${identity.highestClassEver})`],
                  ].map(([k, v]) => (
                    <tr key={k as string} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "5px 0", color: "#888", width: 180 }}>{k}</td>
                      <td style={{ padding: "5px 0", fontWeight: 600 }}>{v as string}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
              </div>
            </div>
          )}
        </div>
              </>)}
              {ws === "topup" && lastVowState && (<>
        <div className="topup-choices">
          <a href="#topup-balance" className="topup-choice">
            <span className="topup-tag">Spend now</span>
            <strong>Add to spending balance</strong>
            <span>Usable by your sessions immediately, withdrawable anytime. Doesn't earn yield.</span>
          </a>
          <a href="#topup-stake" className="topup-choice">
            <span className="topup-tag">Earns yield</span>
            <strong>Add to stake</strong>
            <span>Grows your principal and class. Locked again for your class's full term.</span>
          </a>
        </div>
        {/* ── Deposit to yield balance ─────────────────────────────────── */}
        <div style={CARD} id="topup-balance">
          <h2 style={{ marginTop: 0 }}>Add to spending balance</h2>
          <p style={HINT}>
            Deposits XNT straight into the identity's yield balance — no waiting for staking rewards. It is spendable
            right away by your session keys (within their limits) and you can withdraw it anytime from Yield.
            Anyone can top up an identity: you, a session key, or an app.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginTop: 12 }}>
            <label>
              <span style={LABEL}>Amount (XNT):</span>
              <input type="number" min={0.001} step={0.001} value={depositXnt}
                onChange={e => setDepositXnt(parseFloat(e.target.value))}
                style={{ ...INPUT, width: 100, marginLeft: 4 }} />
            </label>
            <button onClick={handleDeposit} style={{ ...BTN_GREEN, marginTop: 0 }}>Add to balance</button>
          </div>
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>Fund someone else's identity</summary>
            <p style={{ ...HINT, marginTop: 8 }}>
              <strong>Check the address:</strong> a deposit belongs to that identity and only its owner can withdraw it.
            </p>
            <label>
              <span style={LABEL}>Vow identity:</span>
              <input value={depositAddr} onChange={e => setDepositAddr(e.target.value)}
                placeholder="blank = your identity" style={{ ...INPUT, width: 300, maxWidth: "100%", marginLeft: 4 }} />
            </label>
          </details>
          {depositStatus && <div style={STATUS}>{depositStatus}</div>}
        </div>
        {own && !own.activeStake && (
          <div className="ws-pointer">Your identity is dormant, so stake can't be added. <button onClick={() => setWs("stake")}>Reactivate it in Stake →</button></div>
        )}
        {/* ── Add Stake ────────────────────────────────────────────────── */}
        <div style={CARD} id="topup-stake">
          <h2 style={{ marginTop: 0 }}>Add to stake</h2>
          <p style={HINT}>
            Adds XNT to an active identity's stake. New shares are bought at the current share price, net of pool fees,
            and your class updates to match the new total.
          </p>
          <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, background: "#fff4e5", color: "#8a4b00", fontSize: 12 }}>
            ⚠ <b>Every top-up re-locks your whole position</b> for the full duration of its class, starting today,
            even if it was already unlocked and even for a tiny amount.
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginTop: 12 }}>
            <label>
              <span style={LABEL}>Amount to add (XNT):</span>
              <input type="number" min={0.001} step={0.001} value={addStakeXnt}
                onChange={e => setAddStakeXnt(Number(e.target.value))}
                style={{ ...INPUT, width: 100, marginLeft: 4 }} />
            </label>
            <button onClick={handleAddStake} disabled={!!own && !own.activeStake} style={{ ...BTN, marginTop: 0, opacity: own && !own.activeStake ? 0.45 : 1 }}>Add to stake</button>
          </div>
          {addStakeStatus && <div style={STATUS}>{addStakeStatus}</div>}
        </div>
              </>)}
              {ws === "stake" && lastVowState && (<>
        <div className="ws-pointer">Want to add XNT to your stake? <button onClick={() => setWs("topup")}>Go to Top up →</button></div>
        {/* ── Unstake ──────────────────────────────────────────────────── */}
        <div style={CARD}>
          <h2 style={{ marginTop: 0 }}>Unstake</h2>
          <p style={HINT}>
            Unstake withdraws your principal + yield_balance back to your wallet.
            The Vow identity account <strong>stays on-chain permanently</strong> as a credential — your reputation
            history is preserved. Identity becomes Dormant until you Activate Stake again.
            Requires lock period to have expired (matured). Your payout is fixed when you begin: shares × the current
            share price + yield_balance. You earn no further yield while waiting, and it is paid in full when you complete,
            from the next epoch on. If pXNT must be redeemed just after an epoch boundary, completion can take a few extra minutes.
          </p>
          <div style={{ marginTop: 8 }}>
            <button onClick={handleBeginUnstake} style={BTN}>Begin Unstake</button>
            <button onClick={handleCompleteUnstake} style={{ ...BTN_GRAY, marginLeft: 8 }}>
              Complete Unstake (after 1 epoch)
            </button>
          </div>
          {unstakeStatus && <div style={STATUS}>{unstakeStatus}</div>}
        </div>
        {/* ── Activate Stake ───────────────────────────────────────────── */}
        <div style={CARD}>
          <h2 style={{ marginTop: 0 }}>Activate Stake</h2>
          <p style={HINT}>
            Re-activates a Dormant identity with a new stake position.
            Reputation (first_staked_at, commitments, fulfilled, stake_days, highest_class) is preserved and updated.
            Old sessions are invalidated — create new ones after activation.
          </p>
          <div style={{ marginTop: 10 }}>
            <label>
              <span style={LABEL}>New stake (XNT):</span>
              <input type="number" min={1} value={activateXnt}
                onChange={e => setActivateXnt(Number(e.target.value))}
                style={{ ...INPUT, width: 80, marginLeft: 4 }} />
            </label>
          </div>
          <div style={{ marginTop: 10 }}>
            {YIELD_MODES.map(({ key, label }) => (
              <label key={key} style={{ marginRight: 16, fontSize: 13 }}>
                <input type="radio" name="am" value={key} checked={activateMode === key}
                  onChange={() => setActivateMode(key as any)} /> {label}
              </label>
            ))}
          </div>
          <button onClick={handleActivate} style={BTN_GREEN}>Activate Stake</button>
          {activateStatus && <div style={STATUS}>{activateStatus}</div>}
        </div>
              </>)}
              {ws === "yield" && lastVowState && (<>
        <div className="ws-pointer">Want to add XNT to your spending balance directly? <button onClick={() => setWs("topup")}>Go to Top up →</button></div>
        {/* ── Harvest / Withdraw ───────────────────────────────────────── */}
        <div style={CARD}>
          <h2 style={{ marginTop: 0 }}>Harvest & Withdraw Yield</h2>
          <p style={HINT}>
            Harvest settles your gain at the current share price and applies your yield mode. Anyone can trigger it for any identity.
            Compound mode: gain is recorded but stays as shares — nothing to withdraw.
            Treasury/Hybrid: shares worth the gain (all or half) are converted to yield_balance, a fixed XNT amount that no longer earns yield.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 12 }}>
            <button onClick={handleHarvest} style={{ ...BTN, marginTop: 0 }}>Harvest</button>
          </div>
          {harvestStatus && <div style={STATUS}>{harvestStatus}</div>}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #eee" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <label>
                <span style={LABEL}>Amount (XNT, blank = all):</span>
                <input value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
                  style={{ ...INPUT, width: 160, marginLeft: 4 }} />
              </label>
              <button onClick={handleWithdraw} style={{ ...BTN, marginTop: 0 }}>Withdraw Yield</button>
            </div>
          </div>
          {withdrawStatus && <div style={STATUS}>{withdrawStatus}</div>}

        </div>
              </>)}
              {ws === "sessions" && lastVowState && (<>
        {/* ── Session Keys ─────────────────────────────────────────────── */}
        <div style={CARD}>
          <h2 style={{ marginTop: 0 }}>Session Keys</h2>
          <p style={HINT}>
            Session keys let dApps spend your yield_balance on your behalf — without your main wallet signing each transaction.
            You set hard limits per session: max spend per day, max total lifetime spend, max transactions per day, allowed programs, and expiry.
            All limits are enforced on-chain. The dApp can never exceed what you authorized.
            Requires an Active identity (active_stake = true).
          </p>

          {/* Session address selector + load */}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => loadSessions()} style={{ ...BTN_GRAY, marginTop: 0 }}>
              {sessionsLoading ? "Loading…" : "Load My Sessions"}
            </button>
          </div>

          {/* Session list */}
          {sessions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                Active session keys ({sessions.length})
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      {["#", "Name", "Session Key", "Expiry", "Daily Limit", "Lifetime Limit", "Tx/Day", "Spent Today", "Total Spent", "Programs", "Status", "Key", ""].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ddd", fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s: any) => {
                      const acc = s.account;
                      const expiry = (acc.expiryTs as BN).toNumber();
                      const now = Math.floor(Date.now() / 1000);
                      const expired = expiry > 0 && now > expiry;
                      const programs = (acc.allowedProgramIds as PublicKey[])
                        .slice(0, acc.programCount)
                        .map((p: PublicKey) => short(p.toBase58()));
                      const dailyLim = (acc.dailyLimit as BN).toNumber();
                      const lifeLim = (acc.lifetimeLimit as BN).toNumber();
                      const vel = acc.velocityLimit as number;
                      const invalidated = !!sessionVow && (!sessionVow.activeStake
                        || (acc.startTs as BN).lt(sessionVow.sessionsInvalidatedAt as BN));
                      const usable = acc.active && !expired && !invalidated;
                      return (
                        <tr key={(acc.sessionKey as PublicKey).toBase58()}
                          style={{ borderBottom: "1px solid #f5f5f5", opacity: usable ? 1 : 0.5 }}>
                          <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>
                            {acc.sessionIndex as number}
                          </td>
                          <td style={{ padding: "5px 8px", fontSize: 11, color: "#555" }}>
                            {sessionNames[`${sessionIdnft || lastVowState}:${acc.sessionIndex}`] ?? <em style={{ color: "#aaa" }}>—</em>}
                          </td>
                          <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: 10 }}>
                            {short((acc.sessionKey as PublicKey).toBase58())}
                            <button style={{ ...BTN_SM, marginLeft: 4, fontSize: 10, padding: "1px 5px" }}
                              onClick={() => navigator.clipboard.writeText((acc.sessionKey as PublicKey).toBase58())}>
                              Copy
                            </button>
                          </td>
                          <td style={{ padding: "5px 8px" }}>
                            {expiry === 0 ? "No expiry" : fmtDate(expiry)}
                            {expired && <span style={{ color: "#c0392b", marginLeft: 4 }}>expired</span>}
                          </td>
                          <td style={{ padding: "5px 8px" }}>{dailyLim === 0 ? "∞" : fmtXnt(dailyLim)}</td>
                          <td style={{ padding: "5px 8px" }}>{lifeLim === 0 ? "∞" : fmtXnt(lifeLim)}</td>
                          <td style={{ padding: "5px 8px" }}>{vel === 0 ? "∞" : vel + " tx"}</td>
                          <td style={{ padding: "5px 8px" }}>{fmtXnt((acc.spentToday as BN).toNumber())}</td>
                          <td style={{ padding: "5px 8px" }}>{fmtXnt((acc.spentTotal as BN).toNumber())}</td>
                          <td style={{ padding: "5px 8px", maxWidth: 120, fontSize: 10, fontFamily: "monospace" }}>
                            {programs.length === 0
                              ? <em style={{ color: "#8a4b00" }} title="Session key can pay any address up to its limits">⚠ unrestricted — can pay anyone</em>
                              : programs.join(", ")}
                          </td>
                          <td style={{ padding: "5px 8px" }}>
                            <span style={{
                              display: "inline-block", padding: "1px 6px", borderRadius: 3, fontSize: 10,
                              background: usable ? "#d4edda" : "#f8d7da",
                              color: usable ? "#155724" : "#721c24"
                            }}>
                              {usable ? "active" : invalidated && acc.active && !expired ? "invalidated" : "inactive"}
                            </span>
                          </td>
                          {/* Key status: local key available or offer Restore */}
                          {(() => {
                            const vowAddr = sessionIdnft || lastVowState;
                            const hasKey = !!localStorage.getItem(`vow_sk_${vowAddr}_${acc.sessionIndex}`);
                            return (
                              <td style={{ padding: "5px 8px" }}>
                                {hasKey
                                  ? <span style={{ color: "#27ae60", fontSize: 13, fontWeight: 700 }} title="Session key is stored on this device">✓</span>
                                  : <button style={{ ...BTN_SM, background: "#e67e22", color: "white", whiteSpace: "nowrap" }}
                                      onClick={() => handleRestoreSessionKey(vowAddr, acc.sessionIndex as number, (acc.sessionKey as PublicKey).toBase58(), (acc.creationNonce as BN).toNumber())}>
                                      Restore
                                    </button>
                                }
                              </td>
                            );
                          })()}
                          <td style={{ padding: "5px 8px" }}>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button style={{ ...BTN_SM, background: "#2980b9" }}
                                onClick={() => { setFundTarget((acc.sessionKey as PublicKey).toBase58()); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }}>
                                Fund
                              </button>
                              {acc.active && !invalidated && (
                                <button style={BTN_SM_RED}
                                  onClick={() => handleRevokeSession(sessionIdnft || lastVowState, acc.sessionIndex as number)}>
                                  Revoke
                                </button>
                              )}
                              {!usable && (
                                <button style={BTN_SM}
                                  onClick={() => handleCloseSession(sessionIdnft || lastVowState, acc.sessionIndex as number)}>
                                  Close (reclaim rent)
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sessions.length === 0 && !sessionsLoading && (
            <p style={{ ...HINT, marginTop: 12 }}>No sessions loaded. Press "Load My Sessions" after entering a Vow identity address.</p>
          )}

          {/* Create new session form */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Create New Session</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "block" }}>
                <div style={LABEL}>Session index</div>
                <div style={HINT}>Unique u32 identifier. Auto-increments from last loaded session. Each index is a separate PDA slot.</div>
                <input type="number" min={0} value={newSessionIndex} onChange={e => setNewSessionIndex(Number(e.target.value))}
                  style={{ ...INPUT, width: 100, marginTop: 4 }} />
              </label>
              <label style={{ display: "block" }}>
                <div style={LABEL}>Session name (optional)</div>
                <div style={HINT}>Human-readable label stored locally (e.g. "Trading Bot", "Arena Game"). Not on-chain.</div>
                <input value={newSessionName} onChange={e => setNewSessionName(e.target.value)}
                  placeholder="Trading Bot, Arena Game, …" style={{ ...INPUT, width: "100%", marginTop: 4 }} />
              </label>
              <label style={{ display: "block" }}>
                <div style={LABEL}>Session key pubkey</div>
                <div style={HINT}>Leave blank to auto-derive or generate a key. Paste a pubkey here to register an externally-generated keypair.</div>
                <input value={newSessionKey} onChange={e => setNewSessionKey(e.target.value)}
                  placeholder="blank = auto-derive (recommended)" style={{ ...INPUT, width: "100%", marginTop: 4 }} />
                {!newSessionKey && (
                  <div style={{ marginTop: 6 }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 6, cursor: "pointer" }}>
                      <input type="checkbox" checked={portableSession} onChange={e => setPortableSession(e.target.checked)}
                        style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#333" }}>
                        <strong>{portableSession ? "Recoverable Session" : "One-Time Session"}</strong>
                        {portableSession
                          ? <> — key derived from wallet signature. <span style={{ color: "#666" }}>Restore on any device using your wallet. No backup required. Do not share the session key — it is a hot key bounded only by its on-chain limits.</span></>
                          : <> — random key, shown once. <span style={{ color: "#666" }}>Copy and store the secret securely. Cannot be recovered if lost.</span></>}
                      </span>
                    </label>
                    {portableSession && (
                      <div style={{ marginTop: 6, padding: "8px 10px", borderRadius: 4, background: "#fdecec", border: "1px solid #f5c2c2", color: "#8a1c1c", fontSize: 11.5, lineHeight: 1.5 }}>
                        🛡 <b>Phishing warning:</b> only sign a <b>"VOW Session Authorization"</b> message on <b>{window.location.host}</b>.
                        Wallets don't check the Domain line, so a fake site can ask for the same signature — and whoever
                        gets it can rebuild your session key. If you ever signed it elsewhere, revoke your sessions.
                      </div>
                    )}
                  </div>
                )}
              </label>
              <label style={{ display: "block" }}>
                <div style={LABEL}>Allowed apps (program IDs)</div>
                <div style={HINT}>Required by default. Comma-separated program addresses. Spends only work when one of those programs
                  calls Vow itself (CPI) — the session key alone can't send funds anywhere. Use this for AI agents and dApps.</div>
                <input value={newPrograms} onChange={e => setNewPrograms(e.target.value)}
                  placeholder="the app's program address" style={{ ...INPUT, width: "100%", marginTop: 4 }} />
                {newPrograms.trim() === "" && (
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={allowAnyDestination} onChange={e => setAllowAnyDestination(e.target.checked)}
                      style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#333" }}><strong>Allow any destination</strong> (not recommended)</span>
                  </label>
                )}
                {newPrograms.trim() === "" && allowAnyDestination && (
                  <div style={{ marginTop: 6, padding: "6px 8px", borderRadius: 4, background: "#fff4e5", color: "#8a4b00", fontSize: 11 }}>
                    ⚠ <b>Unrestricted session:</b> whoever holds this session key can pay <b>any address</b>, up to the
                    daily / lifetime limits below. Only use for keys you fully control — never for an AI agent.
                  </div>
                )}
              </label>
              <label style={{ display: "block" }}>
                <div style={LABEL}>Expiry (days from now)</div>
                <div style={HINT}>0 = never expires.</div>
                <input type="number" min={0} value={newExpiryDays} onChange={e => setNewExpiryDays(Number(e.target.value))}
                  style={{ ...INPUT, width: 120, marginTop: 4 }} />
              </label>
              <label style={{ display: "block" }}>
                <div style={LABEL}>Max transactions per day</div>
                <div style={HINT}>0 = no limit.</div>
                <input type="number" min={0} value={newVelocityLimit} onChange={e => setNewVelocityLimit(Number(e.target.value))}
                  style={{ ...INPUT, width: 120, marginTop: 4 }} />
              </label>
              <label style={{ display: "block" }}>
                <div style={LABEL}>Daily spend limit (XNT)</div>
                <div style={HINT}>Max yield the session can spend per day. 0 = no limit.</div>
                <input type="number" min={0} step={0.001} value={newDailyLimitXnt} onChange={e => setNewDailyLimitXnt(Number(e.target.value))}
                  style={{ ...INPUT, width: 120, marginTop: 4 }} />
              </label>
              <label style={{ display: "block" }}>
                <div style={LABEL}>Lifetime spend limit (XNT)</div>
                <div style={HINT}>Total cap across the session's entire lifetime. 0 = no limit.</div>
                <input type="number" min={0} step={0.001} value={newLifetimeLimitXnt} onChange={e => setNewLifetimeLimitXnt(Number(e.target.value))}
                  style={{ ...INPUT, width: 120, marginTop: 4 }} />
              </label>
            </div>

            {newDailyLimitXnt === 0 && newLifetimeLimitXnt === 0 && (
              <div style={{ marginTop: 10, padding: "6px 8px", borderRadius: 4, background: "#fff4e5", color: "#8a4b00", fontSize: 11 }}>
                ⚠ <b>No spend cap:</b> with both limits at 0, this key can spend your entire yield balance.
              </div>
            )}
            <button onClick={handleCreateSession} style={BTN}>Create Session</button>
            {sessionStatus && <div style={STATUS}>{sessionStatus}</div>}

            {/* Show auto-generated keypair once after creation (random/non-portable mode only) */}
            {lastGenKp && (
              <div style={{ marginTop: 12, padding: 12, background: "#fff8e1", border: "1px solid #f9a825", borderRadius: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>⚠ One-Time Session keypair — copy now, not stored persistently</div>
                <div style={{ fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "#888", marginRight: 6 }}>Pubkey:</span>
                  <code style={{ fontSize: 10 }}>{lastGenKp.pubkey}</code>
                  <button style={{ ...BTN_SM, marginLeft: 6 }} onClick={() => navigator.clipboard.writeText(lastGenKp.pubkey)}>Copy</button>
                </div>
                <div style={{ fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "#888", marginRight: 6 }}>Secret (hex):</span>
                  <code style={{ fontSize: 10 }}>{lastGenKp.secret.slice(0, 20)}…</code>
                  <button style={{ ...BTN_SM, marginLeft: 6 }} onClick={() => navigator.clipboard.writeText(lastGenKp.secret)}>Copy secret</button>
                </div>
                <div style={{ fontSize: 11, color: "#c0392b" }}>
                  The dApp that holds this key can sign yield_spend without any wallet popup. Store it securely.
                </div>
                <button style={{ ...BTN_SM, marginTop: 6 }} onClick={() => setLastGenKp(null)}>Dismiss</button>
              </div>
            )}
          </div>
        </div>
        {/* ── Fund session key ──────────────────────────────────────────── */}
        <div style={CARD}>
          <h2 style={{ marginTop: 0 }}>Fund Session Key</h2>
          <p style={HINT}>
            Session keys need XNT to pay transaction fees (currently about 0.002 XNT each) when calling yield_spend.
            Transfer XNT from your main wallet to any session key address.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginTop: 10 }}>
            <label style={{ display: "block" }}>
              <div style={LABEL}>Session key address</div>
              <input value={fundTarget} onChange={e => setFundTarget(e.target.value)}
                placeholder="session pubkey" style={{ ...INPUT, width: 320, marginTop: 2 }} />
            </label>
            <label style={{ display: "block" }}>
              <div style={LABEL}>Amount (XNT)</div>
              <input type="number" min={0.001} step={0.001} value={fundXnt} onChange={e => setFundXnt(Number(e.target.value))}
                style={{ ...INPUT, width: 100, marginTop: 2 }} />
            </label>
            <button onClick={handleFundSession} style={{ ...BTN, marginTop: 0 }}>Fund</button>
          </div>
          {fundStatus && <div style={STATUS}>{fundStatus}</div>}
        </div>
              </>)}
            </div>
          </div>
        </>)}
      </main>
      {footer}
    </div>
  );
}
