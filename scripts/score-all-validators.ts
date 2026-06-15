/**
 * Permissionless crank: score all active validators.
 * Reads vote account data off-chain and submits scoring inputs on-chain.
 * Usage: npx ts-node scripts/score-all-validators.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import * as pda from "../sdk/src/pda";

const EXPECTED_CREDITS_PER_EPOCH = 432_000;

async function getVoteAccountStats(
  connection: Connection,
  voteAccount: PublicKey
): Promise<{ avgCredits: number; activeEpochs: number; commission: number }> {
  const accountInfo = await connection.getAccountInfo(voteAccount);
  if (!accountInfo) return { avgCredits: 0, activeEpochs: 0, commission: 100 };

  // Parse vote account data (simplified — in production use @solana/spl-memo or solana-program-library)
  // Vote account layout: [discriminator(4)] [nodePubkey(32)] [authorizedWithdrawer(32)] [commission(1)] ...
  // This is a simplified parser — for production, use the full VoteState deserialization
  const data = accountInfo.data;
  const commission = data[4 + 32 + 32] ?? 100;

  // For testnet, return default values until full vote state parsing is implemented
  return { avgCredits: 350_000, activeEpochs: 5, commission };
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Xnft;

  const [config] = pda.findProtocolConfig();

  const validatorEntries = await program.account.validatorEntry.all();
  const activeEntries = validatorEntries.filter((e: any) => e.account.active);
  console.log(`Scoring ${activeEntries.length} active validators...`);

  for (const entry of activeEntries) {
    const voteAccount = entry.account.voteAccount as PublicKey;
    const [validatorEntry] = pda.findValidatorEntry(voteAccount);

    const stats = await getVoteAccountStats(provider.connection, voteAccount);
    const selfStake = 0; // TODO: query validator self-stake from identity stake accounts

    try {
      const sig = await program.methods
        .scoreValidator(
          new anchor.BN(stats.avgCredits),
          stats.activeEpochs,
          stats.commission,
          new anchor.BN(selfStake)
        )
        .accounts({ config, validatorEntry, voteAccountInfo: voteAccount })
        .rpc();

      const updated = await program.account.validatorEntry.fetch(validatorEntry);
      console.log(`  ✓ ${voteAccount.toBase58().slice(0, 8)}... score=${updated.score}`);
    } catch (e: any) {
      console.error(`  ✗ ${voteAccount.toBase58().slice(0, 8)}... ${e.message}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
