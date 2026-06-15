/**
 * Example: xNFT marketplace transfer
 *
 * Demonstrates:
 * - Transferring an xNFT from seller to buyer
 * - Session invalidation on transfer
 * - New owner creating a fresh session
 */
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as pda from "../../sdk/src/pda";
import { LAMPORTS_PER_XNT, CLASS_NAMES } from "../../sdk/src/types";

const RPC = process.env.RPC ?? "https://rpc.testnet.x1.xyz";

async function main() {
  const connection = new anchor.web3.Connection(RPC, "confirmed");
  const seller = Keypair.generate();
  const buyer = Keypair.generate();

  console.log("=== xNFT Marketplace Transfer Example ===\n");
  console.log(`Seller: ${seller.publicKey.toBase58()}`);
  console.log(`Buyer:  ${buyer.publicKey.toBase58()}`);

  const sellerProvider = new anchor.AnchorProvider(connection, new anchor.Wallet(seller), {});
  anchor.setProvider(sellerProvider);
  const program = anchor.workspace.Xnft;

  // Airdrop
  await Promise.all([
    connection.requestAirdrop(seller.publicKey, 10 * LAMPORTS_PER_SOL),
    connection.requestAirdrop(buyer.publicKey, 2 * LAMPORTS_PER_SOL),
  ]);
  await new Promise((r) => setTimeout(r, 2000));

  // Seller mints xNFT
  const [configPda] = pda.findProtocolConfig();
  const config = await program.account.protocolConfig.fetch(configPda);
  const [assetId] = pda.findAssetId(config.totalMinted);
  const [xnftState] = pda.findXNftState(assetId);
  const [stakePool] = pda.findStakePool();
  const [reserve] = pda.findReserve();

  console.log("\nSeller mints Emerald xNFT (501 XNT)...");
  await program.methods
    .mintXnft(new anchor.BN(501 * LAMPORTS_PER_XNT), { compound: {} })
    .accounts({
      config: configPda, stakePool, assetIdAccount: assetId, xnftState,
      reserve, owner: seller.publicKey, systemProgram: SystemProgram.programId,
    })
    .signers([seller])
    .rpc();

  const state = await program.account.xNftState.fetch(xnftState);
  console.log(`✓ Minted ${CLASS_NAMES[state.class]} xNFT`);

  // Seller creates a session (will be invalidated on transfer)
  const sellerSessionKey = Keypair.generate().publicKey;
  const [sellerSession] = pda.findSessionAccount(xnftState, sellerSessionKey);
  const expiryTs = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

  console.log("\nSeller creates a pre-transfer session...");
  await program.methods
    .createSession(sellerSessionKey, [Keypair.generate().publicKey], {
      expiryTs, dailyLimit: new anchor.BN(0), lifetimeLimit: new anchor.BN(0), velocityLimit: 0,
    })
    .accounts({
      config: configPda, xnftState, sessionAccount: sellerSession,
      authorityProfile: null, owner: seller.publicKey, systemProgram: SystemProgram.programId,
    })
    .signers([seller])
    .rpc();

  const sessionBefore = await program.account.sessionAccount.fetch(sellerSession);
  console.log(`  Session active before transfer: ${sessionBefore.active}`);

  // Transfer to buyer (simulates marketplace settlement)
  console.log("\nTransferring xNFT to buyer...");
  await program.methods
    .transferXnft()
    .accounts({
      config: configPda, xnftState, newOwner: buyer.publicKey, owner: seller.publicKey,
    })
    .signers([seller])
    .rpc();

  const stateAfter = await program.account.xNftState.fetch(xnftState);
  console.log(`✓ Transfer complete`);
  console.log(`  New owner: ${stateAfter.owner.toBase58()}`);
  console.log(`  Sessions invalidated at: ${new Date(stateAfter.sessionsInvalidatedAt.toNumber() * 1000).toISOString()}`);

  // Verify session is now invalid (start_ts < sessions_invalidated_at)
  const sessionAfter = await program.account.sessionAccount.fetch(sellerSession);
  const isInvalid = sessionAfter.startTs.lt(stateAfter.sessionsInvalidatedAt);
  console.log(`  Seller's session invalidated: ${isInvalid}`);
  console.log("\nBuyer now owns the xNFT and must create new sessions from scratch.");
}

main().catch(console.error);
