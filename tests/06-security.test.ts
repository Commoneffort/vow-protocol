import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Keypair, SystemProgram, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { Vow } from "../target/types/vow";
import * as pda from "../sdk/src/pda";
import {
  setupProvider,
  getProgram,
  airdrop,
  initializeProtocol,
  xntToLamports,
  YieldMode,
} from "./helpers";

describe("06 — Security Tests", () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Vow>;
  let admin: Keypair;

  before(async () => {
    provider = await setupProvider();
    program = getProgram(provider);
    admin = (provider.wallet as anchor.Wallet).payer;
    await initializeProtocol(program, admin);
  });

  it("paused protocol rejects minting", async () => {
    const [configPda] = pda.findProtocolConfig();
    await program.methods.pauseProtocol()
      .accounts({ config: configPda, admin: admin.publicKey })
      .signers([admin])
      .rpc();

    const user = Keypair.generate();
    await airdrop(provider.connection, user.publicKey, 20 * anchor.web3.LAMPORTS_PER_SOL);
    const config = await program.account.protocolConfig.fetch(configPda);
    const [assetId] = pda.findAssetId(config.totalMinted);
    const [vowState] = pda.findVowState(assetId);
    const [reserve] = pda.findReserve();

    try {
      await program.methods
        .mintVow(xntToLamports(10), YieldMode.Compound)
        .accounts({
          config: configPda, assetIdAccount: assetId, vowState,
          reserve, owner: user.publicKey, systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.toString()).to.include("ProtocolPaused");
    }

    // Resume
    await program.methods.resumeProtocol()
      .accounts({ config: configPda, admin: admin.publicKey })
      .signers([admin])
      .rpc();
  });

  it("blocked app cannot receive yield spend", async () => {
    const appProgram = Keypair.generate().publicKey;
    const [appRegistry] = pda.findAppRegistry(appProgram);
    const payer = Keypair.generate();
    await airdrop(provider.connection, payer.publicKey);

    // Register and block the app
    await program.methods.registerApp(appProgram)
      .accounts({ appRegistry, payer: payer.publicKey, systemProgram: SystemProgram.programId })
      .signers([payer])
      .rpc();

    const [configPda] = pda.findProtocolConfig();
    await program.methods.blockApp()
      .accounts({ appRegistry, config: configPda, admin: admin.publicKey })
      .signers([admin])
      .rpc();

    const reg = await program.account.appRegistry.fetch(appRegistry);
    expect(reg.blocked).to.be.true;
  });

  it("cannot redeem before maturity", async () => {
    const owner = Keypair.generate();
    await airdrop(provider.connection, owner.publicKey, 20 * anchor.web3.LAMPORTS_PER_SOL);
    const [configPda] = pda.findProtocolConfig();
    const config = await program.account.protocolConfig.fetch(configPda);
    const [assetId] = pda.findAssetId(config.totalMinted);
    const [vowState] = pda.findVowState(assetId);
    const [reserve] = pda.findReserve();
    const [unstakeEscrow] = pda.findUnstakeEscrow(vowState);

    await program.methods
      .mintVow(xntToLamports(10), YieldMode.Compound)
      .accounts({
        config: configPda, assetIdAccount: assetId, vowState,
        reserve, owner: owner.publicKey, systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    try {
      await program.methods
        .beginUnstake()
        .accounts({
          config: configPda, vowState, unstakeEscrow,
          owner: owner.publicKey, systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.toString()).to.include("NotMatured");
    }
  });
});
