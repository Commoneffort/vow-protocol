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

describe("04 — Session Authority", () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Vow>;
  let admin: Keypair;
  let owner: Keypair;
  let vowStatePda: PublicKey;
  let sessionKey: Keypair;
  const SESSION_INDEX = 0;

  before(async () => {
    provider = await setupProvider();
    program = getProgram(provider);
    admin = (provider.wallet as anchor.Wallet).payer;
    owner = Keypair.generate();
    await airdrop(provider.connection, owner.publicKey, 20 * anchor.web3.LAMPORTS_PER_SOL);
    await initializeProtocol(program, admin);

    const [configPda] = pda.findProtocolConfig();
    const config = await program.account.protocolConfig.fetch(configPda);
    const [assetId] = pda.findAssetId(config.totalMinted);
    const [vowState] = pda.findVowState(assetId);
    const [reserve] = pda.findReserve();
    vowStatePda = vowState;

    await program.methods
      .mintVow(xntToLamports(10), YieldMode.Compound)
      .accounts({
        config: configPda, assetIdAccount: assetId, vowState,
        reserve, owner: owner.publicKey, systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    sessionKey = Keypair.generate();
  });

  it("creates a session with allowed_program_ids", async () => {
    const [configPda] = pda.findProtocolConfig();
    const [sessionAccount] = pda.findSessionAccount(vowStatePda, SESSION_INDEX);
    const gameProgram = Keypair.generate().publicKey;
    const clock = await provider.connection.getBlockTime(await provider.connection.getSlot());
    const expiryTs = new BN((clock ?? 0) + 3600);

    await program.methods
      .createSession(
        sessionKey.publicKey,
        [gameProgram],
        {
          expiryTs,
          dailyLimit: new BN(1_000_000_000),
          lifetimeLimit: new BN(10_000_000_000),
          velocityLimit: 100,
        },
        SESSION_INDEX,
      )
      .accounts({
        config: configPda,
        vowState: vowStatePda,
        sessionAccount,
        authorityProfile: null,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    const sess = await program.account.sessionAccount.fetch(sessionAccount);
    expect(sess.active).to.be.true;
    expect(sess.sessionKey.toBase58()).to.equal(sessionKey.publicKey.toBase58());
    expect(sess.sessionIndex).to.equal(SESSION_INDEX);
    expect(sess.programCount).to.equal(1);
    expect(sess.allowedProgramIds[0].toBase58()).to.equal(gameProgram.toBase58());
    expect(sess.dailyLimit.toNumber()).to.equal(1_000_000_000);
  });

  it("rejects duplicate session_index (PDA already exists)", async () => {
    const [configPda] = pda.findProtocolConfig();
    const [sessionAccount] = pda.findSessionAccount(vowStatePda, SESSION_INDEX);
    const clock = await provider.connection.getBlockTime(await provider.connection.getSlot());

    try {
      await program.methods
        .createSession(
          Keypair.generate().publicKey,
          [],
          { expiryTs: new BN((clock ?? 0) + 3600), dailyLimit: new BN(0), lifetimeLimit: new BN(0), velocityLimit: 0 },
          SESSION_INDEX, // same index — should fail (account already initialized)
        )
        .accounts({ config: configPda, vowState: vowStatePda, sessionAccount, authorityProfile: null, owner: owner.publicKey, systemProgram: SystemProgram.programId })
        .signers([owner])
        .rpc();
      expect.fail("Should have thrown");
    } catch (e: any) {
      // Anchor rejects init on an existing account
      expect(e.toString()).to.match(/already in use|already been initialized|0x0/i);
    }
  });

  it("revokes a session", async () => {
    const [sessionAccount] = pda.findSessionAccount(vowStatePda, SESSION_INDEX);

    await program.methods
      .revokeSession()
      .accounts({
        vowState: vowStatePda,
        sessionAccount,
        owner: owner.publicKey,
      })
      .signers([owner])
      .rpc();

    const sess = await program.account.sessionAccount.fetch(sessionAccount);
    expect(sess.active).to.be.false;
  });

  it("rejects session creation from non-owner", async () => {
    const attacker = Keypair.generate();
    await airdrop(provider.connection, attacker.publicKey);
    const [configPda] = pda.findProtocolConfig();
    const newIdx = 99;
    const [sessionAccount] = pda.findSessionAccount(vowStatePda, newIdx);
    const clock = await provider.connection.getBlockTime(await provider.connection.getSlot());

    try {
      await program.methods
        .createSession(
          Keypair.generate().publicKey,
          [Keypair.generate().publicKey],
          { expiryTs: new BN((clock ?? 0) + 3600), dailyLimit: new BN(0), lifetimeLimit: new BN(0), velocityLimit: 0 },
          newIdx,
        )
        .accounts({ config: configPda, vowState: vowStatePda, sessionAccount, authorityProfile: null, owner: attacker.publicKey, systemProgram: SystemProgram.programId })
        .signers([attacker])
        .rpc();
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.toString()).to.include("InvalidOwner");
    }
  });

  it("session with expiry_ts == 0 is not treated as expired (close rejected)", async () => {
    // Create a second session with no expiry
    const [configPda] = pda.findProtocolConfig();
    const noExpiryIdx = 1;
    const [sessionAccount] = pda.findSessionAccount(vowStatePda, noExpiryIdx);

    await program.methods
      .createSession(
        Keypair.generate().publicKey,
        [],
        { expiryTs: new BN(0), dailyLimit: new BN(0), lifetimeLimit: new BN(0), velocityLimit: 0 },
        noExpiryIdx,
      )
      .accounts({ config: configPda, vowState: vowStatePda, sessionAccount, authorityProfile: null, owner: owner.publicKey, systemProgram: SystemProgram.programId })
      .signers([owner])
      .rpc();

    // Attempt to close it — should fail because it's active and not expired
    try {
      await program.methods
        .closeSession()
        .accounts({ vowState: vowStatePda, sessionAccount, owner: owner.publicKey })
        .signers([owner])
        .rpc();
      expect.fail("Should have thrown — session is active and expiry_ts == 0 is not expired");
    } catch (e: any) {
      expect(e.toString()).to.include("SessionInactive");
    }
  });
});
