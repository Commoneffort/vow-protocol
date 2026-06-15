/**
 * Example: Game session integration with xNFT
 *
 * Flow:
 * 1. Player mints an xNFT (or uses an existing one)
 * 2. Player creates a session for the game program
 * 3. Game calls yield_spend() via CPI to deduct from player's yield_balance
 * 4. Player can revoke the session at any time
 */
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as pda from "../../sdk/src/pda";
import { LAMPORTS_PER_XNT, CLASS_NAMES, YieldMode as YieldModeType } from "../../sdk/src/types";

const RPC = process.env.RPC ?? "https://rpc.testnet.x1.xyz";
const GAME_PROGRAM_ID = new PublicKey(process.env.GAME_PROGRAM ?? "11111111111111111111111111111111");

async function main() {
  const connection = new anchor.web3.Connection(RPC, "confirmed");
  const player = Keypair.generate();
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(player), {});
  anchor.setProvider(provider);

  const program = anchor.workspace.Xnft;

  console.log("=== xNFT Game Session Example ===\n");
  console.log(`Player: ${player.publicKey.toBase58()}`);

  // 1. Airdrop some XNT for testing
  console.log("Requesting airdrop...");
  await connection.requestAirdrop(player.publicKey, 5 * LAMPORTS_PER_SOL);
  await new Promise((r) => setTimeout(r, 2000));

  // 2. Mint a Ruby xNFT (1 XNT)
  const [configPda] = pda.findProtocolConfig();
  const config = await program.account.protocolConfig.fetch(configPda);
  const nonce = config.totalMinted.toNumber();
  const [assetId] = pda.findAssetId(nonce);
  const [xnftState] = pda.findXNftState(assetId);
  const [stakePool] = pda.findStakePool();
  const [reserve] = pda.findReserve();

  console.log(`\nMinting Ruby xNFT (1 XNT)...`);
  await program.methods
    .mintXnft(new anchor.BN(LAMPORTS_PER_XNT), { treasury: {} })
    .accounts({
      config: configPda, stakePool, assetIdAccount: assetId, xnftState,
      reserve, owner: player.publicKey, systemProgram: SystemProgram.programId,
    })
    .signers([player])
    .rpc();

  const state = await program.account.xNftState.fetch(xnftState);
  console.log(`✓ Minted xNFT`);
  console.log(`  Class: ${CLASS_NAMES[state.class]}`);
  console.log(`  Asset ID: ${assetId.toBase58()}`);
  console.log(`  xNFT State: ${xnftState.toBase58()}`);

  // 3. Create a game session
  const sessionKeypair = Keypair.generate();
  const [sessionAccount] = pda.findSessionAccount(xnftState, sessionKeypair.publicKey);
  const expiryTs = new anchor.BN(Math.floor(Date.now() / 1000) + 3600 * 24 * 30);

  console.log(`\nCreating game session...`);
  await program.methods
    .createSession(
      sessionKeypair.publicKey,
      [GAME_PROGRAM_ID],
      {
        expiryTs,
        dailyLimit: new anchor.BN(100_000_000),  // 0.1 XNT/day
        lifetimeLimit: new anchor.BN(1_000_000_000), // 1 XNT total
        velocityLimit: 50,
      }
    )
    .accounts({
      config: configPda, xnftState, sessionAccount,
      authorityProfile: null, owner: player.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([player])
    .rpc();

  console.log(`✓ Session created`);
  console.log(`  Session key: ${sessionKeypair.publicKey.toBase58()}`);
  console.log(`  Allowed program: ${GAME_PROGRAM_ID.toBase58()}`);
  console.log(`  Daily limit: 0.1 XNT`);
  console.log(`  Lifetime limit: 1 XNT`);
  console.log(`  Expires: ${new Date(expiryTs.toNumber() * 1000).toISOString()}`);

  // 4. Check session state
  const session = await program.account.sessionAccount.fetch(sessionAccount);
  console.log(`\nSession active: ${session.active}`);
  console.log(`\nGame integration ready. The game program (${GAME_PROGRAM_ID.toBase58().slice(0, 8)}...)`);
  console.log(`can now call yield_spend() up to 0.1 XNT/day using session key ${sessionKeypair.publicKey.toBase58().slice(0, 8)}...`);
}

main().catch(console.error);
