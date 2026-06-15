import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { Vow } from "../target/types/vow";
import * as pda from "../sdk/src/pda";
import { SHARE_PRECISION } from "../sdk/src/types";
import {
  setupProvider,
  getProgram,
  airdrop,
  initializeProtocol,
  xntToLamports,
  YieldMode,
} from "./helpers";

describe("03 — Harvest (Compound / Hybrid / Treasury)", () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Vow>;
  let admin: Keypair;

  before(async () => {
    provider = await setupProvider();
    program = getProgram(provider);
    admin = (provider.wallet as anchor.Wallet).payer;
    await initializeProtocol(program, admin);
  });

  async function mintAndSetupPrice(user: Keypair, mode: any, priceMultiplierBps: number) {
    const [configPda] = pda.findProtocolConfig();
    const config = await program.account.protocolConfig.fetch(configPda);
    const [assetId] = pda.findAssetId(config.totalMinted);
    const [vowState] = pda.findVowState(assetId);
    const [reserve] = pda.findReserve();

    await program.methods
      .mintVow(xntToLamports(1000), mode)
      .accounts({
        config: configPda, assetIdAccount: assetId, vowState,
        reserve, owner: user.publicKey, systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    return { assetId, vowState };
  }

  it("compound harvest resets accrued_gain without touching shares", async () => {
    const user = Keypair.generate();
    await airdrop(provider.connection, user.publicKey, 2000 * anchor.web3.LAMPORTS_PER_SOL);
    const { vowState } = await mintAndSetupPrice(user, YieldMode.Compound, 0);
    const [configPda] = pda.findProtocolConfig();
    const stateBefore = await program.account.vowState.fetch(vowState);
    const sharesBefore = stateBefore.shares;

    await program.methods.harvest()
      .accounts({ config: configPda, vowState })
      .rpc();

    const stateAfter = await program.account.vowState.fetch(vowState);
    expect(stateAfter.accruedGain.toNumber()).to.equal(0);
    expect(stateAfter.shares.toString()).to.equal(sharesBefore.toString()); // no shares burned
  });

  it("treasury harvest with no gain does not change yield_balance", async () => {
    const user = Keypair.generate();
    await airdrop(provider.connection, user.publicKey, 2000 * anchor.web3.LAMPORTS_PER_SOL);
    const { vowState } = await mintAndSetupPrice(user, YieldMode.Treasury, 0);
    const [configPda] = pda.findProtocolConfig();

    await program.methods.harvest()
      .accounts({ config: configPda, vowState })
      .rpc();

    const state = await program.account.vowState.fetch(vowState);
    expect(state.yieldBalance.toNumber()).to.equal(0); // no gain to credit
  });

  it("hybrid harvest with no gain does not change yield_balance", async () => {
    const user = Keypair.generate();
    await airdrop(provider.connection, user.publicKey, 2000 * anchor.web3.LAMPORTS_PER_SOL);
    const { vowState } = await mintAndSetupPrice(user, YieldMode.Hybrid, 0);
    const [configPda] = pda.findProtocolConfig();

    await program.methods.harvest()
      .accounts({ config: configPda, vowState })
      .rpc();

    const state = await program.account.vowState.fetch(vowState);
    expect(state.yieldBalance.toNumber()).to.equal(0);
  });
});
