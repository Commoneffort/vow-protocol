import React, { useEffect, useState, useCallback } from "react";
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction, AccountMeta } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { VowClient } from "./sdk/client";
import * as pda from "./sdk/pda";
import { LAMPORTS_PER_XNT, SHARE_PRECISION } from "./sdk/types";
import idl from "./sdk/vow.json";
import { X1Wallet } from "./useX1Wallet";

const RPC = import.meta.env.VITE_RPC_URL ?? "https://rpc.mainnet.x1.xyz";
const connection = new Connection(RPC, "confirmed");
const GENESIS_PRICE = new BN("1000000000000");
// Below this, a flush costs more in network fees than it stakes (pool rounding leaves dust).
const MIN_FLUSH_LAMPORTS = 1_000_000;

const S: Record<string, React.CSSProperties> = {
  page:      { fontFamily: "monospace", padding: 24, maxWidth: 720 },
  h1:        { fontSize: 18, marginBottom: 4 },
  sub:       { color: "#888", fontSize: 12, marginBottom: 20 },
  grid2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 },
  card:      { border: "1px solid #ddd", borderRadius: 6, padding: 16, marginBottom: 16 },
  cardTitle: { fontWeight: "bold", fontSize: 13, marginBottom: 10, color: "#444" },
  row:       { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", borderBottom: "1px solid #f0f0f0" },
  label:     { color: "#888" },
  val:       { fontWeight: "bold" },
  btnBar:    { display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 10 },
  btn:       { padding: "8px 16px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 },
  btnRed:    { padding: "8px 16px", background: "#c0392b", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 },
  btnGreen:  { padding: "8px 16px", background: "#155724", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 },
  btnSm:     { padding: "3px 8px", background: "#555", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 11 },
  status:    { marginTop: 12, padding: 10, background: "#f4f4f4", fontSize: 12, borderRadius: 4, fontFamily: "monospace" },
  input:     { padding: "4px 8px", border: "1px solid #ccc", borderRadius: 3, fontSize: 12, width: 220, marginRight: 6 },
  table:     { width: "100%", borderCollapse: "collapse" as const, fontSize: 11, marginTop: 8 },
  th:        { textAlign: "left" as const, padding: "6px 8px", background: "#f5f5f5", borderBottom: "1px solid #ddd" },
  td:        { padding: "5px 8px", borderBottom: "1px solid #f5f5f5" },
};

const badge = (label: string, ok: boolean) => (
  <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: 3, fontSize: 10,
    background: ok ? "#d4edda" : "#f8d7da", color: ok ? "#155724" : "#721c24" }}>
    {label}
  </span>
);

function fmt(lamports: BN | number, dec = 4) {
  const n = typeof lamports === "number" ? lamports : lamports.toNumber();
  return (n / LAMPORTS_PER_XNT).toFixed(dec) + " XNT";
}

function fmtPrice(p: BN) {
  const pct = ((p.toNumber() / GENESIS_PRICE.toNumber()) - 1) * 100;
  return `${(p.toNumber() / 1e12).toFixed(6)}  (${pct >= 0 ? "+" : ""}${pct.toFixed(4)}% vs genesis)`;
}

function short(pk: string) { return pk.slice(0, 6) + "…" + pk.slice(-4); }

// ── Main component ─────────────────────────────────────────────────────────────

interface AppEntry {
  programId: string;
  pda: string;
  verified: boolean;
  blocked: boolean;
}

export default function Admin({ wallet }: { wallet: X1Wallet | null }) {
  const [config, setConfig] = useState<any>(null);
  const [reserveBalance, setReserveBalance] = useState<number>(0);
  const [reserveRent, setReserveRent] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [newAdmin, setNewAdmin] = useState<string>("");
  const [appProgId, setAppProgId] = useState<string>("");
  const [appList, setAppList] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [simGain, setSimGain] = useState<string>("10");
  const [poolTokenBalance, setPoolTokenBalance] = useState<number | null>(null);

  const isAdmin = !!(wallet?.publicKey && config?.admin === wallet.publicKey.toBase58());

  const getProgram = useCallback(() => {
    if (!wallet?.publicKey) return null;
    const provider = new AnchorProvider(
      connection,
      { publicKey: wallet.publicKey, signTransaction: wallet.signTransaction!, signAllTransactions: wallet.signAllTransactions! },
      { commitment: "confirmed" }
    );
    return new Program(idl as any, provider);
  }, [wallet]);

  const loadConfig = useCallback(async () => {
    try {
      const prog = new Program(idl as any, new AnchorProvider(connection, { publicKey: PublicKey.default, signTransaction: async (t) => t, signAllTransactions: async (t) => t }, {}));
      const [configPda] = pda.findProtocolConfig();
      const [reservePda] = pda.findReserve();
      const cfg = await prog.account.protocolConfig.fetch(configPda);
      setConfig({ ...cfg, admin: cfg.admin.toBase58() });
      const bal = await connection.getBalance(reservePda);
      setReserveBalance(bal);
      setReserveRent(await connection.getMinimumBalanceForRentExemption(0));
      // Load pool token balance if SPL pool is configured
      const splPool = (cfg as any).splStakePool as PublicKey;
      const poolMint = (cfg as any).splPoolMint as PublicKey;
      if (splPool.toBase58() !== "11111111111111111111111111111111") {
        try {
          const reservePoolTokens = pda.findReservePoolTokens(poolMint);
          const tokenInfo = await connection.getTokenAccountBalance(reservePoolTokens);
          setPoolTokenBalance(Number(tokenInfo.value.amount));
        } catch (_) { setPoolTokenBalance(0); }
      }
    } catch (e: any) {
      setStatusMsg("Error loading config: " + e.message);
    }
  }, []);

  /** Reads the SPL pool account data to extract reserve_stake and manager_fee_account. */
  async function getSplPoolAccounts() {
    if (!config) throw new Error("Config not loaded");
    const splPool = config.splStakePool as PublicKey;
    const poolMint = config.splPoolMint as PublicKey;
    const poolInfo = await connection.getAccountInfo(splPool);
    if (!poolInfo || poolInfo.data.length < 227) throw new Error("Could not fetch SPL pool account");
    const data = poolInfo.data;
    // X1 StakePool layout: version(1) account_type(1) manager(32) staker(32) stake_deposit_authority(32)
    // bump(1) validator_list(32) reserve_stake@131(32) pool_mint@163(32) manager_fee@195(32)
    const poolReserveStake = new PublicKey(data.slice(131, 163));
    const poolManagerFeeAccount = new PublicKey(data.slice(195, 227));
    const poolWithdrawAuthority = pda.findPoolWithdrawAuthority(splPool);
    return {
      splPool,
      poolWithdrawAuthority,
      poolReserveStake,
      poolManagerFeeAccount,
      poolReferralFeeAccount: pda.findReservePoolTokens(poolMint), // pinned on-chain to our own ATA
      poolMint,
      stakePoolProgram: pda.SPL_STAKE_POOL_PROGRAM_ID,
    };
  }

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const status = (msg: string) => setStatusMsg(`[${new Date().toISOString()}] ${msg}`);

  async function handleSetAdmin() {
    // set_admin now requires the NEW admin to co-sign (prevents handing admin to a
    // typo'd / unowned key). A browser wallet can't sign for a second key, so admin
    // transfer is done with scripts/set_admin.ts, which loads both keypairs.
    status("Admin transfer requires both the current and new admin to sign. " +
      "Run: npx ts-node scripts/set_admin.ts <current-admin.json> <new-admin.json>");
  }

  async function handleRegisterApp() {
    const prog = getProgram(); if (!prog || !wallet?.publicKey) return;
    try {
      const appKey = new PublicKey(appProgId);
      const [appRegistry] = pda.findAppRegistry(appKey);
      setLoading(true);
      await prog.methods.registerApp(appKey).accounts({
        appRegistry, payer: wallet.publicKey, systemProgram: SystemProgram.programId,
      }).rpc();
      status("App registered: " + appKey.toBase58());
      setAppProgId("");
      await loadApps();
    } catch (e: any) { status("Error: " + e.message); } finally { setLoading(false); }
  }

  async function handleVerifyApp(programId: string) {
    const prog = getProgram(); if (!prog || !wallet?.publicKey) return;
    try {
      const appKey = new PublicKey(programId);
      const [appRegistry] = pda.findAppRegistry(appKey);
      const [configPda] = pda.findProtocolConfig();
      setLoading(true);
      await prog.methods.verifyApp().accounts({ appRegistry, config: configPda, admin: wallet.publicKey }).rpc();
      status("App verified.");
      await loadApps();
    } catch (e: any) { status("Error: " + e.message); } finally { setLoading(false); }
  }

  async function handleBlockApp(programId: string) {
    const prog = getProgram(); if (!prog || !wallet?.publicKey) return;
    try {
      const appKey = new PublicKey(programId);
      const [appRegistry] = pda.findAppRegistry(appKey);
      const [configPda] = pda.findProtocolConfig();
      setLoading(true);
      await prog.methods.blockApp().accounts({ appRegistry, config: configPda, admin: wallet.publicKey }).rpc();
      status("App blocked.");
      await loadApps();
    } catch (e: any) { status("Error: " + e.message); } finally { setLoading(false); }
  }

  async function handleDevSetSharePrice() {
    const prog = getProgram(); if (!prog || !wallet?.publicKey) return;
    const gainPct = parseFloat(simGain);
    if (isNaN(gainPct) || gainPct < 0) { status("Enter a valid gain % (e.g. 10)"); return; }
    // new_price = 1e12 * (1 + gainPct/100)
    const newPriceNum = Math.round(1e12 * (1 + gainPct / 100));
    const newPrice = new BN(newPriceNum.toString());
    try {
      setLoading(true);
      const provider = new AnchorProvider(
        connection,
        { publicKey: wallet.publicKey, signTransaction: wallet.signTransaction!, signAllTransactions: wallet.signAllTransactions! },
        { commitment: "confirmed" }
      );
      const client = new VowClient(provider);
      const sig = await client.devSetSharePrice(newPrice);
      status(`Share price set to +${gainPct}% (${newPriceNum}). Sig: ${sig.slice(0, 20)}… — Now go to main page and click Harvest.`);
      await loadConfig();
    } catch (e: any) { status("Error: " + e.message); } finally { setLoading(false); }
  }

  /** Creates the reserve's pXNT ATA using X1's ATA program if it doesn't exist yet. */
  async function ensureReserveAta(poolMint: PublicKey): Promise<void> {
    const [reserve] = pda.findReserve();
    const ataAddr = pda.findReservePoolTokens(poolMint);
    const existing = await connection.getAccountInfo(ataAddr);
    if (existing) return;
    if (!wallet?.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");
    const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    // createAssociatedTokenAccount instruction: payer, ata, owner, mint, systemProgram, tokenProgram
    const keys: AccountMeta[] = [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: ataAddr,           isSigner: false, isWritable: true },
      { pubkey: reserve,           isSigner: false, isWritable: false },
      { pubkey: poolMint,          isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM,     isSigner: false, isWritable: false },
    ];
    const ix = new TransactionInstruction({ keys, programId: pda.ASSOCIATED_TOKEN_PROGRAM_ID, data: Buffer.alloc(0) });
    const tx = new Transaction().add(ix);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = wallet.publicKey;
    const signed = await wallet.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig, "confirmed");
    status(`Reserve token account created. Sig: ${sig.slice(0, 20)}…`);
  }

  function makeClient() {
    return new VowClient(new AnchorProvider(
      connection,
      { publicKey: wallet!.publicKey!, signTransaction: wallet!.signTransaction!, signAllTransactions: wallet!.signAllTransactions! },
      { commitment: "confirmed" }
    ));
  }

  /** Fresh on-chain reserve position, read immediately before a crank. */
  async function readReserve(client: VowClient) {
    const [cfg, bal, rent] = await Promise.all([
      client.getProtocolConfig(),
      connection.getBalance(pda.findReserve()[0], "confirmed"),
      connection.getMinimumBalanceForRentExemption(0),
    ]);
    const required = rent + Number(cfg.totalYieldClaims.toString()) + Number(cfg.totalPendingUnstake.toString());
    return { idle: Math.max(0, bal - required), short: Math.max(0, required - bal) };
  }

  async function handleUpdateSharePrice() {
    if (!wallet?.publicKey) return;
    try {
      setLoading(true);
      const client = makeClient();
      const oldPrice = (await client.getProtocolConfig()).currentSharePrice.toNumber();
      const sig = await client.updateSharePrice();
      await loadConfig();
      const newPrice = (await client.getProtocolConfig()).currentSharePrice.toNumber();
      const delta = newPrice - oldPrice;
      status(`Share price (NAV) updated: ${(newPrice / 1e12).toFixed(8)} (${delta >= 0 ? "+" : ""}${delta}). Sig: ${sig?.slice(0, 20) ?? "n/a"}…`);
    } catch (e: any) { status("Error: " + e.message); } finally { setLoading(false); }
  }

  async function handleWithdrawFromPool() {
    if (!wallet?.publicKey) return;
    try {
      setLoading(true);
      const client = makeClient();
      const { short } = await readReserve(client);
      if (short === 0) {
        status("Nothing to cover: the reserve already holds everything it owes. No transaction sent.");
        await loadConfig();
        return;
      }
      await client.ensureLiquidity();
      status(`Covered a ${fmt(short, 6)} shortfall by redeeming pXNT. The reserve now holds everything it owes.`);
      await loadConfig();
    } catch (e: any) { status("Error: " + e.message); } finally { setLoading(false); }
  }

  async function handleFlushReserveToPool() {
    if (!wallet?.publicKey) return;
    try {
      setLoading(true);
      const provider = new AnchorProvider(
        connection,
        { publicKey: wallet.publicKey, signTransaction: wallet.signTransaction!, signAllTransactions: wallet.signAllTransactions! },
        { commitment: "confirmed" }
      );
      const client = new VowClient(provider);
      // The program succeeds without moving anything when nothing is idle, so check first.
      const { idle } = await readReserve(client);
      if (idle < MIN_FLUSH_LAMPORTS) {
        status("Nothing to flush: all reserve XNT is owed to users or required for rent. No transaction sent.");
        await loadConfig();
        return;
      }
      const poolAccounts = await getSplPoolAccounts();
      // Create reserve pXNT ATA with X1's ATA program if it doesn't exist yet
      await ensureReserveAta(poolAccounts.poolMint);
      const sig = await client.flushReserveToPool(poolAccounts);
      status(`Flushed ${fmt(idle, 6)} of idle XNT to the stake pool. Sig: ${sig.slice(0, 20)}…`);
      await loadConfig();
    } catch (e: any) { status("Error: " + e.message); } finally { setLoading(false); }
  }


  async function loadApps() {
    try {
      const prog = new Program(idl as any, new AnchorProvider(connection, { publicKey: PublicKey.default, signTransaction: async (t) => t, signAllTransactions: async (t) => t }, {}));
      const accounts = await prog.account.appRegistry.all();
      setAppList(accounts.map((a: any) => ({
        programId: a.account.programId.toBase58(),
        pda: a.publicKey.toBase58(),
        verified: a.account.verified,
        blocked: a.account.blocked,
      })));
    } catch (_) {}
  }

  useEffect(() => { loadApps(); }, []);

  const owedYield = Number(config?.totalYieldClaims?.toString() ?? 0);
  const owedUnstake = Number(config?.totalPendingUnstake?.toString() ?? 0);
  const reserveLoaded = !!config && reserveRent !== null;
  const reserveRequired = (reserveRent ?? 0) + owedYield + owedUnstake;
  const idleLamports = reserveLoaded ? Math.max(0, reserveBalance - reserveRequired) : 0;
  const shortLamports = reserveLoaded ? Math.max(0, reserveRequired - reserveBalance) : 0;
  const canFlush = idleLamports >= MIN_FLUSH_LAMPORTS;

  return (
    <div style={S.page}>
      <div style={S.h1}>Vow Protocol</div>
      <div style={S.sub}>Program: 7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ</div>

      {!wallet?.publicKey && (
        <div style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
          Connect your wallet to manage the protocol.
        </div>
      )}

      {/* Protocol Status */}
      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.cardTitle}>Protocol Config</div>
          {config ? (<>
            <div style={S.row}><span style={S.label}>Admin</span><span style={S.val}>{short(config.admin)}</span></div>
            <div style={S.row}><span style={S.label}>Total Minted</span><span style={S.val}>{config.totalMinted?.toString()}</span></div>
            <div style={S.row}><span style={S.label}>Share Price</span><span style={S.val}>{fmtPrice(config.currentSharePrice)}</span></div>
            <div style={S.row}><span style={S.label}>Total Shares</span><span style={S.val}>{(Number(config.totalShares?.toString() ?? 0) / 1e9).toFixed(4)}</span></div>
            <div style={S.row}><span style={S.label}>Price Epoch</span><span style={S.val}>{config.priceEpoch?.toString() === "0" ? "halted / not synced" : config.priceEpoch?.toString()}</span></div>
            <div style={S.row}><span style={S.label}>Pool Fees (in / out)</span><span style={S.val}>{((config.depositFeePpm ?? 0) / 1e4).toFixed(2)}% / {((config.withdrawalFeePpm ?? 0) / 1e4).toFixed(2)}%</span></div>
            <div style={S.row}><span style={S.label}>Yield Balances Owed</span><span style={S.val}>{config.totalYieldClaims ? fmt(config.totalYieldClaims) : "0 XNT"}</span></div>
            <div style={S.row}><span style={S.label}>Stake Pool</span><span style={S.val}>{config.splStakePool?.toBase58() === "11111111111111111111111111111111" ? "testnet (no-op)" : short(config.splStakePool?.toBase58())}</span></div>
            <div style={S.row}><span style={S.label}>Pending Unstake</span><span style={S.val}>{config.totalPendingUnstake ? fmt(config.totalPendingUnstake) : "0 XNT"}</span></div>
          </>) : <div style={{ fontSize: 12, color: "#888" }}>Loading…</div>}
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>Reserve</div>
          <div style={S.row}><span style={S.label}>Liquid XNT</span><span style={S.val}>{fmt(reserveBalance, 6)}</span></div>
          {reserveLoaded && (<>
            <div style={S.row}><span style={S.label}>Owed to users (yield)</span><span style={S.val}>{fmt(owedYield, 6)}</span></div>
            <div style={S.row}><span style={S.label}>Pending unstakes</span><span style={S.val}>{fmt(owedUnstake, 6)}</span></div>
            <div style={S.row}><span style={S.label}>Rent reserve</span><span style={S.val}>{fmt(reserveRent!, 6)}</span></div>
            <div style={S.row}><span style={S.label}>Idle (can be flushed)</span><span style={S.val}>{fmt(idleLamports, 6)}</span></div>
            {shortLamports > 0 && (
              <div style={S.row}><span style={{ ...S.label, color: "#8a4b00" }}>Short (redeem from pXNT)</span><span style={{ ...S.val, color: "#8a4b00" }}>{fmt(shortLamports, 6)}</span></div>
            )}
          </>)}
          {poolTokenBalance !== null && (
            <div style={S.row}><span style={S.label}>Staked (pXNT)</span><span style={S.val}>{(poolTokenBalance / 1e9).toFixed(4)} pXNT</span></div>
          )}
          <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
            Liquid XNT pays yield balances, pending unstakes, and rent first. Only the idle amount can be staked.
            {shortLamports > 0 && " A short amount is covered by redeeming pXNT, and does not mean funds are missing."}
            {" "}pXNT is staked in the X1 pool and earns yield.
          </div>
        </div>
      </div>

      {/* SPL Pool Management — mainnet only */}
      {config?.splStakePool?.toBase58?.() !== "11111111111111111111111111111111" && (
        <div style={{ ...S.card, border: "1px solid #001d6e", background: "#f0f4ff" }}>
          <div style={{ ...S.cardTitle, color: "#001d6e" }}>Stake Pool Management</div>
          <div style={{ fontSize: 11, color: "#444", marginBottom: 12 }}>
            <b>Flush</b> deposits only <i>idle</i> reserve XNT into the X1 Foundation stake pool, receiving pXNT that
            earns staking yield. XNT backing yield balances and pending unstakes always stays liquid.<br/>
            <b>Cover liabilities</b> redeems just enough pXNT when the reserve can't cover what is owed (the SDK also
            does this automatically before <code>complete_unstake</code> / <code>withdraw_yield</code>).
          </div>
          <div style={S.btnBar}>
            <button style={{ ...S.btn, background: "#1a6b2a" }} onClick={handleUpdateSharePrice} disabled={loading}>
              Update Share Price
            </button>
            <button style={{ ...S.btn, background: "#001d6e", opacity: canFlush ? 1 : 0.45, cursor: canFlush ? "pointer" : "not-allowed" }}
              onClick={handleFlushReserveToPool} disabled={loading || !canFlush}>
              {!reserveLoaded ? "Flush Reserve → Pool" : canFlush ? `Flush ${fmt(idleLamports, 6)} → Pool` : "Nothing to flush"}
            </button>
            <button style={{ ...S.btn, background: "#6b3a1a", opacity: shortLamports > 0 ? 1 : 0.45, cursor: shortLamports > 0 ? "pointer" : "not-allowed" }}
              onClick={handleWithdrawFromPool} disabled={loading || shortLamports === 0}>
              {!reserveLoaded ? "Cover Liabilities" : shortLamports > 0 ? `Cover ${fmt(shortLamports, 6)} shortfall` : "Nothing to cover"}
            </button>
          </div>
        </div>
      )}

      {/* Transfer Admin */}
      {isAdmin && (
        <div style={S.card}>
          <div style={S.cardTitle}>Transfer Admin</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input style={S.input} placeholder="New admin pubkey" value={newAdmin}
              onChange={e => setNewAdmin(e.target.value)} />
            <button style={S.btn} onClick={handleSetAdmin} disabled={loading || !newAdmin}>
              Transfer Admin
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#c0392b", marginTop: 6 }}>
            ⚠ The new admin must co-sign — use <code>scripts/set_admin.ts</code> (needs both keypairs).
          </div>
        </div>
      )}

      {/* App Registry */}
      <div style={S.card}>
        <div style={S.cardTitle}>App Registry</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input style={S.input} placeholder="Program ID to register" value={appProgId}
            onChange={e => setAppProgId(e.target.value)} />
          <button style={S.btn} onClick={handleRegisterApp} disabled={loading || !appProgId || !wallet?.publicKey}>
            Register
          </button>
        </div>
        {appList.length === 0 ? (
          <div style={{ fontSize: 12, color: "#888" }}>No apps registered yet.</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {["Program ID", "Status", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {appList.map(app => (
                <tr key={app.programId}>
                  <td style={S.td}>
                    <a href={`https://explorer.x1.xyz/address/${app.programId}`} target="_blank" rel="noreferrer">
                      {short(app.programId)}
                    </a>
                  </td>
                  <td style={S.td}>
                    {app.blocked ? badge("blocked", false) : app.verified ? badge("verified", true) : badge("unverified", false)}
                  </td>
                  <td style={S.td}>
                    {isAdmin && !app.verified && !app.blocked && (
                      <button style={{ ...S.btnSm, marginRight: 4 }} onClick={() => handleVerifyApp(app.programId)} disabled={loading}>
                        Verify
                      </button>
                    )}
                    {isAdmin && !app.blocked && (
                      <button style={{ ...S.btnSm, background: "#721c24" }} onClick={() => handleBlockApp(app.programId)} disabled={loading}>
                        Block
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dev Tools — testnet only (hidden when real SPL pool is configured) */}
      {isAdmin && config?.splStakePool?.toBase58?.() === "11111111111111111111111111111111" && (
        <div style={{ ...S.card, border: "1px solid #f4b942", background: "#fffdf4" }}>
          <div style={{ ...S.cardTitle, color: "#7a4a00" }}>Dev Tools — Testnet Only</div>
          <div style={{ fontSize: 11, color: "#7a4a00", marginBottom: 10 }}>
            Simulate yield accumulation by manually setting the share price above genesis (1.000000).
            On mainnet this is blocked — the real SPL pool drives the price automatically.
          </div>
          <div style={{ fontSize: 12, marginBottom: 10 }}>
            <b>Flow:</b> Set price here → go to main page → click <b>Harvest</b> →
            yield_balance is credited → dApp demo executes a real on-chain yield_spend.
            <br/>
            <span style={{ color: "#888", fontSize: 11 }}>Note: Compound mode accumulates shares, not yield_balance. Switch to Treasury or Hybrid if you want yield_balance.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, whiteSpace: "nowrap" as const }}>Simulated gain %</span>
            <input style={{ ...S.input, width: 80 }} type="number" min="0" max="9999" step="1"
              value={simGain} onChange={e => setSimGain(e.target.value)} />
            <button style={{ ...S.btn, background: "#7a4a00" }} onClick={handleDevSetSharePrice} disabled={loading}>
              Set Share Price
            </button>
          </div>
          {config?.currentSharePrice && (
            <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
              Current: {fmtPrice(config.currentSharePrice)}
            </div>
          )}
        </div>
      )}

      {statusMsg && <div style={S.status}>{statusMsg}</div>}
    </div>
  );
}
