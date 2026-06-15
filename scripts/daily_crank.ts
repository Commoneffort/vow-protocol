/**
 * Daily protocol crank.
 * 1. update_share_price — reads X1 Foundation SPL pool ratio, updates config.current_share_price
 * 2. flush_reserve_to_pool — deposits idle reserve SOL into pool to earn yield
 *
 * Run: npx ts-node --skip-project \
 *        --compiler-options '{"resolveJsonModule":true,"esModuleInterop":true}' \
 *        scripts/daily_crank.ts
 *
 * Designed to be called from a systemd timer. Logs to stdout (journald captures it).
 */
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import idl from "../target/idl/vow.json";

const RPC = "https://rpc.mainnet.x1.xyz";
const WALLET_PATH = process.env.HOME + "/.config/solana/vow-key.json";
const SPL_STAKE_POOL_PROGRAM = new PublicKey("XPoo1Fx6KNgeAzFcq2dPTo95bWGUSj5KdPVqYj9CZux");
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`);
}

function findReservePoolWithdrawAuthority(splPool: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [splPool.toBuffer(), Buffer.from("withdraw")],
    SPL_STAKE_POOL_PROGRAM
  );
  return pda;
}

function findReservePoolTokens(reserve: PublicKey, poolMint: PublicKey): PublicKey {
  // X1 uses non-standard ATA program: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
  const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
  const [ata] = PublicKey.findProgramAddressSync(
    [reserve.toBuffer(), TOKEN_PROGRAM.toBuffer(), poolMint.toBuffer()],
    ATA_PROGRAM
  );
  return ata;
}

async function main() {
  log("=== Vow Protocol Daily Crank ===");

  const connection = new Connection(RPC, "confirmed");
  const secret = JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
  const provider = new AnchorProvider(connection, new Wallet(keypair), { commitment: "confirmed" });
  const program = new Program(idl as any, provider);

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const [reservePda] = PublicKey.findProgramAddressSync([Buffer.from("reserve")], program.programId);

  const config = await (program.account as any).protocolConfig.fetch(configPda);
  const splPool = config.splStakePool as PublicKey;
  const poolMint = config.splPoolMint as PublicKey;

  if (splPool.toBase58() === "11111111111111111111111111111111") {
    log("No SPL pool configured (testnet). Exiting.");
    process.exit(0);
  }

  const oldPrice = (config.currentSharePrice as any).toString();
  log(`Current share price: ${oldPrice} (${Number(oldPrice) / 1e12})`);

  // ── Step 1: update_share_price ─────────────────────────────────────────────

  log("Calling update_share_price…");
  try {
    const sig1 = await program.methods
      .updateSharePrice()
      .accounts({ config: configPda, splPool })
      .rpc();
    log(`update_share_price OK. Sig: ${sig1}`);

    const updated = await (program.account as any).protocolConfig.fetch(configPda);
    const newPrice = (updated.currentSharePrice as any).toString();
    const delta = Number(newPrice) - Number(oldPrice);
    log(`New share price: ${newPrice} (${Number(newPrice) / 1e12}), delta: ${delta >= 0 ? "+" : ""}${delta}`);
  } catch (e: any) {
    log(`update_share_price ERROR: ${e.message}`);
    // Non-fatal — continue to flush
  }

  // ── Step 2: flush_reserve_to_pool ─────────────────────────────────────────

  const reserveLamports = await connection.getBalance(reservePda);
  const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
  const flushable = reserveLamports - rentExempt;
  log(`Reserve balance: ${reserveLamports} lamports, flushable: ${flushable}`);

  if (flushable <= 0) {
    log("Reserve has no idle SOL to flush. Skipping.");
    log("=== Done ===");
    process.exit(0);
  }

  // Read pool accounts from pool data
  const poolInfo = await connection.getAccountInfo(splPool);
  if (!poolInfo || poolInfo.data.length < 227) {
    log("ERROR: Could not fetch SPL pool account data.");
    process.exit(1);
  }
  const poolData = poolInfo.data;
  const poolReserveStake = new PublicKey(poolData.slice(131, 163));
  const poolManagerFeeAccount = new PublicKey(poolData.slice(195, 227));
  const poolWithdrawAuthority = findReservePoolWithdrawAuthority(splPool);
  const reservePoolTokens = findReservePoolTokens(reservePda, poolMint);

  log(`Pool reserve stake:   ${poolReserveStake.toBase58()}`);
  log(`Pool manager fee:     ${poolManagerFeeAccount.toBase58()}`);
  log(`Pool withdraw auth:   ${poolWithdrawAuthority.toBase58()}`);
  log(`Reserve pXNT ATA:     ${reservePoolTokens.toBase58()}`);

  log("Calling flush_reserve_to_pool…");
  try {
    const sig2 = await program.methods
      .flushReserveToPool()
      .accounts({
        config: configPda,
        reserve: reservePda,
        reservePoolTokens,
        splPool,
        poolWithdrawAuthority,
        poolReserveStake,
        poolManagerFeeAccount,
        poolReferralFeeAccount: poolManagerFeeAccount,
        poolMint,
        tokenProgram: TOKEN_PROGRAM,
        systemProgram: new PublicKey("11111111111111111111111111111111"),
        stakePoolProgram: SPL_STAKE_POOL_PROGRAM,
      })
      .rpc();
    log(`flush_reserve_to_pool OK. Flushed ${flushable} lamports. Sig: ${sig2}`);
  } catch (e: any) {
    log(`flush_reserve_to_pool ERROR: ${e.message}`);
    process.exit(1);
  }

  log("=== Done ===");
}

main().catch((e) => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
