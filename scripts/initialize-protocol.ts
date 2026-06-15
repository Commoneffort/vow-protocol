/**
 * Initialize VOW protocol on X1 testnet.
 * Run: npx ts-node --skip-project scripts/initialize-protocol.ts
 *
 * For mainnet, set SPL_STAKE_POOL and SPL_POOL_MINT env vars:
 *   SPL_STAKE_POOL=X1SPaMUM1A8E1vKL8XQAB5rxKarJbqtWFFSNFs8f7Av \
 *   SPL_POOL_MINT=pXNTyoqQsskHdZ7Q1rnP25FEyHHjissbs7n6RRN2nP5 \
 *   npx ts-node --skip-project scripts/initialize-protocol.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";
import * as pda from "../sdk/src/pda";
import idl from "../target/idl/vow.json";

const RPC = process.env.RPC ?? "https://rpc.testnet.x1.xyz";
// vow-key.json is both upgrade authority and protocol admin on mainnet.
// For testnet, override with WALLET env var.
const WALLET_PATH = process.env.WALLET ?? `${homedir()}/.config/solana/vow-key.json`;

// X1 Foundation SPL stake pool (mainnet). Pass Pubkey::default() for testnet.
const SPL_STAKE_POOL = process.env.SPL_STAKE_POOL
  ? new PublicKey(process.env.SPL_STAKE_POOL)
  : SystemProgram.programId; // default = testnet (no-op price updates)

const SPL_POOL_MINT = process.env.SPL_POOL_MINT
  ? new PublicKey(process.env.SPL_POOL_MINT)
  : SystemProgram.programId; // pXNT mint (not used on testnet)

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const secret = JSON.parse(readFileSync(WALLET_PATH, "utf8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));

  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const program = new anchor.Program(idl as any, provider);

  const [config] = pda.findProtocolConfig();
  const [reserve] = pda.findReserve();

  // Check if already initialized
  const existing = await connection.getAccountInfo(config);
  if (existing) {
    console.log("Protocol already initialized.");
    console.log(`  Config:  ${config.toBase58()}`);
    console.log(`  Reserve: ${reserve.toBase58()}`);
    return;
  }

  console.log(`Initializing protocol on ${RPC}...`);
  console.log(`  Admin:          ${keypair.publicKey.toBase58()}`);
  console.log(`  SPL Stake Pool: ${SPL_STAKE_POOL.toBase58()}`);
  console.log(`  SPL Pool Mint:  ${SPL_POOL_MINT.toBase58()}`);

  const sig = await program.methods
    .initialize(SPL_STAKE_POOL, SPL_POOL_MINT)
    .accounts({
      config,
      reserve,
      splPool: SPL_STAKE_POOL,
      admin: keypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`\n✓ Protocol initialized. Tx: ${sig}`);
  console.log(`  Config:  ${config.toBase58()}`);
  console.log(`  Reserve: ${reserve.toBase58()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
