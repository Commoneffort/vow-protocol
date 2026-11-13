/**
 * One-time post-upgrade migration: create OwnerIndex ["owner_index", owner] for every
 * wallet that minted before one-identity-per-wallet was enforced. The lowest-nonce
 * (oldest) identity becomes the wallet's canonical identity; any extra legacy
 * identities stay valid (grandfathered) but the wallet can't mint more.
 *
 * Permissionless — the payer only covers rent. Dry run by default; pass --execute.
 *
 *   npx ts-node --skip-project --compiler-options '{"resolveJsonModule":true,"esModuleInterop":true,"target":"es2020"}' \
 *     scripts/backfill-owner-index.ts [--execute]
 */
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import idl from "../target/idl/vow.json";

const RPC = process.env.RPC ?? "https://rpc.mainnet.x1.xyz";
const WALLET_PATH = process.env.PAYER ?? process.env.HOME + "/.config/solana/vow-key.json";
const execute = process.argv.includes("--execute");

async function main() {
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8"))));
  const connection = new Connection(RPC, "confirmed");
  const program = new Program(idl as any, new AnchorProvider(connection, new Wallet(payer), { commitment: "confirmed" }));
  const acct = program.account as any;

  const states = (await acct.vowState.all()) as { publicKey: PublicKey; account: any }[];
  const canonical = new Map<string, { publicKey: PublicKey; nonce: bigint; count: number }>();
  for (const s of states) {
    const owner = s.account.owner.toBase58();
    const nonce = BigInt(s.account.nonce.toString());
    const cur = canonical.get(owner);
    if (!cur) canonical.set(owner, { publicKey: s.publicKey, nonce, count: 1 });
    else {
      cur.count++;
      if (nonce < cur.nonce) Object.assign(cur, { publicKey: s.publicKey, nonce });
    }
  }

  for (const [owner, c] of Array.from(canonical.entries())) {
    const [ownerIndex] = PublicKey.findProgramAddressSync(
      [Buffer.from("owner_index"), new PublicKey(owner).toBuffer()], program.programId);
    if (await connection.getAccountInfo(ownerIndex)) {
      console.log(`${owner}: already indexed`);
      continue;
    }
    console.log(`${owner}: ${c.count} identit${c.count === 1 ? "y" : "ies"}; canonical = #${c.nonce} ${c.publicKey.toBase58()}`);
    if (!execute) continue;
    const sig = await program.methods.backfillOwnerIndex()
      .accountsStrict({ vowState: c.publicKey, ownerIndex, payer: payer.publicKey, systemProgram: SystemProgram.programId })
      .rpc();
    console.log(`  backfilled. Sig: ${sig}`);
  }
  if (!execute) console.log("\nDry run. Re-run with --execute to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
