import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { Vow } from "../target/types/vow";
import * as pda from "../sdk/src/pda";
import {
  setupProvider,
  getProgram,
  airdrop,
  initializeProtocol,
} from "./helpers";

describe("00 — Protocol Initialization", () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Vow>;
  let admin: anchor.web3.Keypair;

  before(async () => {
    provider = await setupProvider();
    program = getProgram(provider);
    admin = (provider.wallet as anchor.Wallet).payer;
    await initializeProtocol(program, admin);
  });

  it("initializes protocol config", async () => {
    const [configPda] = pda.findProtocolConfig();
    const config = await program.account.protocolConfig.fetch(configPda);
    expect(config.admin.toBase58()).to.equal(admin.publicKey.toBase58());
    expect(config.paused).to.be.false;
  });

  it("stores reserve_bump in config", async () => {
    const [configPda] = pda.findProtocolConfig();
    const config = await program.account.protocolConfig.fetch(configPda);
    expect(config.reserveBump).to.be.a("number");
    expect(config.reserveBump).to.be.greaterThan(200); // typical PDA bump range
  });

  it("rejects admin actions from non-admin", async () => {
    const [configPda] = pda.findProtocolConfig();
    const nonAdmin = Keypair.generate();
    await airdrop(provider.connection, nonAdmin.publicKey);

    try {
      await program.methods
        .pauseProtocol()
        .accounts({ config: configPda, admin: nonAdmin.publicKey })
        .signers([nonAdmin])
        .rpc();
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.toString()).to.include("Unauthorized");
    }
  });

  it("allows permissionless app registration", async () => {
    const appProgramId = Keypair.generate().publicKey;
    const [appRegistry] = pda.findAppRegistry(appProgramId);
    const payer = Keypair.generate();
    await airdrop(provider.connection, payer.publicKey);

    await program.methods
      .registerApp(appProgramId)
      .accounts({ appRegistry, payer: payer.publicKey, systemProgram: SystemProgram.programId })
      .signers([payer])
      .rpc();

    const reg = await program.account.appRegistry.fetch(appRegistry);
    expect(reg.verified).to.be.false;
    expect(reg.blocked).to.be.false;
  });
});
