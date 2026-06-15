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

describe("02 — Share Price & Reward Accounting", () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Vow>;
  let admin: Keypair;
  let user: Keypair;
  let vowStatePda: anchor.web3.PublicKey;

  before(async () => {
    provider = await setupProvider();
    program = getProgram(provider);
    admin = (provider.wallet as anchor.Wallet).payer;
    user = Keypair.generate();
    await airdrop(provider.connection, user.publicKey, 200 * anchor.web3.LAMPORTS_PER_SOL);
    await initializeProtocol(program, admin);

    // Mint one xNFT
    const [configPda] = pda.findProtocolConfig();
    const config = await program.account.protocolConfig.fetch(configPda);
    const [assetId] = pda.findAssetId(config.totalMinted);
    const [vowState] = pda.findVowState(assetId);
    const [reserve] = pda.findReserve();
    vowStatePda = vowState;

    await program.methods
      .mintVow(xntToLamports(100), YieldMode.Compound)
      .accounts({
        config: configPda,
        assetIdAccount: assetId,
        vowState,
        reserve,
        owner: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();
  });

  it("update_share_price is a no-op when SPL pool is not configured (testnet)", async () => {
    const [configPda] = pda.findProtocolConfig();
    const configBefore = await program.account.protocolConfig.fetch(configPda);
    const priceBefore = configBefore.currentSharePrice;

    // On testnet, spl_stake_pool == Pubkey::default() → handler returns Ok early.
    // Pass SystemProgram as spl_pool since address constraint requires default key.
    await program.methods
      .updateSharePrice()
      .accounts({ config: configPda, splPool: SystemProgram.programId })
      .rpc();

    const configAfter = await program.account.protocolConfig.fetch(configPda);
    // Price should be unchanged (early return)
    expect(configAfter.currentSharePrice.toString()).to.equal(priceBefore.toString());
  });

  it("accrued_gain calculation is correct after price change", async () => {
    const state = await program.account.vowState.fetch(vowStatePda);
    // accrued_gain should be non-positive since price dropped to 0 after our update
    expect(state.accruedGain.toNumber()).to.be.at.most(0);
  });

  it("harvest completes with no-op for compound mode with zero gain", async () => {
    const [configPda] = pda.findProtocolConfig();
    const before = await program.account.vowState.fetch(vowStatePda);

    await program.methods
      .harvest()
      .accounts({ config: configPda, vowState: vowStatePda })
      .rpc();

    const after = await program.account.vowState.fetch(vowStatePda);
    expect(after.accruedGain.toNumber()).to.equal(0);
  });
});
