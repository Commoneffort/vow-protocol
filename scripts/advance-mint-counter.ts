/**
 * Advance total_minted past existing VowState accounts after config reinit.
 * Run: npx ts-node --project tsconfig.json scripts/advance-mint-counter.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { homedir } from "os";
import * as pda from "../sdk/src/pda";
import idl from "../target/idl/vow.json";

const RPC = process.env.RPC ?? "https://rpc.testnet.x1.xyz";
const WALLET_PATH = process.env.WALLET ?? `${homedir()}/.config/solana/id.json`;
const PROGRAM_ID = new PublicKey("7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ");

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const secret = JSON.parse(readFileSync(WALLET_PATH, "utf8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));

  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const program = new anchor.Program(idl as any, provider);
  const [configPda] = pda.findProtocolConfig();

  const config = await (program.account as any).protocolConfig.fetch(configPda);
  console.log(`Current total_minted: ${config.totalMinted.toNumber()}`);

  // Count existing VowState accounts
  const disc = createHash("sha256").update("account:VowState").digest().slice(0, 8);
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(disc) } }],
    dataSlice: { offset: 0, length: 0 },
  });
  const needed = accounts.length;
  console.log(`VowState accounts on-chain: ${needed}`);

  if (config.totalMinted.toNumber() >= needed) {
    console.log("Counter is already correct — no action needed.");
    return;
  }

  console.log(`Advancing total_minted to ${needed}...`);
  const sig = await program.methods
    .setMintCounter(new anchor.BN(needed))
    .accounts({ config: configPda, admin: keypair.publicKey })
    .rpc();

  console.log(`✓ Done. Tx: ${sig}`);
  const after = await (program.account as any).protocolConfig.fetch(configPda);
  console.log(`New total_minted: ${after.totalMinted.toNumber()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
