/**
 * Permissionless crank: update global share price.
 * Passes all active pool stake account pubkeys as remaining accounts.
 * Usage: npx ts-node scripts/update-share-price.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as pda from "../sdk/src/pda";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Xnft;

  const [config] = pda.findProtocolConfig();

  // Fetch all validator entries to get pool stake accounts
  const validatorEntries = await program.account.validatorEntry.all([
    { memcmp: { offset: 8 + 32 + 32 + 8 + 4 + 8, bytes: anchor.utils.bytes.bs58.encode([1]) } }
  ]);

  const poolStakeAccounts = validatorEntries
    .filter((e: any) => e.account.active)
    .map((e: any) => ({
      pubkey: e.account.stakeAccount as PublicKey,
      isSigner: false,
      isWritable: false,
    }));

  console.log(`Updating share price with ${poolStakeAccounts.length} pool stake accounts...`);

  const sig = await program.methods
    .updateSharePrice()
    .accounts({ config })
    .remainingAccounts(poolStakeAccounts)
    .rpc();

  const configData = await program.account.protocolConfig.fetch(config);
  console.log(`✓ Share price updated. Tx: ${sig}`);
  console.log(`  Share price: ${configData.currentSharePrice.toString()}`);
  console.log(`  Total shares: ${configData.totalShares.toString()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
