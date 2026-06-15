/**
 * Transfer protocol admin from id.json to vow-key.json.
 * Run from /home/owlx1/IDNFT:
 *   npx ts-node --skip-project --compiler-options '{"resolveJsonModule":true,"esModuleInterop":true}' scripts/set_admin.ts
 */
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import idl from "../target/idl/vow.json";

const RPC = "https://rpc.mainnet.x1.xyz";
const connection = new Connection(RPC, "confirmed");

const currentAdmin = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8")))
);
const newAdminKey = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/vow-key.json", "utf-8")))
);

const provider = new AnchorProvider(connection, new Wallet(currentAdmin), { commitment: "confirmed" });
const program = new Program(idl as any, provider);

async function main() {
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);

  const before = await (program.account as any).protocolConfig.fetch(config);
  console.log("Current admin:", (before as any).admin.toBase58());
  console.log("New admin:    ", newAdminKey.publicKey.toBase58());

  const sig = await program.methods
    .setAdmin()
    .accounts({
      config,
      admin: currentAdmin.publicKey,
      newAdmin: newAdminKey.publicKey,
    })
    .rpc();

  console.log("Sig:", sig);

  const after = await (program.account as any).protocolConfig.fetch(config);
  console.log("Admin is now:", (after as any).admin.toBase58());
}

main().catch(console.error);
