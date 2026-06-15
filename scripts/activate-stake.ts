/**
 * Initialize and delegate all registered pool stake accounts.
 * Run after flush-reserve.ts.
 * Usage: npx ts-node scripts/activate-stake.ts
 */
import * as anchor from "@coral-xyz/anchor";
import {
  Connection, Keypair, PublicKey, SystemProgram, StakeProgram,
  SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY, SYSVAR_STAKE_HISTORY_PUBKEY,
} from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";
import * as pda from "../sdk/src/pda";
import idl from "../target/idl/vow.json";

const RPC         = process.env.RPC    ?? "https://rpc.testnet.x1.xyz";
const WALLET_PATH = process.env.WALLET ?? `${homedir()}/.config/solana/id.json`;

const STAKE_PROGRAM_ID = StakeProgram.programId;
const STAKE_HISTORY_ID = SYSVAR_STAKE_HISTORY_PUBKEY;

const VOTE_ACCOUNTS = [
  "3joDLTDDQH3R77n6e5JdPhn8Gv2qJnGQAcatQqcEyBAn",
  "FPU1x1NBBaTbySb8hxpcFPnXK78Q24pSsgKh2FSffNCQ",
  "4Bev74HHxX3irYF97PzA9Na2qsfEwndRMnB2SCuKsaa9",
];

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const secret     = JSON.parse(readFileSync(WALLET_PATH, "utf8"));
  const keypair    = Keypair.fromSecretKey(Uint8Array.from(secret));
  const provider   = new anchor.AnchorProvider(connection, new anchor.Wallet(keypair), { commitment: "confirmed" });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as any, provider);

  const [configPda]     = pda.findProtocolConfig();
  const [stakePoolPda]  = pda.findStakePool();
  const [poolAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_authority")],
    program.programId
  );

  console.log(`Pool authority: ${poolAuthority.toBase58()}`);

  for (const voteStr of VOTE_ACCOUNTS) {
    const voteAccount      = new PublicKey(voteStr);
    const [validatorEntry] = pda.findValidatorEntry(voteAccount);
    const [poolStake]      = pda.findPoolStake(voteAccount);

    const poolStakeInfo = await connection.getAccountInfo(poolStake);
    const balance       = await connection.getBalance(poolStake);
    const owner         = poolStakeInfo?.owner.toBase58() ?? "none";

    console.log(`\nValidator ${voteStr.slice(0, 8)}…  balance: ${(balance / 1e9).toFixed(4)} XNT  owner: ${owner.slice(0,8)}…`);

    // ── Initialize ────────────────────────────────────────────────────────────
    if (owner === STAKE_PROGRAM_ID.toBase58()) {
      console.log("  initialize: already a stake account ✓");
    } else if (balance === 0) {
      console.log("  initialize: no lamports — flush reserve first, skipping");
      continue;
    } else {
      try {
        const sig = await program.methods.initializePoolStake()
          .accounts({
            config: configPda, stakePool: stakePoolPda, validatorEntry, poolStake,
            poolAuthority, systemProgram: SystemProgram.programId,
            stakeProgram: STAKE_PROGRAM_ID, rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();
        console.log(`  ✓ initialized — tx: ${sig.slice(0, 20)}…`);
      } catch (e: any) {
        console.error(`  ✗ initialize: ${e.message}`);
        continue;
      }
    }

    // ── Delegate ──────────────────────────────────────────────────────────────
    try {
      const sig = await program.methods.delegatePoolStake()
        .accounts({
          config: configPda, stakePool: stakePoolPda, validatorEntry, poolStake,
          poolAuthority, voteAccountInfo: voteAccount,
          clock: SYSVAR_CLOCK_PUBKEY, stakeHistory: STAKE_HISTORY_ID,
          stakeProgram: STAKE_PROGRAM_ID,
        })
        .rpc();
      console.log(`  ✓ delegated  — tx: ${sig.slice(0, 20)}…`);
    } catch (e: any) {
      console.error(`  ✗ delegate:  ${e.message}`);
    }
  }

  console.log("\nDone. Stakes are activating — fully active next epoch (~2 days on testnet).");
  console.log("Run scripts/update-share-price.ts after activation to start tracking yield.");
}

main().catch((e) => { console.error(e); process.exit(1); });
