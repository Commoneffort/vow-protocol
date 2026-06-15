/**
 * One-time migration: close the old ProtocolConfig account so it can be
 * re-initialized with the new layout (post pool-migration upgrade).
 * Run: npx ts-node --project tsconfig.json scripts/migrate-close-config.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, SystemProgram } from "@solana/web3.js";
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

  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const program = new anchor.Program(idl as any, provider);

  const [config] = pda.findProtocolConfig();

  const info = await connection.getAccountInfo(config);
  if (!info) {
    console.log("Config account does not exist — nothing to close.");
    return;
  }

  console.log(`Config at ${config.toBase58()} — ${info.data.length} bytes`);
  console.log("Closing old config account...");

  const sig = await program.methods
    .closeProtocolConfig()
    .accounts({ config, admin: keypair.publicKey })
    .rpc();

  console.log(`✓ Config closed. Tx: ${sig}`);

  const after = await connection.getAccountInfo(config);
  console.log(`Account after close: ${after ? after.data.length + " bytes" : "null (good)"}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
