import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Vow } from "../target/types/vow";
import * as pda from "../sdk/src/pda";
import { LAMPORTS_PER_XNT } from "../sdk/src/types";

export const PROGRAM_ID = pda.PROGRAM_ID;

export async function setupProvider(): Promise<AnchorProvider> {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  return provider;
}

export function getProgram(provider: AnchorProvider): Program<Vow> {
  return anchor.workspace.Vow as Program<Vow>;
}

export async function airdrop(
  connection: Connection,
  pubkey: PublicKey,
  lamports = 10 * LAMPORTS_PER_SOL
): Promise<void> {
  const sig = await connection.requestAirdrop(pubkey, lamports);
  await connection.confirmTransaction(sig, "confirmed");
}

export async function initializeProtocol(
  program: Program<Vow>,
  admin: anchor.web3.Keypair
): Promise<void> {
  const [config] = pda.findProtocolConfig();

  // Check if already initialized — if so, skip (idempotent)
  try {
    await program.account.protocolConfig.fetch(config);
    return;
  } catch (_) {
    // Not initialized yet — proceed
  }

  const [reserve] = pda.findReserve();

  // Testnet: pass SystemProgram (zero address) for SPL pool — update_share_price will no-op
  await program.methods
    .initialize(SystemProgram.programId, SystemProgram.programId)
    .accounts({
      config,
      reserve,
      admin: admin.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([admin])
    .rpc();
}

export async function getOrCreateAdmin(provider: AnchorProvider): Promise<anchor.web3.Keypair> {
  const program = anchor.workspace.Vow as Program<Vow>;

  // Create a fresh admin and fund it
  const admin = Keypair.generate();
  try {
    await airdrop(provider.connection, admin.publicKey, 20 * LAMPORTS_PER_SOL);
  } catch (_) {}
  return admin;
}

export function xntToLamports(xnt: number): BN {
  return new BN(xnt * LAMPORTS_PER_XNT);
}

export const YieldMode = {
  Compound: { compound: {} },
  Hybrid: { hybrid: {} },
  Treasury: { treasury: {} },
};
