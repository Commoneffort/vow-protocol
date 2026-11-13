/**
 * yield_spend caller-authority fix (CallerNotAuthorized) + blocked-app enforcement.
 *
 * Needs the test-only CPI caller program loaded at MOCK_CALLER_ID. Run via:
 *   tests/run-local-tests.sh
 * (skipped automatically under plain `anchor test`, where the mock isn't deployed).
 */
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";
import { Vow } from "../target/types/vow";

const XNT = LAMPORTS_PER_SOL;
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const BPF_UPGRADEABLE = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

describe("yield_spend — caller authority + blocked apps", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Vow as Program<Vow>;
  const conn = provider.connection;
  const admin = (provider.wallet as anchor.Wallet).payer;
  const mockId = process.env.MOCK_CALLER_ID ? new PublicKey(process.env.MOCK_CALLER_ID) : null;

  const pid = program.programId;
  const pda = (seeds: (Buffer | Uint8Array)[], p = pid) => PublicKey.findProgramAddressSync(seeds, p)[0];
  const configPda = pda([Buffer.from("config")]);
  const reservePda = pda([Buffer.from("reserve")]);
  const le4 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
  const le8 = (n: BN) => n.toArrayLike(Buffer, "le", 8);

  const owner = Keypair.generate();
  const attacker = Keypair.generate();
  const dappTreasury = Keypair.generate();
  const sessionKey = Keypair.generate();
  let vowState: PublicKey;
  let callerAuthority: PublicKey;
  let appRegistry: PublicKey;

  const sessionPda = (idx: number) => pda([Buffer.from("session"), vowState.toBuffer(), le4(idx)]);

  async function expectErr(p: Promise<unknown>, name: string) {
    try {
      await p;
    } catch (e: any) {
      const text = String(e) + "\n" + (e.logs ?? e.transactionLogs ?? []).join("\n");
      expect(text, `expected ${name}`).to.include(name);
      return;
    }
    expect.fail(`expected failure with ${name}, but it succeeded`);
  }

  /** Direct, top-level yield_spend signed only by the session key. */
  function directSpend(idx: number, calling: PublicKey, dest: PublicKey, amount: number, auth: PublicKey | null) {
    return program.methods
      .yieldSpend(new BN(amount))
      .accountsStrict({
        config: configPda,
        vowState,
        sessionAccount: sessionPda(idx),
        callingProgram: calling,
        appRegistry: pda([Buffer.from("app"), calling.toBuffer()]),
        reserve: reservePda,
        destination: dest,
        sessionSigner: sessionKey.publicKey,
        systemProgram: SystemProgram.programId,
        callerAuthority: auth,
      })
      .signers([sessionKey])
      .rpc();
  }

  /** yield_spend via CPI from the mock dApp, which signs with its vow_caller PDA. */
  async function cpiSpend(idx: number, dest: PublicKey, amount: number, registry = appRegistry) {
    const keys = [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: vowState, isSigner: false, isWritable: true },
      { pubkey: sessionPda(idx), isSigner: false, isWritable: true },
      { pubkey: mockId!, isSigner: false, isWritable: false },
      { pubkey: registry, isSigner: false, isWritable: false },
      { pubkey: reservePda, isSigner: false, isWritable: true },
      { pubkey: dest, isSigner: false, isWritable: true },
      { pubkey: sessionKey.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: callerAuthority, isSigner: false, isWritable: false },
      { pubkey: pid, isSigner: false, isWritable: false },
    ];
    const ix = new TransactionInstruction({ programId: mockId!, keys, data: new BN(amount).toArrayLike(Buffer, "le", 8) });
    return provider.sendAndConfirm(new Transaction().add(ix), [sessionKey]);
  }

  async function createSession(idx: number, allowed: PublicKey[], dailyLimit: number) {
    await program.methods
      .createSession(sessionKey.publicKey, allowed, {
        expiryTs: new BN(0),
        dailyLimit: new BN(dailyLimit),
        lifetimeLimit: new BN(0),
        velocityLimit: 0,
      }, idx)
      .accountsStrict({
        config: configPda,
        vowState,
        sessionAccount: sessionPda(idx),
        authorityProfile: null,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
  }

  before(async function () {
    const mockInfo = mockId ? await conn.getAccountInfo(mockId) : null;
    if (!mockInfo?.executable) {
      console.log("    (skipping: MOCK_CALLER_ID not deployed — run tests/run-local-tests.sh)");
      this.skip();
    }
    callerAuthority = pda([Buffer.from("vow_caller")], mockId!);
    appRegistry = pda([Buffer.from("app"), mockId!.toBuffer()]);

    for (const k of [owner, sessionKey]) {
      const sig = await conn.requestAirdrop(k.publicKey, 50 * XNT);
      await conn.confirmTransaction(sig, "confirmed");
    }

    if (!(await conn.getAccountInfo(configPda))) {
      await program.methods
        .initialize(SystemProgram.programId, SystemProgram.programId) // testnet mode
        .accountsStrict({
          config: configPda,
          reserve: reservePda,
          program: pid,
          programData: PublicKey.findProgramAddressSync([pid.toBuffer()], BPF_UPGRADEABLE)[0],
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    const cfg = await program.account.protocolConfig.fetch(configPda);
    const assetId = pda([Buffer.from("vow_asset"), le8(cfg.totalMinted)]);
    vowState = pda([Buffer.from("vow"), assetId.toBuffer()]);
    await program.methods
      .mintVow(new BN(10 * XNT), { treasury: {} })
      .accountsStrict({
        config: configPda,
        assetIdAccount: assetId,
        vowState,
        reserve: reservePda,
        ownerIndex: pda([Buffer.from("owner_index"), owner.publicKey.toBuffer()]),
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    // Top up yield_balance (deposits are spendable just like harvested yield).
    await program.methods
      .depositYieldBalance(new BN(2 * XNT))
      .accountsStrict({
        config: configPda,
        vowState,
        reserve: reservePda,
        depositor: owner.publicKey,
        systemProgram: SystemProgram.programId,
        unstakeEscrow: pda([Buffer.from("unstake"), vowState.toBuffer()]),
      })
      .signers([owner])
      .rpc();

    await createSession(0, [mockId!], 0.3 * XNT);        // agent session, whitelisted to the mock dApp
    await createSession(1, [TOKEN_PROGRAM_ID], 0);       // whitelisted to some other program
    await createSession(2, [], 0.05 * XNT);              // unrestricted (owner opted in)
  });

  it("rejects the exploit: session key names a whitelisted program but pays itself", async () => {
    await expectErr(directSpend(0, mockId!, attacker.publicKey, 0.1 * XNT, null), "CallerNotAuthorized");
    expect(await conn.getBalance(attacker.publicKey)).to.equal(0);
  });

  it("rejects passing the caller PDA without its signature", async () => {
    await expectErr(directSpend(0, mockId!, attacker.publicKey, 0.1 * XNT, callerAuthority), "CallerNotAuthorized");
  });

  it("rejects a caller_authority derived from the wrong program", async () => {
    const wrong = pda([Buffer.from("vow_caller")], TOKEN_PROGRAM_ID);
    await expectErr(directSpend(0, mockId!, attacker.publicKey, 0.1 * XNT, wrong), "CallerNotAuthorized");
  });

  it("allows the whitelisted dApp to spend via CPI", async () => {
    const before = (await program.account.vowState.fetch(vowState)).yieldBalance.toNumber();
    await cpiSpend(0, dappTreasury.publicKey, 0.1 * XNT);
    expect(await conn.getBalance(dappTreasury.publicKey)).to.equal(0.1 * XNT);
    const after = await program.account.vowState.fetch(vowState);
    expect(before - after.yieldBalance.toNumber()).to.equal(0.1 * XNT);
    const s = await program.account.sessionAccount.fetch(sessionPda(0));
    expect(s.spentToday.toNumber()).to.equal(0.1 * XNT);
    expect(s.txCountToday).to.equal(1);
  });

  it("still enforces the daily limit on CPI spends", async () => {
    await expectErr(cpiSpend(0, dappTreasury.publicKey, 0.25 * XNT), "DailyLimitExceeded");
  });

  it("rejects CPI from a program not in the session whitelist", async () => {
    await expectErr(cpiSpend(1, dappTreasury.publicKey, 0.01 * XNT), "ProgramNotAllowed");
  });

  it("unrestricted sessions (program_count = 0) keep direct-spend behavior", async () => {
    const dest = Keypair.generate().publicKey;
    await directSpend(2, SystemProgram.programId, dest, 0.01 * XNT, null);
    expect(await conn.getBalance(dest)).to.equal(0.01 * XNT);
    await expectErr(directSpend(2, SystemProgram.programId, dest, 0.05 * XNT, null), "DailyLimitExceeded");
  });

  it("rejects a substituted app_registry address", async () => {
    const other = pda([Buffer.from("app"), TOKEN_PROGRAM_ID.toBuffer()]);
    await expectErr(cpiSpend(0, dappTreasury.publicKey, 0.01 * XNT, other), "ConstraintSeeds");
  });

  it("blocked apps cannot receive spends (registry can no longer be omitted)", async () => {
    await program.methods.registerApp(mockId!)
      .accountsStrict({ appRegistry, payer: admin.publicKey, systemProgram: SystemProgram.programId })
      .rpc();
    // Registered but not blocked: still works.
    await cpiSpend(0, dappTreasury.publicKey, 0.01 * XNT);

    await program.methods.blockApp()
      .accountsStrict({ appRegistry, config: configPda, admin: admin.publicKey })
      .rpc();
    await expectErr(cpiSpend(0, dappTreasury.publicKey, 0.01 * XNT), "AppBlocked");
  });
});
