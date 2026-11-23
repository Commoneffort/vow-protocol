import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Vow } from "./vow-types";
import idl from "./vow.json";
import * as pda from "./pda";
import { YieldMode, SessionParams, SHARE_PRECISION } from "./types";

/** Accounts needed to interact with the X1 Foundation SPL stake pool */
export interface SplPoolAccounts {
  splPool: PublicKey;
  poolWithdrawAuthority: PublicKey;
  poolReserveStake: PublicKey;
  poolManagerFeeAccount: PublicKey;
  /** Ignored by flush: the program pins the referral account to the reserve's pXNT ATA. */
  poolReferralFeeAccount: PublicKey;
  poolMint: PublicKey;
  stakePoolProgram: PublicKey;
}

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const BPF_UPGRADEABLE_LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const CLOCK_SYSVAR = new PublicKey("SysvarC1ock11111111111111111111111111111111");
const STAKE_HISTORY_SYSVAR = new PublicKey("SysvarStakeHistory1111111111111111111111111");
const STAKE_PROGRAM = new PublicKey("Stake11111111111111111111111111111111111111");
const RENT_EXEMPT_ZERO_DATA = 890_880; // Rent::minimum_balance(0)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class VowClient {
  program: Program<Vow>;
  provider: AnchorProvider;

  constructor(provider: AnchorProvider) {
    this.provider = provider;
    this.program = new Program<Vow>(idl as Vow, provider);
  }

  // ---- Pool helpers ----

  /** True when a real SPL stake pool is configured (mainnet). */
  async poolConfigured(): Promise<boolean> {
    const cfg = await this.getProtocolConfig();
    return !(cfg.splStakePool as PublicKey).equals(SystemProgram.programId);
  }

  /** Every SPL pool account the cranks need, read from config + pool account data. */
  async getSplPoolAccounts(): Promise<SplPoolAccounts> {
    const cfg = await this.getProtocolConfig();
    const splPool = cfg.splStakePool as PublicKey;
    const info = await this.provider.connection.getAccountInfo(splPool);
    if (!info || info.data.length < 227) throw new Error("Could not read SPL stake pool account");
    const poolMint = cfg.splPoolMint as PublicKey;
    return {
      splPool,
      poolWithdrawAuthority: pda.findPoolWithdrawAuthority(splPool),
      poolReserveStake: new PublicKey(info.data.subarray(131, 163)),
      poolManagerFeeAccount: new PublicKey(info.data.subarray(195, 227)),
      // Pinned on-chain to the reserve's own pXNT ATA (referral fees come back to us).
      poolReferralFeeAccount: pda.findReservePoolTokens(poolMint),
      poolMint,
      stakePoolProgram: pda.SPL_STAKE_POOL_PROGRAM_ID,
    };
  }

  /**
   * update_share_price instruction, or [] on testnet. Prepend to every value-moving
   * instruction (mint, add_stake, activate_stake, harvest, begin_unstake,
   * update_yield_mode) and payout (yield_spend, withdraw_yield, complete_unstake):
   * the program rejects those with PriceStale unless refreshed for the current epoch.
   */
  async freshPriceIxs(): Promise<TransactionInstruction[]> {
    const cfg = await this.getProtocolConfig();
    const splPool = cfg.splStakePool as PublicKey;
    if (splPool.equals(SystemProgram.programId)) return [];
    const [config] = pda.findProtocolConfig();
    const [reserve] = pda.findReserve();
    return [
      await this.program.methods
        .updateSharePrice()
        .accountsStrict({
          config,
          splPool,
          reserve,
          reservePoolTokens: pda.findReservePoolTokens(cfg.splPoolMint as PublicKey),
          tokenProgram: TOKEN_PROGRAM,
        })
        .instruction(),
    ];
  }

  // ---- Admin ----

  /** Must be signed by the program's upgrade authority. */
  async initialize(splStakePool: PublicKey, splPoolMint: PublicKey): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [reserve] = pda.findReserve();
    const programId = this.program.programId;
    const [programData] = PublicKey.findProgramAddressSync([programId.toBuffer()], BPF_UPGRADEABLE_LOADER);
    return this.program.methods
      .initialize(splStakePool, splPoolMint)
      .accountsStrict({
        config, reserve, program: programId, programData,
        admin: this.provider.wallet.publicKey, systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  // Testnet-only helpers: blocked on-chain when a real SPL pool is configured.
  async devFastUnlock(vowState: PublicKey): Promise<string> {
    const [config] = pda.findProtocolConfig();
    return this.program.methods
      .devFastUnlock()
      .accounts({ config, vowState, admin: this.provider.wallet.publicKey })
      .rpc();
  }

  async devSetSharePrice(newPriceE12: BN): Promise<string> {
    const [config] = pda.findProtocolConfig();
    return this.program.methods
      .devSetSharePrice(newPriceE12)
      .accounts({ config, admin: this.provider.wallet.publicKey })
      .rpc();
  }

  // ---- Permissionless cranks ----

  /** Recompute the NAV share price from the reserve + pXNT position + pool state. */
  async updateSharePrice(): Promise<string | null> {
    const ixs = await this.freshPriceIxs();
    if (ixs.length === 0) return null;
    return this.provider.sendAndConfirm(new Transaction().add(...ixs));
  }

  /** Deposit only idle reserve SOL (not yield claims / pending unstakes) into the pool.
   *  The reserve's pXNT ATA must exist first (Admin.ensureReserveAta). */
  async flushReserveToPool(accounts?: SplPoolAccounts): Promise<string> {
    const a = accounts ?? (await this.getSplPoolAccounts());
    const [config] = pda.findProtocolConfig();
    const [reserve] = pda.findReserve();
    const reservePoolTokens = pda.findReservePoolTokens(a.poolMint);
    return this.program.methods
      .flushReserveToPool()
      .accountsStrict({
        config,
        reserve,
        reservePoolTokens,
        splPool: a.splPool,
        poolWithdrawAuthority: a.poolWithdrawAuthority,
        poolReserveStake: a.poolReserveStake,
        poolManagerFeeAccount: a.poolManagerFeeAccount,
        poolReferralFeeAccount: reservePoolTokens,
        poolMint: a.poolMint,
        tokenProgram: TOKEN_PROGRAM,
        systemProgram: SystemProgram.programId,
        stakePoolProgram: a.stakePoolProgram,
      })
      .rpc();
  }

  /**
   * Redeem just enough pXNT to cover what the protocol owes right now
   * (rent + all yield balances + pending unstakes). Reverts on-chain with
   * ReserveSufficient when nothing is owed beyond what's liquid.
   */
  async withdrawFromPool(accounts?: SplPoolAccounts): Promise<string> {
    const a = accounts ?? (await this.getSplPoolAccounts());
    const [config] = pda.findProtocolConfig();
    const [reserve] = pda.findReserve();
    return this.program.methods
      .withdrawFromPool()
      .accountsStrict({
        config,
        reserve,
        reservePoolTokens: pda.findReservePoolTokens(a.poolMint),
        splPool: a.splPool,
        poolWithdrawAuthority: a.poolWithdrawAuthority,
        poolReserveStake: a.poolReserveStake,
        poolManagerFeeAccount: a.poolManagerFeeAccount,
        poolMint: a.poolMint,
        clock: CLOCK_SYSVAR,
        stakeHistory: STAKE_HISTORY_SYSVAR,
        stakeProgram: STAKE_PROGRAM,
        tokenProgram: TOKEN_PROGRAM,
        stakePoolProgram: a.stakePoolProgram,
      })
      .rpc();
  }

  /**
   * Make sure the reserve holds `extra` lamports beyond what it already owes, redeeming
   * pXNT if needed. Retries through the stake program's EpochRewardsActive window
   * (custom error 0x10, a few minutes after each epoch boundary). No-op on testnet.
   */
  async ensureLiquidity(extra = 0, maxWaitMs = 10 * 60_000): Promise<void> {
    if (!(await this.poolConfigured())) return;
    const [reserve] = pda.findReserve();
    const deadline = Date.now() + maxWaitMs;
    for (let i = 0; i < 6; ) {
      const cfg = await this.getProtocolConfig();
      const owed = (cfg.totalYieldClaims as BN).add(cfg.totalPendingUnstake as BN).toNumber();
      const bal = await this.provider.connection.getBalance(reserve, "confirmed");
      if (bal >= RENT_EXEMPT_ZERO_DATA + owed + extra) return;
      try {
        await this.withdrawFromPool();
        i++;
      } catch (e: any) {
        if (!String(e).includes("0x10") || Date.now() > deadline) throw e;
        await sleep(5_000); // EpochRewardsActive — stake withdrawals paused briefly
      }
    }
    throw new Error("Reserve still short after repeated withdraw_from_pool calls");
  }

  // ---- VOW Identity Core ----

  async mintVow(
    stakeLamports: number,
    yieldMode: YieldMode
  ): Promise<{ sig: string; assetId: PublicKey; vowState: PublicKey }> {
    const [config] = pda.findProtocolConfig();
    const configAccount = await this.program.account.protocolConfig.fetch(config);
    const nonce = configAccount.totalMinted.toNumber();
    const [assetIdAccount] = pda.findAssetId(nonce);
    const [vowState] = pda.findVowState(assetIdAccount);
    const [reserve] = pda.findReserve();
    const owner = this.provider.wallet.publicKey;
    const [ownerIndex] = pda.findOwnerIndex(owner);

    const sig = await this.program.methods
      .mintVow(new BN(stakeLamports), yieldMode)
      .accountsStrict({ config, assetIdAccount, vowState, reserve, ownerIndex, owner, systemProgram: SystemProgram.programId })
      .preInstructions(await this.freshPriceIxs())
      .rpc();
    return { sig, assetId: assetIdAccount, vowState };
  }

  /** Tops up stake. Note: every top-up re-locks the whole position for the class duration. */
  async addStake(vowState: PublicKey, lamportsToAdd: number): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [reserve] = pda.findReserve();
    return this.program.methods
      .addStake(new BN(lamportsToAdd))
      .accountsStrict({ config, vowState, reserve, owner: this.provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .preInstructions(await this.freshPriceIxs())
      .rpc();
  }

  async activateStake(vowState: PublicKey, stakeLamports: number, yieldMode: YieldMode): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [reserve] = pda.findReserve();
    return this.program.methods
      .activateStake(new BN(stakeLamports), yieldMode)
      .accountsStrict({ config, vowState, reserve, owner: this.provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .preInstructions(await this.freshPriceIxs())
      .rpc();
  }

  async harvest(vowState: PublicKey): Promise<string> {
    const [config] = pda.findProtocolConfig();
    return this.program.methods
      .harvest()
      .accountsStrict({ config, vowState })
      .preInstructions(await this.freshPriceIxs())
      .rpc();
  }

  /** Registers the wallet's canonical identity for legacy (pre-OwnerIndex) mints. */
  async backfillOwnerIndex(vowState: PublicKey): Promise<string> {
    const state = await this.getVowState(vowState);
    const [ownerIndex] = pda.findOwnerIndex(state.owner as PublicKey);
    return this.program.methods
      .backfillOwnerIndex()
      .accountsStrict({ vowState, ownerIndex, payer: this.provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .rpc();
  }

  async depositYieldBalance(vowState: PublicKey, amount: number): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [reserve] = pda.findReserve();
    const [unstakeEscrow] = pda.findUnstakeEscrow(vowState);
    return this.program.methods
      .depositYieldBalance(new BN(amount))
      .accountsStrict({ config, vowState, reserve, depositor: this.provider.wallet.publicKey, systemProgram: SystemProgram.programId, unstakeEscrow })
      .rpc();
  }

  async withdrawYield(vowState: PublicKey, amount?: number): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [reserve] = pda.findReserve();
    await this.ensureLiquidity();
    return this.program.methods
      .withdrawYield(amount != null ? new BN(amount) : null)
      .accountsStrict({ config, vowState, reserve, owner: this.provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .preInstructions(await this.freshPriceIxs())
      .rpc();
  }

  async beginUnstake(vowState: PublicKey): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [unstakeEscrow] = pda.findUnstakeEscrow(vowState);
    return this.program.methods
      .beginUnstake()
      .accountsStrict({ config, vowState, unstakeEscrow, owner: this.provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .preInstructions(await this.freshPriceIxs())
      .rpc();
  }

  /**
   * Complete unstake (≥1 epoch after begin). Pays exactly the amount locked in at
   * begin_unstake — never a partial amount. On mainnet, first redeems pXNT so the
   * reserve covers every pending obligation (retrying through EpochRewardsActive).
   */
  async completeUnstake(vowState: PublicKey): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [unstakeEscrow] = pda.findUnstakeEscrow(vowState);
    const [reserve] = pda.findReserve();
    await this.ensureLiquidity();
    return this.program.methods
      .completeUnstake()
      .accountsStrict({ config, vowState, unstakeEscrow, reserve, owner: this.provider.wallet.publicKey, systemProgram: SystemProgram.programId, clock: CLOCK_SYSVAR })
      .preInstructions(await this.freshPriceIxs())
      .rpc();
  }

  async updateYieldMode(vowState: PublicKey, newMode: YieldMode): Promise<string> {
    const [config] = pda.findProtocolConfig();
    return this.program.methods
      .updateYieldMode(newMode)
      .accountsStrict({ config, vowState, owner: this.provider.wallet.publicKey })
      .preInstructions(await this.freshPriceIxs())
      .rpc();
  }

  // ---- Sessions ----

  async createSession(
    vowState: PublicKey,
    sessionIndex: number,
    sessionKey: PublicKey,
    allowedProgramIds: PublicKey[],
    params: SessionParams
  ): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [sessionAccount] = pda.findSessionAccount(vowState, sessionIndex);
    return this.program.methods
      .createSession(sessionKey, allowedProgramIds, params, sessionIndex)
      .accountsStrict({ config, vowState, sessionAccount, authorityProfile: null, owner: this.provider.wallet.publicKey, systemProgram: SystemProgram.programId })
      .rpc();
  }

  async revokeSession(vowState: PublicKey, sessionIndex: number): Promise<string> {
    const [sessionAccount] = pda.findSessionAccount(vowState, sessionIndex);
    return this.program.methods
      .revokeSession()
      .accounts({ vowState, sessionAccount, owner: this.provider.wallet.publicKey })
      .rpc();
  }

  async closeSession(vowState: PublicKey, sessionIndex: number): Promise<string> {
    const [sessionAccount] = pda.findSessionAccount(vowState, sessionIndex);
    return this.program.methods
      .closeSession()
      .accounts({ vowState, sessionAccount, owner: this.provider.wallet.publicKey })
      .rpc();
  }

  // ---- Getters ----

  async getVowState(vowState: PublicKey) {
    return this.program.account.vowState.fetch(vowState);
  }

  async getProtocolConfig() {
    const [config] = pda.findProtocolConfig();
    return this.program.account.protocolConfig.fetch(config);
  }

  async getPendingGain(vowState: PublicKey): Promise<BN> {
    const state = await this.getVowState(vowState);
    const config = await this.getProtocolConfig();
    const currentValue = (state.shares as BN).mul(config.currentSharePrice as BN).div(SHARE_PRECISION);
    const lastValue = (state.shares as BN).mul(state.lastSharePrice as BN).div(SHARE_PRECISION);
    return currentValue.sub(lastValue).add(state.accruedGain as BN);
  }

  async getVowStatesByOwner(owner: PublicKey) {
    return this.program.account.vowState.all([
      { memcmp: { offset: 40, bytes: owner.toBase58() } },
    ]);
  }

  async getSessions(vowState: PublicKey) {
    return this.program.account.sessionAccount.all([
      { memcmp: { offset: 8, bytes: vowState.toBase58() } },
    ]);
  }
}

// Legacy export alias
export { VowClient as IdNftClient };
