import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export type YieldMode = { compound: {} } | { hybrid: {} } | { treasury: {} };

export const YieldMode = {
  Compound: { compound: {} } as YieldMode,
  Hybrid: { hybrid: {} } as YieldMode,
  Treasury: { treasury: {} } as YieldMode,
};

export const CLASS_NAMES = [
  "Ruby",
  "Opal",
  "Topaz",
  "Emerald",
  "Aquamarine",
  "Sapphire",
  "Amethyst",
  "Xenturion",
] as const;

export const LOCK_DAYS = [30, 90, 180, 365, 547, 730, 1095, 1825] as const;

export const LAMPORTS_PER_XNT = 1_000_000_000;
export const SHARE_PRECISION = new BN("1000000000000"); // 1e12

export interface ProtocolConfig {
  admin: PublicKey;
  paused: boolean;
  currentSharePrice: BN;
  totalShares: BN;
  totalYieldClaims: BN;
  lastPoolLamports: BN;
  totalMinted: BN;
  merkleTree: PublicKey;
  creditsWeight: number;
  selfStakeWeight: number;
  selfStakeCeil: BN;
  skipPenalty: number;
  commissionPenalty: number;
  bump: number;
}

export interface XNftState {
  assetId: PublicKey;
  owner: PublicKey;
  class: number;
  nonce: BN;
  principalLamports: BN;
  shares: BN;
  lastSharePrice: BN;
  accruedGain: BN;
  yieldMode: YieldMode;
  yieldBalance: BN;
  totalHarvested: BN;
  createdAt: BN;
  unlockAt: BN;
  matured: boolean;
  sessionsInvalidatedAt: BN;
  redeeming: boolean;
  bump: number;
}

export interface SessionAccount {
  xnftState: PublicKey;
  sessionKey: PublicKey;
  allowedProgramIds: PublicKey[];
  programCount: number;
  startTs: BN;
  expiryTs: BN;
  dailyLimit: BN;
  lifetimeLimit: BN;
  velocityLimit: number;
  spentToday: BN;
  spentTotal: BN;
  txCountToday: number;
  lastResetDay: BN;
  active: boolean;
  bump: number;
}

export interface AuthorityProfile {
  wallet: PublicKey;
  profileId: number[];
  defaultDailyLimit: BN;
  defaultLifetimeLimit: BN;
  defaultExpiryDays: number;
  defaultAllowedProgramIds: PublicKey[];
  programCount: number;
  metadataUri: string;
  uriLen: number;
  createdAt: BN;
  bump: number;
}

export interface ValidatorEntry {
  voteAccount: PublicKey;
  stakeAccount: PublicKey;
  allocatedLamports: BN;
  score: number;
  lastScoredEpoch: BN;
  active: boolean;
  bump: number;
  stakeBump: number;
}

export interface ScoringWeights {
  creditsWeight: number;
  selfStakeWeight: number;
  selfStakeCeil: BN;
  skipPenalty: number;
  commissionPenalty: number;
}

export interface SessionParams {
  expiryTs: BN;
  dailyLimit: BN;
  lifetimeLimit: BN;
  velocityLimit: number;
}

export function classForStake(lamports: number | BN): number {
  const xnt = (typeof lamports === "number" ? lamports : lamports.toNumber()) / LAMPORTS_PER_XNT;
  if (xnt >= 10001) return 7;
  if (xnt >= 5001) return 6;
  if (xnt >= 2001) return 5;
  if (xnt >= 1001) return 4;
  if (xnt >= 501) return 3;
  if (xnt >= 301) return 2;
  if (xnt >= 101) return 1;
  if (xnt >= 1) return 0;
  throw new Error("Stake below minimum (1 XNT)");
}

export function lockDays(classIndex: number): number {
  return LOCK_DAYS[classIndex];
}
