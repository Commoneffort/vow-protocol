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
export const findXNftState = findVowState;

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

export function findCommitmentRecord(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("commitment"), wallet.toBuffer()],
    PROGRAM_ID
  );
}

export { PROGRAM_ID };
