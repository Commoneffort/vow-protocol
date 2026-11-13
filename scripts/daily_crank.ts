/**
 * Daily protocol crank (systemd: vow-crank.timer → vow-crank.service, 06:00 UTC).
 *   1. update_share_price   — NAV price from reserve + pXNT position + pool state
 *   2. flush_reserve_to_pool — deposit IDLE reserve SOL (owed SOL stays liquid)
 *   3. withdraw_from_pool    — if the reserve can't cover yield balances + pending
 *                              unstakes, redeem just enough pXNT (retries through the
 *                              stake program's EpochRewardsActive window)
 *
 * Works against both the pre-2026-11 program and the upgraded one: extra accounts are
 * ignored by the old program, and step 3 is non-fatal.
 *
 * Run: npx ts-node --skip-project \
 *        --compiler-options '{"resolveJsonModule":true,"esModuleInterop":true}' \
 *        scripts/daily_crank.ts
 */
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import idl from "../target/idl/vow.json";

const RPC = process.env.RPC ?? "https://rpc.mainnet.x1.xyz";
const WALLET_PATH = process.env.CRANK_WALLET ?? process.env.HOME + "/.config/solana/vow-key.json";
const SPL_STAKE_POOL_PROGRAM = new PublicKey("XPoo1Fx6KNgeAzFcq2dPTo95bWGUSj5KdPVqYj9CZux");
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"); // X1's ATA program
const CLOCK = new PublicKey("SysvarC1ock11111111111111111111111111111111");
const STAKE_HISTORY = new PublicKey("SysvarStakeHistory1111111111111111111111111");
const STAKE_PROGRAM = new PublicKey("Stake11111111111111111111111111111111111111");

const log = (msg: string) => process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  log("=== Vow Protocol Daily Crank ===");
  const connection = new Connection(RPC, "confirmed");
  const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8"))));
  const provider = new AnchorProvider(connection, new Wallet(keypair), { commitment: "confirmed" });
  const program = new Program(idl as any, provider);
  const acct = program.account as any;

  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const [reserve] = PublicKey.findProgramAddressSync([Buffer.from("reserve")], program.programId);
  const cfg = await acct.protocolConfig.fetch(config);
  const splPool = cfg.splStakePool as PublicKey;
  const poolMint = cfg.splPoolMint as PublicKey;
  if (splPool.equals(SystemProgram.programId)) {
    log("No SPL pool configured (testnet). Exiting.");
    return;
  }

  const [reservePoolTokens] = PublicKey.findProgramAddressSync(
    [reserve.toBuffer(), TOKEN_PROGRAM.toBuffer(), poolMint.toBuffer()], ATA_PROGRAM);
  const [poolWithdrawAuthority] = PublicKey.findProgramAddressSync(
    [splPool.toBuffer(), Buffer.from("withdraw")], SPL_STAKE_POOL_PROGRAM);
  const poolData = (await connection.getAccountInfo(splPool))!.data;
  const poolReserveStake = new PublicKey(poolData.subarray(131, 163));
  const poolManagerFeeAccount = new PublicKey(poolData.subarray(195, 227));
  const rent = await connection.getMinimumBalanceForRentExemption(0);

  // ── 1. update_share_price ────────────────────────────────────────────────
  const oldPrice = Number(cfg.currentSharePrice.toString());
  try {
    const sig = await program.methods.updateSharePrice()
      .accountsStrict({ config, splPool, reserve, reservePoolTokens, tokenProgram: TOKEN_PROGRAM })
      .rpc();
    const newPrice = Number((await acct.protocolConfig.fetch(config)).currentSharePrice.toString());
    log(`update_share_price OK: ${oldPrice / 1e12} → ${newPrice / 1e12}. Sig: ${sig}`);
  } catch (e: any) {
    log(`update_share_price ERROR (non-fatal): ${e.message}`);
  }

  // ── 2. flush idle SOL ────────────────────────────────────────────────────
  const owed = async () => {
    const c = await acct.protocolConfig.fetch(config);
    return Number(c.totalYieldClaims.toString()) + Number((c.totalPendingUnstake ?? 0).toString());
  };
  const reserveLamports = await connection.getBalance(reserve);
  const idle = reserveLamports - rent - (await owed());
  log(`Reserve ${reserveLamports} lamports; owed ${await owed()}; idle ${idle}`);
  if (idle > 0) {
    try {
      const sig = await program.methods.flushReserveToPool()
        .accountsStrict({
          config, reserve, reservePoolTokens, splPool, poolWithdrawAuthority, poolReserveStake,
          poolManagerFeeAccount, poolReferralFeeAccount: reservePoolTokens, poolMint,
          tokenProgram: TOKEN_PROGRAM, systemProgram: SystemProgram.programId,
          stakePoolProgram: SPL_STAKE_POOL_PROGRAM,
        })
        .rpc();
      log(`flush_reserve_to_pool OK. Sig: ${sig}`);
    } catch (e: any) {
      log(`flush_reserve_to_pool ERROR: ${e.message}`);
      process.exitCode = 1;
    }
  } else {
    log("No idle SOL to flush.");
  }

  // ── 3. keep owed SOL liquid ──────────────────────────────────────────────
  for (let attempt = 0; attempt < 30; attempt++) {
    const need = rent + (await owed());
    const have = await connection.getBalance(reserve, "confirmed");
    if (have >= need) {
      log(`Reserve covers all obligations (${have} ≥ ${need}).`);
      break;
    }
    try {
      const sig = await program.methods.withdrawFromPool()
        .accountsStrict({
          config, reserve, reservePoolTokens, splPool, poolWithdrawAuthority, poolReserveStake,
          poolManagerFeeAccount, poolMint, clock: CLOCK, stakeHistory: STAKE_HISTORY,
          stakeProgram: STAKE_PROGRAM, tokenProgram: TOKEN_PROGRAM, stakePoolProgram: SPL_STAKE_POOL_PROGRAM,
        })
        .rpc();
      log(`withdraw_from_pool OK (short ${need - have}). Sig: ${sig}`);
    } catch (e: any) {
      if (String(e).includes("0x10")) { // EpochRewardsActive — stake withdrawals paused briefly
        log("Stake program in epoch-rewards window; retrying in 20s…");
        await sleep(20_000);
        continue;
      }
      log(`withdraw_from_pool ERROR (non-fatal; pre-upgrade program needs an UnstakeEscrow): ${e.message}`);
      break;
    }
  }

  log("=== Done ===");
}

main().catch((e) => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
