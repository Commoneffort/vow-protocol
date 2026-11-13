import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

const PROGRAM_ID = new PublicKey("7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ");

export function findProtocolConfig(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
}

export function findStakePool(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("stake_pool")], PROGRAM_ID);
}

export function findReserve(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("reserve")], PROGRAM_ID);
}

export function findValidatorEntry(voteAccount: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("validator"), voteAccount.toBuffer()],
    PROGRAM_ID
  );
}

export function findPoolStake(voteAccount: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool_stake"), voteAccount.toBuffer()],
    PROGRAM_ID
  );
}

export function findAssetId(nonce: BN | number): [PublicKey, number] {
  const nonceBuf = Buffer.alloc(8);
  const nonceNum = typeof nonce === "number" ? nonce : nonce.toNumber();
  nonceBuf.writeBigUInt64LE(BigInt(nonceNum));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vow_asset"), nonceBuf],
    PROGRAM_ID
  );
}

export function findVowState(assetId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vow"), assetId.toBuffer()],
    PROGRAM_ID
  );
}

/** @deprecated Use findVowState */
export const findIdNftState = findVowState;

export function findSessionAccount(
  vowState: PublicKey,
  sessionIndex: number
): [PublicKey, number] {
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(sessionIndex);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("session"), vowState.toBuffer(), indexBuf],
    PROGRAM_ID
  );
}

export function findAuthorityProfile(
  wallet: PublicKey,
  profileId: Uint8Array | Buffer
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("authority_profile"), wallet.toBuffer(), profileId],
    PROGRAM_ID
  );
}

export function findAppRegistry(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("app"), programId.toBuffer()],
    PROGRAM_ID
  );
}

export function findUnstakeEscrow(vowState: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("unstake"), vowState.toBuffer()],
    PROGRAM_ID
  );
}

/** One per wallet — `["owner_index", owner]`; its vow_state is the canonical identity. */
export function findOwnerIndex(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("owner_index"), owner.toBuffer()],
    PROGRAM_ID
  );
}

export function findCommitmentRecord(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("commitment"), wallet.toBuffer()],
    PROGRAM_ID
  );
}

/** X1 mainnet SPL Stake Pool program (different address from standard Solana) */
export const SPL_STAKE_POOL_PROGRAM_ID = new PublicKey("XPoo1Fx6KNgeAzFcq2dPTo95bWGUSj5KdPVqYj9CZux");

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
// X1 deploys the associated token program at a different address than standard Solana
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

/**
 * ATA owned by the reserve PDA that holds pXNT pool tokens.
 * On testnet (pool not configured), this account won't exist.
 */
export function findReservePoolTokens(pXNTMint: PublicKey): PublicKey {
  const [reserve] = findReserve();
  const [ata] = PublicKey.findProgramAddressSync(
    [reserve.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), pXNTMint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return ata;
}

/**
 * Derives the SPL stake pool withdraw authority PDA.
 * Needed as an account in flush_reserve_to_pool and withdraw_from_pool.
 */
export function findPoolWithdrawAuthority(poolAddress: PublicKey): PublicKey {
  const [auth] = PublicKey.findProgramAddressSync(
    [poolAddress.toBuffer(), Buffer.from("withdraw")],
    SPL_STAKE_POOL_PROGRAM_ID
  );
  return auth;
}

export { PROGRAM_ID };
