/**
 * Core protocol suite (testnet mode: no SPL pool configured, dev_* helpers enabled).
 * Replaces the stale tests/00–06 suite. Run with tests/run-local-tests.sh, which also
 * runs tests/yield-spend-cpi.test.ts. Must run first on a fresh validator (it covers
 * the initialize authority check). Pool / NAV / fairness behavior is covered on a
 * mainnet fork by tests/run-mainnet-fork-test.sh.
 */
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { Vow } from "../target/types/vow";

const XNT = LAMPORTS_PER_SOL;
const BPF_UPGRADEABLE = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const DAY = 86_400;

describe("vow protocol (testnet mode)", () => {
  const env = anchor.AnchorProvider.env();
  const provider = new anchor.AnchorProvider(env.connection, env.wallet, { commitment: "confirmed", preflightCommitment: "confirmed" });
  anchor.setProvider(provider);
  const program = new Program<Vow>((anchor.workspace.Vow as Program<Vow>).idl, provider);
  const conn = provider.connection;
  const pid = program.programId;
  const admin = (provider.wallet as anchor.Wallet).payer;
  const pda = (seeds: Buffer[], p = pid) => PublicKey.findProgramAddressSync(seeds, p)[0];
  const configPda = pda([Buffer.from("config")]);
  const reserve = pda([Buffer.from("reserve")]);
  const programData = pda([pid.toBuffer()], BPF_UPGRADEABLE);
  const ownerIndex = (o: PublicKey) => pda([Buffer.from("owner_index"), o.toBuffer()]);
  const escrowOf = (v: PublicKey) => pda([Buffer.from("unstake"), v.toBuffer()]);

  async function expectErr(p: Promise<unknown>, needle: string) {
    try { await p; } catch (e: any) {
      const text = String(e) + "\n" + (e.logs ?? e.transactionLogs ?? []).join("\n");
      expect(text, `expected ${needle}`).to.include(needle);
      return;
    }
    expect.fail(`expected failure containing ${needle}`);
  }

  async function funded() {
    const k = Keypair.generate();
    await conn.confirmTransaction(await conn.requestAirdrop(k.publicKey, 2_000 * XNT), "confirmed");
    return k;
  }

  function mintIx(owner: Keypair, stake: number, mode: any, totalMinted: BN) {
    const assetId = pda([Buffer.from("vow_asset"), totalMinted.toArrayLike(Buffer, "le", 8)]);
    const vowState = pda([Buffer.from("vow"), assetId.toBuffer()]);
    return {
      vowState,
      call: program.methods.mintVow(new BN(stake), mode).accountsStrict({
        config: configPda, assetIdAccount: assetId, vowState, reserve,
        ownerIndex: ownerIndex(owner.publicKey), owner: owner.publicKey, systemProgram: SystemProgram.programId,
      }).signers([owner]),
    };
  }

  async function mint(owner: Keypair, stake: number, mode: any = { treasury: {} }) {
    const c = await program.account.protocolConfig.fetch(configPda);
    const m = mintIx(owner, stake, mode, c.totalMinted);
    await m.call.rpc();
    return m.vowState;
  }

  const setPrice = (p: BN) =>
    program.methods.devSetSharePrice(p).accountsStrict({ config: configPda, admin: admin.publicKey }).rpc();
  const fastUnlock = (v: PublicKey) =>
    program.methods.devFastUnlock().accountsStrict({ config: configPda, vowState: v, admin: admin.publicKey }).rpc();
  const harvest = (v: PublicKey) =>
    program.methods.harvest().accountsStrict({ config: configPda, vowState: v }).rpc();
  const begin = (v: PublicKey, o: Keypair) =>
    program.methods.beginUnstake().accountsStrict({
      config: configPda, vowState: v, unstakeEscrow: escrowOf(v), owner: o.publicKey, systemProgram: SystemProgram.programId,
    }).signers([o]).rpc();
  const complete = (v: PublicKey, o: Keypair) =>
    program.methods.completeUnstake().accountsStrict({
      config: configPda, vowState: v, unstakeEscrow: escrowOf(v), reserve, owner: o.publicKey,
      systemProgram: SystemProgram.programId, clock: SYSVAR_CLOCK_PUBKEY,
    }).signers([o]).rpc();
  async function nextEpoch() {
    const start = (await conn.getEpochInfo()).epoch;
    while ((await conn.getEpochInfo()).epoch <= start) await new Promise((r) => setTimeout(r, 1000));
  }

  // ── Admin / init ──────────────────────────────────────────────────────────

  it("only the upgrade authority can initialize", async () => {
    expect(await conn.getAccountInfo(configPda), "run on a fresh validator").to.be.null;
    const outsider = await funded();
    await expectErr(
      program.methods.initialize(SystemProgram.programId, SystemProgram.programId).accountsStrict({
        config: configPda, reserve, program: pid, programData, admin: outsider.publicKey, systemProgram: SystemProgram.programId,
      }).signers([outsider]).rpc(),
      "Unauthorized"
    );
    await program.methods.initialize(SystemProgram.programId, SystemProgram.programId).accountsStrict({
      config: configPda, reserve, program: pid, programData, admin: admin.publicKey, systemProgram: SystemProgram.programId,
    }).rpc();
    const c = await program.account.protocolConfig.fetch(configPda);
    expect(c.admin.toBase58()).to.equal(admin.publicKey.toBase58());
    expect(c.reserveBump).to.be.greaterThan(0);
  });

  it("removed the config-close footgun", () => {
    const names = program.idl.instructions.map((i) => i.name);
    expect(names).to.not.include("close_protocol_config");
    expect(names.some((n) => n.includes("transfer"))).to.be.false; // soulbound: no transfer path
  });

  it("set_admin requires the new admin to co-sign", async () => {
    const next = await funded();
    // Without the new admin's signature the transaction can't even be built/sent.
    await expectErr(
      program.methods.setAdmin().accountsStrict({ config: configPda, admin: admin.publicKey, newAdmin: next.publicKey }).rpc(),
      "Signature verification failed"
    );
    // Non-admin can't do it even with both signatures.
    await expectErr(
      program.methods.setAdmin().accountsStrict({ config: configPda, admin: next.publicKey, newAdmin: next.publicKey })
        .signers([next]).rpc(),
      "Unauthorized"
    );
    // Round-trip: admin → next → admin.
    await program.methods.setAdmin().accountsStrict({ config: configPda, admin: admin.publicKey, newAdmin: next.publicKey })
      .signers([next]).rpc();
    await program.methods.setAdmin().accountsStrict({ config: configPda, admin: next.publicKey, newAdmin: admin.publicKey })
      .signers([next, admin]).rpc();
    expect((await program.account.protocolConfig.fetch(configPda)).admin.toBase58()).to.equal(admin.publicKey.toBase58());
  });

  it("app registration is permissionless; verify/block are admin-only", async () => {
    const app = Keypair.generate().publicKey;
    const appRegistry = pda([Buffer.from("app"), app.toBuffer()]);
    const rando = await funded();
    await program.methods.registerApp(app).accountsStrict({ appRegistry, payer: rando.publicKey, systemProgram: SystemProgram.programId })
      .signers([rando]).rpc();
    await expectErr(
      program.methods.blockApp().accountsStrict({ appRegistry, config: configPda, admin: rando.publicKey }).signers([rando]).rpc(),
      "Unauthorized"
    );
    await program.methods.blockApp().accountsStrict({ appRegistry, config: configPda, admin: admin.publicKey }).rpc();
    expect((await program.account.appRegistry.fetch(appRegistry)).blocked).to.be.true;
  });

  // ── Mint / identity ───────────────────────────────────────────────────────

  it("mints an identity with correct class, shares and reputation fields", async () => {
    const o = await funded();
    const v = await mint(o, 150 * XNT);
    const s = await program.account.vowState.fetch(v);
    expect(s.class).to.equal(1); // Opal
    expect(s.shares.toString()).to.equal((150n * BigInt(XNT)).toString()); // price 1.0, no pool fees on testnet
    expect(s.activeStake).to.be.true;
    expect(s.totalCommitments).to.equal(1);
    expect(s.highestClassEver).to.equal(1);
    const idx = await program.account.ownerIndex.fetch(ownerIndex(o.publicKey));
    expect(idx.vowState.toBase58()).to.equal(v.toBase58());
  });

  it("rejects stake below 1 XNT", async () => {
    const o = await funded();
    const c = await program.account.protocolConfig.fetch(configPda);
    await expectErr(mintIx(o, XNT / 2, { compound: {} }, c.totalMinted).call.rpc(), "InsufficientStake");
  });

  it("one identity per wallet", async () => {
    const o = await funded();
    await mint(o, 5 * XNT);
    await expectErr(mint(o, 5 * XNT), "already in use");
  });

  it("every top-up re-locks the whole position (no same-class lock skip)", async () => {
    const o = await funded();
    const v = await mint(o, 10 * XNT);
    await fastUnlock(v);
    await harvest(v); // marks matured
    expect((await program.account.vowState.fetch(v)).matured).to.be.true;
    await program.methods.addStake(new BN(50 * XNT)).accountsStrict({
      config: configPda, vowState: v, reserve, owner: o.publicKey, systemProgram: SystemProgram.programId,
    }).signers([o]).rpc();
    const s = await program.account.vowState.fetch(v);
    const now = (await conn.getBlockTime(await conn.getSlot()))!;
    expect(s.class).to.equal(0); // still Ruby
    expect(s.matured).to.be.false;
    expect(s.unlockAt.toNumber()).to.be.closeTo(now + 30 * DAY, 120);
    await expectErr(begin(v, o), "NotMatured");
  });

  // ── Yield ─────────────────────────────────────────────────────────────────

  it("treasury harvest credits exactly the gain; compound keeps it in shares", async () => {
    const t = await funded(), k = await funded();
    const vt = await mint(t, 20 * XNT, { treasury: {} });
    const vk = await mint(k, 20 * XNT, { compound: {} });
    const p0 = (await program.account.protocolConfig.fetch(configPda)).currentSharePrice;
    await setPrice(p0.muln(11).divn(10)); // +10%
    await harvest(vt);
    await harvest(vk);
    const st = await program.account.vowState.fetch(vt);
    const sk = await program.account.vowState.fetch(vk);
    expect(st.yieldBalance.toNumber()).to.be.closeTo(2 * XNT, 2);
    expect(sk.yieldBalance.toNumber()).to.equal(0);
    expect(sk.shares.toString()).to.equal((20n * BigInt(XNT)).toString());
    // Withdraw the treasury yield.
    const before = await conn.getBalance(t.publicKey);
    await program.methods.withdrawYield(null).accountsStrict({
      config: configPda, vowState: vt, reserve, owner: t.publicKey, systemProgram: SystemProgram.programId,
    }).signers([t]).rpc();
    expect((await conn.getBalance(t.publicKey)) - before).to.equal(st.yieldBalance.toNumber());
    await setPrice(p0); // restore for later tests
  });

  // ── Sessions ──────────────────────────────────────────────────────────────

  it("session lifecycle: create, duplicate index, non-owner, revoke, close rules", async () => {
    const o = await funded();
    const v = await mint(o, 3 * XNT);
    const sess = (i: number) => pda([Buffer.from("session"), v.toBuffer(), Buffer.from(new Uint32Array([i]).buffer)]);
    const create = (i: number, signer: Keypair, expiry = 0) =>
      program.methods.createSession(Keypair.generate().publicKey, [], {
        expiryTs: new BN(expiry), dailyLimit: new BN(XNT), lifetimeLimit: new BN(0), velocityLimit: 0,
      }, i).accountsStrict({
        config: configPda, vowState: v, sessionAccount: sess(i), authorityProfile: null,
        owner: signer.publicKey, systemProgram: SystemProgram.programId,
      }).signers([signer]).rpc();
    await create(0, o);
    await expectErr(create(0, o), "already in use");
    await expectErr(create(1, await funded()), "InvalidOwner");
    const close = () => program.methods.closeSession()
      .accountsStrict({ vowState: v, sessionAccount: sess(0), owner: o.publicKey }).signers([o]).rpc();
    await expectErr(close(), "SessionInactive"); // expiry 0 = never expires → not closable while active
    await program.methods.revokeSession().accountsStrict({ vowState: v, sessionAccount: sess(0), owner: o.publicKey })
      .signers([o]).rpc();
    expect((await program.account.sessionAccount.fetch(sess(0))).active).to.be.false;
    await close();
    expect(await conn.getAccountInfo(sess(0))).to.be.null;
  });

  // ── Unstake / dormancy ────────────────────────────────────────────────────

  it("unstake pays exactly what was locked in, identity persists as dormant", async () => {
    const o = await funded();
    const v = await mint(o, 25 * XNT, { hybrid: {} });
    await expectErr(begin(v, o), "NotMatured");
    await fastUnlock(v);
    await begin(v, o);
    const owed = (await program.account.unstakeEscrow.fetch(escrowOf(v))).lamportsOwed.toNumber();
    expect(owed).to.equal(25 * XNT);
    await expectErr(
      program.methods.addStake(new BN(XNT)).accountsStrict({
        config: configPda, vowState: v, reserve, owner: o.publicKey, systemProgram: SystemProgram.programId,
      }).signers([o]).rpc(),
      "AlreadyUnstaking"
    );
    await nextEpoch();
    const escrowRent = await conn.getBalance(escrowOf(v));
    const before = await conn.getBalance(o.publicKey);
    await complete(v, o);
    expect((await conn.getBalance(o.publicKey)) - before - escrowRent).to.equal(owed);

    const s = await program.account.vowState.fetch(v);
    expect(s.activeStake).to.be.false;
    expect(s.totalFulfilled).to.equal(1);
    expect(s.owner.toBase58()).to.equal(o.publicKey.toBase58()); // credential persists

    // Dormant: no sessions; re-activation works and bumps reputation.
    const stranger = await funded();
    await expectErr(
      program.methods.activateStake(new BN(2 * XNT), { compound: {} }).accountsStrict({
        config: configPda, vowState: v, reserve, owner: stranger.publicKey, systemProgram: SystemProgram.programId,
      }).signers([stranger]).rpc(),
      "InvalidOwner"
    );
    await program.methods.activateStake(new BN(2 * XNT), { compound: {} }).accountsStrict({
      config: configPda, vowState: v, reserve, owner: o.publicKey, systemProgram: SystemProgram.programId,
    }).signers([o]).rpc();
    const a = await program.account.vowState.fetch(v);
    expect(a.activeStake).to.be.true;
    expect(a.totalCommitments).to.equal(2);
    await expectErr(
      program.methods.activateStake(new BN(2 * XNT), { compound: {} }).accountsStrict({
        config: configPda, vowState: v, reserve, owner: o.publicKey, systemProgram: SystemProgram.programId,
      }).signers([o]).rpc(),
      "IdentityAlreadyActive"
    );
  });

  // ── Reputation ────────────────────────────────────────────────────────────

  it("commitment score: fulfilled can't exceed committed, records are one-shot", async () => {
    const o = await funded();
    const v = await mint(o, 1 * XNT);
    const record = pda([Buffer.from("commitment"), o.publicKey.toBuffer()]);
    const commit = () => program.methods.recordCommitment().accountsStrict({
      commitmentRecord: record, vowState: v,
      crGate: pda([Buffer.from("cr_commit"), record.toBuffer(), v.toBuffer()]),
      payer: o.publicKey, systemProgram: SystemProgram.programId,
    }).signers([o]).rpc();
    const fulfill = () => program.methods.recordFulfillment().accountsStrict({
      commitmentRecord: record, vowState: v,
      crGate: pda([Buffer.from("cr_fulfill"), record.toBuffer(), v.toBuffer()]),
      payer: o.publicKey, systemProgram: SystemProgram.programId,
    }).signers([o]).rpc();
    await commit();
    await expectErr(commit(), "already in use");
    await fastUnlock(v);
    await harvest(v);
    // The old inflation path: top up 99 XNT after maturity, then record fulfillment.
    await program.methods.addStake(new BN(99 * XNT)).accountsStrict({
      config: configPda, vowState: v, reserve, owner: o.publicKey, systemProgram: SystemProgram.programId,
    }).signers([o]).rpc();
    await expectErr(fulfill(), "NotMatured"); // top-up re-locked the position
    await fastUnlock(v);
    await harvest(v);
    await fulfill();
    const r = await program.account.commitmentRecord.fetch(record);
    // fulfilled (100 XNT) > committed (1 XNT) — ratio capped at 100%, not 10,000%.
    expect(r.commitmentScore).to.equal(0 * 100 + 1 * 10 + 100);
  });
});
