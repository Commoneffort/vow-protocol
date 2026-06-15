/**
 * Register validators in the xNFT stake pool.
 * Usage: npx ts-node scripts/add-validator.ts
 * Or:    VOTE=<pubkey> npx ts-node scripts/add-validator.ts  (single)
 */
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";
import * as pda from "../sdk/src/pda";
import idl from "../target/idl/vow.json";

const RPC = process.env.RPC ?? "https://rpc.testnet.x1.xyz";
const WALLET_PATH = process.env.WALLET ?? `${homedir()}/.config/solana/id.json`;

// Best 0%-commission active testnet validators
const DEFAULT_VALIDATORS = [
  "3joDLTDDQH3R77n6e5JdPhn8Gv2qJnGQAcatQqcEyBAn",
  "FPU1x1NBBaTbySb8hxpcFPnXK78Q24pSsgKh2FSffNCQ",
  "4Bev74HHxX3irYF97PzA9Na2qsfEwndRMnB2SCuKsaa9",
];

async function addOne(program: anchor.Program, admin: PublicKey, voteAccount: PublicKey) {
  const [config] = pda.findProtocolConfig();
  const [stakePool] = pda.findStakePool();
  const [validatorEntry] = pda.findValidatorEntry(voteAccount);
  const [poolStake] = pda.findPoolStake(voteAccount);

  // Skip if already registered
  const existing = await program.provider.connection.getAccountInfo(validatorEntry);
  if (existing) {
    console.log(`  skip  ${voteAccount.toBase58().slice(0,8)}… (already registered)`);
    return;
  }

  const sig = await program.methods
    .addValidator(voteAccount)
    .accounts({ config, stakePool, validatorEntry, poolStake, voteAccountInfo: voteAccount, admin, systemProgram: SystemProgram.programId })
    .rpc();

  console.log(`  ✓ added ${voteAccount.toBase58().slice(0,8)}…  tx: ${sig.slice(0,16)}…`);
  console.log(`         entry: ${validatorEntry.toBase58()}`);
  console.log(`     poolStake: ${poolStake.toBase58()}`);
}

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const secret = JSON.parse(readFileSync(WALLET_PATH, "utf8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(keypair), { commitment: "confirmed" });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as any, provider);

  const votes = process.env.VOTE
    ? [process.env.VOTE]
    : DEFAULT_VALIDATORS;

  console.log(`Adding ${votes.length} validator(s) to pool on ${RPC}…`);
  for (const v of votes) {
    await addOne(program, keypair.publicKey, new PublicKey(v));
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
