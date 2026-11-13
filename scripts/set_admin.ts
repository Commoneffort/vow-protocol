/**
 * Transfer protocol admin. Both the current and the NEW admin must sign (the program
 * requires the new admin as a signer so admin can't be handed to a typo'd/unowned key).
 *
 * Run from /home/owlx1/IDNFT:
 *   npx ts-node --skip-project --compiler-options '{"resolveJsonModule":true,"esModuleInterop":true}' \
 *     scripts/set_admin.ts <current-admin-keypair.json> <new-admin-keypair.json>
 */
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import idl from "../target/idl/vow.json";

const [currentPath, newPath] = process.argv.slice(2);
if (!currentPath || !newPath) {
  console.error("usage: set_admin.ts <current-admin.json> <new-admin.json>");
  process.exit(1);
}
const load = (p: string) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
const currentAdmin = load(currentPath);
const newAdmin = load(newPath);

const RPC = process.env.RPC ?? "https://rpc.mainnet.x1.xyz";
const provider = new AnchorProvider(new Connection(RPC, "confirmed"), new Wallet(currentAdmin), { commitment: "confirmed" });
const program = new Program(idl as any, provider);

async function main() {
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const before = await (program.account as any).protocolConfig.fetch(config);
  console.log("Current admin:", before.admin.toBase58());
  console.log("New admin:    ", newAdmin.publicKey.toBase58());

  const sig = await program.methods
    .setAdmin()
    .accountsStrict({ config, admin: currentAdmin.publicKey, newAdmin: newAdmin.publicKey })
    .signers([newAdmin])
    .rpc();
  console.log("Sig:", sig);

  const after = await (program.account as any).protocolConfig.fetch(config);
  console.log("Admin is now:", after.admin.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
