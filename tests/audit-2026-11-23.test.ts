/**
 * Regression tests for the 2026-11-23 audit. Each case is an exploit that succeeded
 * against the previous binary. Runs after protocol.test.ts (shares its initialized config).
 */
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { Vow } from "../target/types/vow";

const XNT = LAMPORTS_PER_SOL;
const SYS = SystemProgram.programId;

describe("audit 2026-11-23 regressions", () => {
  const env = anchor.AnchorProvider.env();
  const provider = new anchor.AnchorProvider(env.connection, env.wallet, { commitment: "confirmed", preflightCommitment: "confirmed" });
  const program = new Program<Vow>((anchor.workspace.Vow as Program<Vow>).idl, provider);
  const conn = provider.connection;
  const admin = (provider.wallet as anchor.Wallet).payer;
  const pda = (s: Buffer[]) => PublicKey.findProgramAddressSync(s, program.programId)[0];
  const b = (s: string) => Buffer.from(s);
  const le4 = (n: number) => { const x = Buffer.alloc(4); x.writeUInt32LE(n); return x; };
  const config = pda([b("config")]), reserve = pda([b("reserve")]);
  const session = (v: PublicKey, i: number) => pda([b("session"), v.toBuffer(), le4(i)]);
  const escrowOf = (v: PublicKey) => pda([b("unstake"), v.toBuffer()]);
  const someProgram = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
  const params = (o: any = {}) => ({ expiryTs: new BN(o.expiry ?? 0), dailyLimit: new BN(o.daily ?? 0), lifetimeLimit: new BN(o.life ?? 0), velocityLimit: 0 });
  let startPrice: BN;

  async function expectErr(p: Promise<unknown>, needle: string) {
    try { await p; } catch (e: any) {
      expect(String(e) + (e.logs ?? []).join("\n")).to.include(needle);
      return;
    }
    expect.fail(`expected ${needle}`);
  }
  async function funded(n = 2000) {
    const k = Keypair.generate();
    await conn.confirmTransaction(await conn.requestAirdrop(k.publicKey, n * XNT), "confirmed");
    return k;
  }
  async function mint(o: Keypair, xnt: number, mode: any = { treasury: {} }) {
    const c = await program.account.protocolConfig.fetch(config);
    const assetIdAccount = pda([b("vow_asset"), c.totalMinted.toArrayLike(Buffer, "le", 8)]);
    const vowState = pda([b("vow"), assetIdAccount.toBuffer()]);
    await program.methods.mintVow(new BN(xnt * XNT), mode).accountsStrict({
      config, assetIdAccount, vowState, reserve, ownerIndex: pda([b("owner_index"), o.publicKey.toBuffer()]),
      owner: o.publicKey, systemProgram: SYS,
    }).signers([o]).rpc();
    return vowState;
  }
  const setPrice = (p: BN) => program.methods.devSetSharePrice(p).accounts({ config, admin: admin.publicKey } as any).rpc();
  const harvest = (v: PublicKey) => program.methods.harvest().accountsStrict({ config, vowState: v }).rpc();
  const unlock = (v: PublicKey) => program.methods.devFastUnlock().accounts({ config, vowState: v, admin: admin.publicKey } as any).rpc();
  const createSession = (o: Keypair, v: PublicKey, i: number, key: PublicKey, progs: PublicKey[], p: any, profile: PublicKey | null = null) =>
    program.methods.createSession(key, progs, p, i).accountsStrict({
      config, vowState: v, sessionAccount: session(v, i), authorityProfile: profile, owner: o.publicKey, systemProgram: SYS,
    });
  const spend = (v: PublicKey, i: number, key: Keypair, dest: PublicKey, amt: number) =>
    program.methods.yieldSpend(new BN(amt)).accountsStrict({
      config, vowState: v, sessionAccount: session(v, i), callingProgram: SYS, appRegistry: pda([b("app"), SYS.toBuffer()]),
      reserve, destination: dest, sessionSigner: key.publicKey, systemProgram: SYS, callerAuthority: null,
    }).signers([key]).rpc();
  const deposit = (v: PublicKey, who: Keypair, amt: number) =>
    program.methods.depositYieldBalance(new BN(amt)).accountsStrict({
      config, vowState: v, reserve, depositor: who.publicKey, systemProgram: SYS, unstakeEscrow: escrowOf(v),
    }).signers([who]).rpc();
  async function profile(o: Keypair, id: string, days: number, progs: PublicKey[]) {
    const idBuf = b(id), authorityProfile = pda([b("authority_profile"), o.publicKey.toBuffer(), idBuf]);
    await program.methods.createAuthorityProfile([...idBuf] as any, {
      defaultDailyLimit: new BN(5 * XNT), defaultLifetimeLimit: new BN(5 * XNT), defaultExpiryDays: days,
      defaultAllowedProgramIds: progs, metadataUri: Buffer.from(""),
    }).accountsStrict({ authorityProfile, wallet: o.publicKey, systemProgram: SYS }).signers([o]).rpc();
    return authorityProfile;
  }

  before(async () => { startPrice = (await program.account.protocolConfig.fetch(config)).currentSharePrice as BN; });
  afterEach(async () => { await setPrice(startPrice); });

  it("H-2: a session inherits its profile's program whitelist", async () => {
    const o = await funded(), key = await funded(1), thief = Keypair.generate();
    const v = await mint(o, 10);
    const prof = await profile(o, "profile1", 30, [someProgram]);
    await createSession(o, v, 0, key.publicKey, [], params(), prof).signers([o]).rpc();
    const s = await program.account.sessionAccount.fetch(session(v, 0));
    expect(s.programCount).to.equal(1);
    expect(s.allowedProgramIds[0].toBase58()).to.equal(someProgram.toBase58());
    await deposit(v, o, XNT);
    await expectErr(spend(v, 0, key, thief.publicKey, 0.5 * XNT), "ProgramNotAllowed");
  });

  it("L-3: a zero-day profile means no expiry, not instantly expired", async () => {
    const o = await funded(), key = await funded(1);
    const v = await mint(o, 5);
    const prof = await profile(o, "profile2", 0, []);
    await createSession(o, v, 0, key.publicKey, [], params(), prof).signers([o]).rpc();
    expect((await program.account.sessionAccount.fetch(session(v, 0))).expiryTs.toNumber()).to.equal(0);
    await deposit(v, o, XNT);
    await spend(v, 0, key, o.publicKey, 1000);
  });

  it("M-2: a price dip and recovery does not create spendable yield", async () => {
    const o = await funded();
    const p = startPrice;
    const v = await mint(o, 10);
    await setPrice(p.divn(2)); await harvest(v);
    await setPrice(p); await harvest(v);
    expect((await program.account.vowState.fetch(v)).yieldBalance.toNumber()).to.equal(0);
    await setPrice(p.muln(11).divn(10)); await harvest(v);       // real gain above the old high
    const y = (await program.account.vowState.fetch(v)).yieldBalance.toNumber();
    expect(y).to.be.closeTo(1 * XNT, 2);
  });

  it("M-3: only the owner can write a commitment record", async () => {
    const o = await funded(), griefer = await funded(5);
    const v = await mint(o, 1);
    const commitmentRecord = pda([b("commitment"), o.publicKey.toBuffer()]);
    const accts = (who: Keypair) => ({ commitmentRecord, vowState: v, crGate: pda([b("cr_commit"), commitmentRecord.toBuffer(), v.toBuffer()]), payer: who.publicKey, systemProgram: SYS });
    await expectErr(program.methods.recordCommitment().accountsStrict(accts(griefer)).signers([griefer]).rpc(), "InvalidOwner");
    await program.methods.recordCommitment().accountsStrict(accts(o)).signers([o]).rpc();
  });

  it("L-2: a session cannot survive re-activation, even in the same transaction", async () => {
    const o = await funded(), oldKey = await funded(1), newKey = await funded(1);
    const v = await mint(o, 2, { compound: {} });
    await unlock(v);
    const esc = escrowOf(v);
    await program.methods.beginUnstake().accountsStrict({ config, vowState: v, unstakeEscrow: esc, owner: o.publicKey, systemProgram: SYS }).signers([o]).rpc();
    const e = (await program.account.unstakeEscrow.fetch(esc)).deactivationEpoch.toNumber();
    while ((await conn.getEpochInfo()).epoch <= e) await new Promise((r) => setTimeout(r, 400));
    await provider.sendAndConfirm(new Transaction().add(
      await createSession(o, v, 0, oldKey.publicKey, [], params()).instruction(),
      await program.methods.completeUnstake().accountsStrict({ config, vowState: v, unstakeEscrow: esc, reserve, owner: o.publicKey, systemProgram: SYS, clock: SYSVAR_CLOCK_PUBKEY }).instruction(),
      await program.methods.activateStake(new BN(2 * XNT), { treasury: {} }).accountsStrict({ config, vowState: v, reserve, owner: o.publicKey, systemProgram: SYS }).instruction(),
    ), [o]);
    await deposit(v, o, 0.1 * XNT);
    await expectErr(spend(v, 0, oldKey, o.publicKey, 1000), "SessionInvalidated");
    // A session created right after re-activation works and can't be closed as invalidated.
    await createSession(o, v, 1, newKey.publicKey, [], params()).signers([o]).rpc();
    await spend(v, 1, newKey, o.publicKey, 1000);
    await expectErr(program.methods.closeSession().accounts({ vowState: v, sessionAccount: session(v, 1), owner: o.publicKey } as any).signers([o]).rpc(), "SessionInactive");
  });

  it("L-4: harvest no longer reverts during an unstake with a settled gain", async () => {
    const o = await funded();
    const v = await mint(o, 3);
    await unlock(v);
    await setPrice(startPrice.muln(6).divn(5));
    await program.methods.beginUnstake().accountsStrict({ config, vowState: v, unstakeEscrow: escrowOf(v), owner: o.publicKey, systemProgram: SYS }).signers([o]).rpc();
    await harvest(v);
    const s = await program.account.vowState.fetch(v);
    expect(s.accruedGain.toNumber()).to.equal(0);
    expect(s.yieldBalance.toNumber()).to.equal(0);
  });
});
