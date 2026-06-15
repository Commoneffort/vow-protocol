/**
 * Flush reserve SOL to all registered pool stake accounts.
 * Permissionless crank — anyone can call this.
 * Usage: npx ts-node scripts/flush-reserve.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";
import * as pda from "../sdk/src/pda";
import idl from "../target/idl/vow.json";

const RPC = process.env.RPC ?? "https://rpc.testnet.x1.xyz";
const WALLET_PATH = process.env.WALLET ?? `${homedir()}/.config/solana/id.json`;

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const secret = JSON.parse(readFileSync(WALLET_PATH, "utf8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(keypair), { commitment: "confirmed" });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as any, provider);

  const [stakePool] = pda.findStakePool();
  const [reserve] = pda.findReserve();

  const reserveBal = await connection.getBalance(reserve);
  console.log(`Reserve balance: ${(reserveBal / 1e9).toFixed(4)} XNT`);

  // Flush to all validator pool stake accounts (split evenly via one flush each)
  const voteAccounts = JSON.parse(process.env.VOTES ?? "null") as string[] | null;
  if (!voteAccounts) {
    console.error("Set VOTES='[\"vote1\",\"vote2\"]' env var with registered vote accounts.");
    process.exit(1);
  }

  for (const v of voteAccounts) {
    const [poolStake] = pda.findPoolStake(new PublicKey(v));
    const sig = await program.methods
      .flushReserveToPool()
      .accounts({ stakePool, reserve, poolStake, systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY })
      .rpc();
    const bal = await connection.getBalance(poolStake);
    console.log(`  ✓ flushed → ${poolStake.toBase58().slice(0,8)}…  balance: ${(bal/1e9).toFixed(4)} XNT  tx: ${sig.slice(0,16)}…`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
