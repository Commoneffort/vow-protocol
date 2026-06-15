import { Program, AnchorProvider, BN, web3 } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { Xnft } from "../../target/types/xnft";
import idl from "../../idl/xnft.json";
import * as pda from "./pda";
import { YieldMode, ScoringWeights, SessionParams, SHARE_PRECISION, LAMPORTS_PER_XNT } from "./types";

export class XNftClient {
  program: Program<Xnft>;
  provider: AnchorProvider;

  constructor(provider: AnchorProvider) {
    this.provider = provider;
    this.program = new Program<Xnft>(idl as Xnft, provider);
  }

  // ---- Admin ----

  async initialize(weights: ScoringWeights): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [stakePool] = pda.findStakePool();
    const [reserve] = pda.findReserve();

    return this.program.methods
      .initialize(weights)
      .accounts({
        config,
        stakePool,
        reserve,
        admin: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async updateScoringWeights(weights: ScoringWeights): Promise<string> {
    const [config] = pda.findProtocolConfig();
    return this.program.methods
      .updateScoringWeights(
        weights.creditsWeight,
        weights.selfStakeWeight,
        weights.selfStakeCeil,
        weights.skipPenalty,
        weights.commissionPenalty
      )
      .accounts({ config, admin: this.provider.wallet.publicKey })
      .rpc();
  }

  async registerApp(programId: PublicKey): Promise<string> {
    const [appRegistry] = pda.findAppRegistry(programId);
    return this.program.methods
      .registerApp(programId)
      .accounts({
        appRegistry,
        payer: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  // ---- Pool ----

  async addValidator(voteAccount: PublicKey): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [stakePool] = pda.findStakePool();
    const [validatorEntry] = pda.findValidatorEntry(voteAccount);
    const [poolStake] = pda.findPoolStake(voteAccount);
    return this.program.methods
      .addValidator(voteAccount)
      .accounts({
        config,
        stakePool,
        validatorEntry,
        poolStake,
        voteAccountInfo: voteAccount,
        admin: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async scoreValidator(
    voteAccount: PublicKey,
    avgCreditsPerEpoch: number,
    activeEpochCount: number,
    commission: number,
    selfStakeLamports: number
  ): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [validatorEntry] = pda.findValidatorEntry(voteAccount);
    return this.program.methods
      .scoreValidator(
        new BN(avgCreditsPerEpoch),
        activeEpochCount,
        commission,
        new BN(selfStakeLamports)
      )
      .accounts({
        config,
        validatorEntry,
        voteAccountInfo: voteAccount,
      })
      .rpc();
  }

  async updateSharePrice(poolStakeAccounts: PublicKey[]): Promise<string> {
    const [config] = pda.findProtocolConfig();
    return this.program.methods
      .updateSharePrice()
      .accounts({ config })
      .remainingAccounts(
        poolStakeAccounts.map((k) => ({ pubkey: k, isSigner: false, isWritable: false }))
      )
      .rpc();
  }

  // ---- xNFT Core ----

  async mintXnft(
    stakeLamports: number,
    yieldMode: YieldMode
  ): Promise<{ sig: string; assetId: PublicKey; xnftState: PublicKey }> {
    const [config] = pda.findProtocolConfig();
    const configAccount = await this.program.account.protocolConfig.fetch(config);
    const nonce = configAccount.totalMinted.toNumber();

    const [assetIdAccount] = pda.findAssetId(nonce);
    const [xnftState] = pda.findXNftState(assetIdAccount);
    const [stakePool] = pda.findStakePool();
    const [reserve] = pda.findReserve();

    const sig = await this.program.methods
      .mintXnft(new BN(stakeLamports), yieldMode)
      .accounts({
        config,
        stakePool,
        assetIdAccount,
        xnftState,
        reserve,
        owner: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { sig, assetId: assetIdAccount, xnftState };
  }

  async transferXnft(assetId: PublicKey, newOwner: PublicKey): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [xnftState] = pda.findXNftState(assetId);
    return this.program.methods
      .transferXnft()
      .accounts({
        config,
        xnftState,
        newOwner,
        owner: this.provider.wallet.publicKey,
      })
      .rpc();
  }

  async harvest(xnftState: PublicKey): Promise<string> {
    const [config] = pda.findProtocolConfig();
    return this.program.methods
      .harvest()
      .accounts({ config, xnftState })
      .rpc();
  }

  async withdrawYield(xnftState: PublicKey, amount?: number): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [stakePool] = pda.findStakePool();
    const [reserve] = pda.findReserve();
    const state = await this.program.account.xNftState.fetch(xnftState);
    return this.program.methods
      .withdrawYield(amount ? new BN(amount) : null)
      .accounts({
        config,
        stakePool,
        xnftState,
        reserve,
        owner: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async beginRedeem(assetId: PublicKey): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [stakePool] = pda.findStakePool();
    const [xnftState] = pda.findXNftState(assetId);
    const [redeemEscrow] = pda.findRedeemEscrow(xnftState);
    return this.program.methods
      .beginRedeem()
      .accounts({
        config,
        stakePool,
        xnftState,
        redeemEscrow,
        owner: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async completeRedeem(assetId: PublicKey): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [stakePool] = pda.findStakePool();
    const [xnftState] = pda.findXNftState(assetId);
    const [redeemEscrow] = pda.findRedeemEscrow(xnftState);
    const [reserve] = pda.findReserve();
    return this.program.methods
      .completeRedeem()
      .accounts({
        config,
        stakePool,
        xnftState,
        redeemEscrow,
        reserve,
        owner: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  // ---- Sessions ----

  async createSession(
    xnftState: PublicKey,
    sessionKey: PublicKey,
    allowedProgramIds: PublicKey[],
    params: SessionParams,
    profileId?: Uint8Array
  ): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [sessionAccount] = pda.findSessionAccount(xnftState, sessionKey);

    let authorityProfile: PublicKey | null = null;
    if (profileId) {
      const [profile] = pda.findAuthorityProfile(this.provider.wallet.publicKey, profileId);
      authorityProfile = profile;
    }

    return this.program.methods
      .createSession(sessionKey, allowedProgramIds, params)
      .accounts({
        config,
        xnftState,
        sessionAccount,
        authorityProfile,
        owner: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async revokeSession(xnftState: PublicKey, sessionKey: PublicKey): Promise<string> {
    const [sessionAccount] = pda.findSessionAccount(xnftState, sessionKey);
    return this.program.methods
      .revokeSession()
      .accounts({ xnftState, sessionAccount, owner: this.provider.wallet.publicKey })
      .rpc();
  }

  // ---- Yield Spend ----

  async yieldSpend(
    xnftState: PublicKey,
    sessionKeypair: { publicKey: PublicKey; sign: (tx: any) => any },
    callingProgram: PublicKey,
    amount: number,
    destination: PublicKey,
    appRegistry?: PublicKey
  ): Promise<string> {
    const [config] = pda.findProtocolConfig();
    const [stakePool] = pda.findStakePool();
    const [reserve] = pda.findReserve();
    const [sessionAccount] = pda.findSessionAccount(xnftState, sessionKeypair.publicKey);

    return this.program.methods
      .yieldSpend(new BN(amount))
      .accounts({
        config,
        stakePool,
        xnftState,
        sessionAccount,
        callingProgram,
        appRegistry: appRegistry ?? null,
        reserve,
        destination,
        sessionSigner: sessionKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  // ---- Getters ----

  async getXNftState(xnftState: PublicKey) {
    return this.program.account.xNftState.fetch(xnftState);
  }

  async getProtocolConfig() {
    const [config] = pda.findProtocolConfig();
    return this.program.account.protocolConfig.fetch(config);
  }

  async getPendingGain(xnftState: PublicKey): Promise<BN> {
    const state = await this.getXNftState(xnftState);
    const [config] = pda.findProtocolConfig();
    const configData = await this.program.account.protocolConfig.fetch(config);

    const currentValue = state.shares
      .mul(configData.currentSharePrice)
      .div(SHARE_PRECISION);
    const lastValue = state.shares
      .mul(state.lastSharePrice)
      .div(SHARE_PRECISION);
    return currentValue.sub(lastValue).add(state.accruedGain);
  }
}
