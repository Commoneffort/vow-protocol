/**
 * Mainnet-fork fairness test — run via tests/run-mainnet-fork-test.sh.
 *
 * Starts from a snapshot of the LIVE protocol (real stake pool, real reserve, real
 * identities with owners swapped for local keys) running the NEW program, and checks:
 *   - value-moving instructions refuse a stale price
 *   - the first NAV update prices every share off real, redeemable assets
 *   - one identity per wallet (with grandfathered legacy identities)
 *   - minting, flushing, depositing and withdrawing are NAV-neutral
 *   - yield stays spendable, the pool can't be drained gratuitously
 *   - EVERY live identity unstakes and is paid exactly shares × price + yield_balance
 *   - afterwards the protocol still covers everything it owes the remaining holder
 */
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
  StakeProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { Vow } from "../target/types/vow";

const WORK = process.env.FORK_WORK_DIR;
const XNT = LAMPORTS_PER_SOL;
const PREC = 1_000_000_000_000n;
const PPM = 1_000_000n;
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const STAKE_POOL_PROGRAM = new PublicKey("XPoo1Fx6KNgeAzFcq2dPTo95bWGUSj5KdPVqYj9CZux");

const big = (x: BN | number | bigint) => BigInt(x.toString());
const fmt = (l: bigint) => (Number(l) / XNT).toFixed(9);

(WORK ? describe : describe.skip)("mainnet fork — fair shares after upgrade", () => {
  const envProvider = anchor.AnchorProvider.env();
  const provider = new anchor.AnchorProvider(envProvider.connection, envProvider.wallet, {
    commitment: "confirmed", preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);
  const program = new Program<Vow>((anchor.workspace.Vow as Program<Vow>).idl, provider);
  const conn = provider.connection;
  const pid = program.programId;
  const pda = (seeds: Buffer[], p = pid) => PublicKey.findProgramAddressSync(seeds, p)[0];
  const configPda = pda([Buffer.from("config")]);
  const reserve = pda([Buffer.from("reserve")]);

  let splPool: PublicKey, poolMint: PublicKey, ata: PublicKey;
  let poolReserveStake: PublicKey, poolManagerFee: PublicKey, poolWithdrawAuthority: PublicKey;
  const ownerKeys = new Map<string, Keypair>(); // local owner pubkey → keypair
  type Ident = { addr: PublicKey; owner: Keypair; nonce: bigint };
  let legacy: Ident[] = [];
  const newUser = Keypair.generate();
  let newVow: PublicKey;
  let rent: bigint;

  const cfg = () => program.account.protocolConfig.fetch(configPda);
  const vow = (a: PublicKey) => program.account.vowState.fetch(a);
  const lamports = async (a: PublicKey) => big(await conn.getBalance(a, "confirmed"));
  const pxnt = async () => big((await conn.getTokenAccountBalance(ata, "confirmed")).value.amount);

  async function pool() {
    const d = (await conn.getAccountInfo(splPool))!.data;
    return { total: d.readBigUInt64LE(259), supply: d.readBigUInt64LE(267) };
  }

  /** Client-side NAV, mirroring pool_math::nav_share_price. */
  async function nav() {
    const c = await cfg();
    const p = await pool();
    const w = PPM - BigInt(c.withdrawalFeePpm), d = PPM - BigInt(c.depositFeePpm);
    const pxVal = (((await pxnt()) * p.total) / p.supply) * w / PPM;
    const liquid = (await lamports(reserve)) - rent;
    const L = big(c.totalYieldClaims) + big(c.totalPendingUnstake);
    const navL = liquid >= L ? pxVal + (((liquid - L) * d) / PPM) * w / PPM : pxVal - (L - liquid);
    return { nav: navL, liabilities: L, shares: big(c.totalShares), price: big(c.currentSharePrice) };
  }

  const updateIx = () =>
    program.methods.updateSharePrice().accountsStrict({
      config: configPda, splPool, reserve, reservePoolTokens: ata, tokenProgram: TOKEN_PROGRAM,
    });
  const update = () => updateIx().rpc();
  const harvest_ = (v: PublicKey) =>
    program.methods.harvest().accountsStrict({ config: configPda, vowState: v }).rpc();

  const flushBuilder = () =>
    program.methods.flushReserveToPool().accountsStrict({
      config: configPda, reserve, reservePoolTokens: ata, splPool,
      poolWithdrawAuthority, poolReserveStake, poolManagerFeeAccount: poolManagerFee,
      poolReferralFeeAccount: ata, poolMint, tokenProgram: TOKEN_PROGRAM,
      systemProgram: SystemProgram.programId, stakePoolProgram: STAKE_POOL_PROGRAM,
    });
  const flush = async () => {
    if (process.env.FORK_DEBUG) {
      const sim = await flushBuilder().simulate().catch((e: any) => e.simulationResponse ?? e);
      console.log("FLUSH-SIM", JSON.stringify(sim.raw ?? sim.logs ?? sim, null, 1));
    }
    return flushBuilder().rpc();
  };

  const withdrawFromPool = () =>
    program.methods.withdrawFromPool().accountsStrict({
      config: configPda, reserve, reservePoolTokens: ata, splPool,
      poolWithdrawAuthority, poolReserveStake, poolManagerFeeAccount: poolManagerFee,
      poolMint, clock: SYSVAR_CLOCK_PUBKEY, stakeHistory: SYSVAR_STAKE_HISTORY_PUBKEY,
      stakeProgram: StakeProgram.programId, tokenProgram: TOKEN_PROGRAM,
      stakePoolProgram: STAKE_POOL_PROGRAM,
    }).rpc();

  /** Top up reserve liquidity from the pool. Retries through the stake program's
   *  EpochRewardsActive window (custom error 0x10) right after an epoch boundary. */
  async function ensureLiquid() {
    let calls = 0;
    for (let attempt = 0; attempt < 40; attempt++) {
      const c = await cfg();
      const need = rent + big(c.totalYieldClaims) + big(c.totalPendingUnstake);
      if ((await lamports(reserve)) >= need) return calls;
      try {
        await withdrawFromPool();
        calls++;
      } catch (e: any) {
        if (!String(e).includes("0x10")) throw e;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    throw new Error("reserve still short after retries");
  }

  async function expectErr(p: Promise<unknown>, name: string) {
    try { await p; } catch (e: any) {
      const text = String(e) + "\n" + (e.logs ?? e.transactionLogs ?? []).join("\n");
      expect(text, `expected ${name}`).to.include(name);
      return;
    }
    expect.fail(`expected ${name}`);
  }

  before(async () => {
    rent = big(await conn.getMinimumBalanceForRentExemption(0));
    // Local epochs start at 0; mainnet's stale price_epoch (0) only reads as stale
    // once the cluster is past epoch 0, as mainnet (epoch 442) is.
    while ((await conn.getEpochInfo()).epoch < 1) await new Promise((r) => setTimeout(r, 2000));
    const c = await cfg();
    splPool = c.splStakePool;
    poolMint = c.splPoolMint;
    const d = (await conn.getAccountInfo(splPool))!.data;
    poolReserveStake = new PublicKey(d.subarray(131, 163));
    poolManagerFee = new PublicKey(d.subarray(195, 227));
    poolWithdrawAuthority = pda([splPool.toBuffer(), Buffer.from("withdraw")], STAKE_POOL_PROGRAM);
    ata = pda([reserve.toBuffer(), TOKEN_PROGRAM.toBuffer(), poolMint.toBuffer()], ATA_PROGRAM);

    const ownersDir = path.join(WORK!, "owners");
    for (const f of fs.readdirSync(ownersDir).filter((f) => f !== "map.json")) {
      const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.join(ownersDir, f), "utf8"))));
      ownerKeys.set(kp.publicKey.toBase58(), kp);
    }
    for (const kp of [...ownerKeys.values(), newUser]) {
      await conn.confirmTransaction(await conn.requestAirdrop(kp.publicKey, 100 * XNT), "confirmed");
    }
    legacy = (await program.account.vowState.all())
      .filter((v) => v.account.activeStake)
      .map((v) => ({ addr: v.publicKey, owner: ownerKeys.get(v.account.owner.toBase58())!, nonce: big(v.account.nonce) }))
      .sort((a, b) => Number(a.nonce - b.nonce));
    expect(legacy.length).to.be.greaterThan(0);
    legacy.forEach((l) => expect(l.owner, "owner keypair").to.not.be.undefined);
  });

  it("snapshot: the live protocol is solvent", async () => {
    const c = await cfg();
    const p = await pool();
    const assets = (await lamports(reserve)) - rent + ((await pxnt()) * p.total) / p.supply;
    const owed = (big(c.totalShares) * big(c.currentSharePrice)) / PREC + big(c.totalYieldClaims) + big(c.totalPendingUnstake);
    console.log(`      identities=${legacy.length} assets=${fmt(assets)} owed@old-price=${fmt(owed)} surplus=${fmt(assets - owed)}`);
    expect(assets >= owed).to.be.true;
  });

  it("refuses value-moving instructions at a stale price", async () => {
    await expectErr(
      program.methods.harvest().accountsStrict({ config: configPda, vowState: legacy[0].addr }).rpc(),
      "PriceStale"
    );
  });

  it("first NAV update prices every share off real, redeemable assets", async () => {
    const oldPrice = big((await cfg()).currentSharePrice);
    await update();
    const after = await nav();
    // On-chain price == client-side NAV / shares (floor).
    expect(after.price).to.equal((after.nav * PREC) / after.shares);
    console.log(`      price ${Number(oldPrice) / 1e12} → ${Number(after.price) / 1e12} ` +
      `(${((Number(after.price) / Number(oldPrice) - 1) * 100).toFixed(3)}% — pool surplus now shared pro-rata)`);
    for (const l of legacy) {
      const v = await vow(l.addr);
      console.log(`      #${l.nonce} principal=${fmt(big(v.principalLamports))} value=${fmt((big(v.shares) * after.price) / PREC)} yield=${fmt(big(v.yieldBalance))}`);
    }
  });

  it("one identity per wallet: backfill legacy owners, then a second mint fails", async () => {
    const seen = new Set<string>();
    for (const l of legacy) {
      const key = l.owner.publicKey.toBase58();
      if (seen.has(key)) continue; // grandfathered extra identities keep working
      seen.add(key);
      await program.methods.backfillOwnerIndex().accountsStrict({
        vowState: l.addr,
        ownerIndex: pda([Buffer.from("owner_index"), l.owner.publicKey.toBuffer()]),
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }).rpc();
      const idx = await program.account.ownerIndex.fetch(pda([Buffer.from("owner_index"), l.owner.publicKey.toBuffer()]));
      expect(idx.vowState.toBase58()).to.equal(l.addr.toBase58()); // lowest nonce = canonical
    }
    const c = await cfg();
    const assetId = pda([Buffer.from("vow_asset"), big(c.totalMinted) === 0n ? Buffer.alloc(8) : new BN(c.totalMinted).toArrayLike(Buffer, "le", 8)]);
    const o = legacy[0].owner;
    await expectErr(
      program.methods.mintVow(new BN(2 * XNT), { treasury: {} }).accountsStrict({
        config: configPda, assetIdAccount: assetId, vowState: pda([Buffer.from("vow"), assetId.toBuffer()]),
        reserve, ownerIndex: pda([Buffer.from("owner_index"), o.publicKey.toBuffer()]),
        owner: o.publicKey, systemProgram: SystemProgram.programId,
      }).signers([o]).rpc(),
      "already in use"
    );
  });

  it("a new mint pays its own pool fees and does not move the price", async () => {
    const c = await cfg();
    const before = big(c.currentSharePrice);
    const assetId = pda([Buffer.from("vow_asset"), new BN(c.totalMinted).toArrayLike(Buffer, "le", 8)]);
    newVow = pda([Buffer.from("vow"), assetId.toBuffer()]);
    const stake = 50n * BigInt(XNT);
    await program.methods.mintVow(new BN(stake.toString()), { treasury: {} }).accountsStrict({
      config: configPda, assetIdAccount: assetId, vowState: newVow, reserve,
      ownerIndex: pda([Buffer.from("owner_index"), newUser.publicKey.toBuffer()]),
      owner: newUser.publicKey, systemProgram: SystemProgram.programId,
    }).preInstructions([await updateIx().instruction()]).signers([newUser]).rpc();

    const net = (stake * (PPM - BigInt(c.depositFeePpm)) * (PPM - BigInt(c.withdrawalFeePpm))) / (PPM * PPM);
    expect(big((await vow(newVow)).shares)).to.equal((net * PREC) / before);
    await update();
    const after = big((await cfg()).currentSharePrice);
    // Never down (existing holders never subsidize the newcomer). It can tick up by a
    // hair: fresh SOL that covers an existing liquidity shortfall saves the pool
    // round-trip fee on that amount, and that saving accrues pro-rata to holders.
    expect(after >= before - 2n, `price fell ${before} → ${after}`).to.be.true;
    expect(Number(after - before) / Number(before)).to.be.lessThan(1e-5);
  });

  it("flush only moves idle SOL, keeps owed SOL liquid, and is NAV-neutral", async () => {
    // Give the new identity a spendable balance, then flush everything flushable.
    await program.methods.depositYieldBalance(new BN(XNT)).accountsStrict({
      config: configPda, vowState: newVow, reserve, depositor: newUser.publicKey,
      systemProgram: SystemProgram.programId, unstakeEscrow: pda([Buffer.from("unstake"), newVow.toBuffer()]),
    }).signers([newUser]).rpc();
    const priceBefore = big((await cfg()).currentSharePrice);
    await flush();
    const c = await cfg();
    expect(await lamports(reserve)).to.equal(rent + big(c.totalYieldClaims) + big(c.totalPendingUnstake));
    await update();
    const moved = Number(big((await cfg()).currentSharePrice) - priceBefore) / Number(priceBefore);
    expect(Math.abs(moved), "flush price move").to.be.lessThan(1e-9); // pool mint rounding only
    // A second flush has nothing left to move.
    const r = await lamports(reserve);
    await flush();
    expect(await lamports(reserve)).to.equal(r);
  });

  it("deposited/harvested yield stays spendable; the pool can't be drained gratuitously", async () => {
    await expectErr(withdrawFromPool(), "ReserveSufficient");
    const bal = big((await vow(newVow)).yieldBalance);
    const before = await lamports(newUser.publicKey);
    await program.methods.withdrawYield(new BN(bal.toString())).accountsStrict({
      config: configPda, vowState: newVow, reserve, owner: newUser.publicKey, systemProgram: SystemProgram.programId,
    }).signers([newUser]).rpc();
    expect((await lamports(newUser.publicKey)) - before).to.equal(bal); // fee paid by provider wallet

    // Harvest every legacy identity at the fresh price, then make claims liquid.
    for (const l of legacy) {
      await program.methods.harvest().accountsStrict({ config: configPda, vowState: l.addr })
        .preInstructions([await updateIx().instruction()]).rpc();
    }
    await ensureLiquid();
    await expectErr(withdrawFromPool(), "ReserveSufficient");
  });

  it("EVERY live identity unstakes and is paid exactly its fair share", async () => {
    const owed = new Map<string, bigint>();
    let pricesSeen = new Set<string>();
    for (const l of legacy) {
      const escrow = pda([Buffer.from("unstake"), l.addr.toBuffer()]);
      await program.methods.beginUnstake().accountsStrict({
        config: configPda, vowState: l.addr, unstakeEscrow: escrow, owner: l.owner.publicKey,
        systemProgram: SystemProgram.programId,
      }).preInstructions([await updateIx().instruction()]).signers([l.owner]).rpc();
      const c = await cfg();
      pricesSeen.add(c.currentSharePrice.toString());
      const e = await program.account.unstakeEscrow.fetch(escrow);
      owed.set(l.addr.toBase58(), big(e.lamportsOwed));
    }
    // begin_unstake is NAV-neutral: everyone exits at (within rounding) the same price.
    const ps = [...pricesSeen].map(BigInt);
    const spread = Number(ps.reduce((a, b) => (a > b ? a : b)) - ps.reduce((a, b) => (a < b ? a : b)));
    expect(spread / Number(ps[0]), "exit price spread").to.be.lessThan(1e-9);

    // Wait one epoch, top up liquidity from the pool, pay everybody in full.
    const startEpoch = (await conn.getEpochInfo()).epoch;
    while ((await conn.getEpochInfo()).epoch <= startEpoch) await new Promise((r) => setTimeout(r, 2000));
    const calls = await ensureLiquid();
    console.log(`      withdraw_from_pool calls needed: ${calls}`);

    let paid = 0n;
    for (const l of legacy) {
      const escrow = pda([Buffer.from("unstake"), l.addr.toBuffer()]);
      const escrowRent = await lamports(escrow);
      const before = await lamports(l.owner.publicKey);
      await program.methods.completeUnstake().accountsStrict({
        config: configPda, vowState: l.addr, unstakeEscrow: escrow, reserve, owner: l.owner.publicKey,
        systemProgram: SystemProgram.programId, clock: SYSVAR_CLOCK_PUBKEY,
      }).signers([l.owner]).rpc();
      const got = (await lamports(l.owner.publicKey)) - before - escrowRent;
      const want = owed.get(l.addr.toBase58())!;
      expect(got, `identity #${l.nonce}`).to.equal(want);
      paid += got;
      const v = await vow(l.addr);
      console.log(`      #${l.nonce} principal=${fmt(big(v.principalLamports))} paid=${fmt(got)} ` +
        `(${((Number(got) / Number(big(v.principalLamports)) - 1) * 100).toFixed(3)}% vs principal)`);
      expect(v.activeStake).to.be.false;
    }
    console.log(`      total paid to legacy holders: ${fmt(paid)} XNT`);
  });

  it("afterwards the protocol still fully covers the remaining holder", async () => {
    await update();
    const c = await cfg();
    expect(big(c.totalPendingUnstake)).to.equal(0n);
    expect(big(c.totalShares)).to.equal(big((await vow(newVow)).shares));
    const n = await nav();
    const p = await pool();
    const assets = (await lamports(reserve)) - rent + ((await pxnt()) * p.total) / p.supply;
    const owedToNew = (n.shares * n.price) / PREC + big(c.totalYieldClaims);
    console.log(`      remaining assets=${fmt(assets)} owed to remaining holder=${fmt(owedToNew)}`);
    expect(assets >= owedToNew).to.be.true;
  });

  it("share-price inflation: a sole holder can't make the next depositor lose to rounding", async () => {
    // newUser is now the only holder (Treasury mode). Attack loop: donate SOL to the
    // reserve → update price → harvest (burns shares at the inflated price) → withdraw
    // the donation back as yield. Repeat to shrink total_shares and blow up the price.
    const attacker = newUser;
    // Faucet caps airdrops; fund from the genesis wallet (provider) instead.
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(
      SystemProgram.transfer({ fromPubkey: provider.wallet.publicKey, toPubkey: attacker.publicKey, lamports: 10_000_000 * XNT })));
    for (let round = 0; round < 3; round++) {
      const c = await cfg();
      const value = (big(c.totalShares) * big(c.currentSharePrice)) / PREC;
      const donation = value * 1000n;
      if (donation > 9_000_000n * BigInt(XNT)) break;
      await provider.sendAndConfirm(new anchor.web3.Transaction().add(
        SystemProgram.transfer({ fromPubkey: attacker.publicKey, toPubkey: reserve, lamports: Number(donation) })), [attacker]);
      await update();
      await harvest_(newVow);
      const bal = big((await vow(newVow)).yieldBalance);
      if (bal === 0n) { console.log(`      round ${round}: nothing left to extract (price capped)`); break; }
      await ensureLiquid();
      await program.methods.withdrawYield(new BN(bal.toString())).accountsStrict({
        config: configPda, vowState: newVow, reserve, owner: attacker.publicKey, systemProgram: SystemProgram.programId,
      }).signers([attacker]).rpc();
      const after = await cfg();
      console.log(`      round ${round}: shares=${after.totalShares.toString()} price=${Number(after.currentSharePrice) / 1e12}`);
    }

    // Victim deposits 10 XNT. Their claim must be worth what they put in (net of pool fees).
    const victim = Keypair.generate();
    await conn.confirmTransaction(await conn.requestAirdrop(victim.publicKey, 20 * XNT), "confirmed");
    const c = await cfg();
    const assetId = pda([Buffer.from("vow_asset"), new BN(c.totalMinted).toArrayLike(Buffer, "le", 8)]);
    const vv = pda([Buffer.from("vow"), assetId.toBuffer()]);
    const stake = 10n * BigInt(XNT);
    let minted = true;
    try {
      await program.methods.mintVow(new BN(stake.toString()), { compound: {} }).accountsStrict({
        config: configPda, assetIdAccount: assetId, vowState: vv, reserve,
        ownerIndex: pda([Buffer.from("owner_index"), victim.publicKey.toBuffer()]),
        owner: victim.publicKey, systemProgram: SystemProgram.programId,
      }).preInstructions([await updateIx().instruction()]).signers([victim]).rpc();
    } catch (e: any) {
      minted = false; // rejecting the deposit outright is also safe
      console.log(`      victim mint rejected: ${String(e).slice(0, 120)}`);
    }
    if (minted) {
      await update();
      const after = await cfg();
      const worth = (big((await vow(vv)).shares) * big(after.currentSharePrice)) / PREC;
      const net = (stake * (PPM - BigInt(after.depositFeePpm)) * (PPM - BigInt(after.withdrawalFeePpm))) / (PPM * PPM);
      console.log(`      victim deposited ${fmt(stake)} → claim worth ${fmt(worth)} (net-of-fees ${fmt(net)})`);
      expect(Number(net - worth), "victim rounding loss (lamports)").to.be.lessThan(1000);
    }
  });
});
