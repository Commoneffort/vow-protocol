import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { Vow } from "../target/types/vow";
import * as pda from "../sdk/src/pda";
import { LAMPORTS_PER_XNT, CLASS_NAMES, LOCK_DAYS } from "../sdk/src/types";
import {
  setupProvider,
  getProgram,
  airdrop,
  initializeProtocol,
  xntToLamports,
  YieldMode,
} from "./helpers";

describe("01 — VOW Minting", () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Vow>;
  let admin: Keypair;
  let user: Keypair;

  before(async () => {
    provider = await setupProvider();
    program = getProgram(provider);
    admin = (provider.wallet as anchor.Wallet).payer;
    user = Keypair.generate();
    // Need 1+101+301+501+1001+2001+5001+10001 = 18908 XNT + fees
    await airdrop(provider.connection, user.publicKey, 20000 * anchor.web3.LAMPORTS_PER_SOL);
    await initializeProtocol(program, admin);
  });

  const cases: Array<{ name: string; xnt: number; expectedClass: number }> = [
    { name: "Ruby (class 0)", xnt: 1, expectedClass: 0 },
    { name: "Opal (class 1)", xnt: 101, expectedClass: 1 },
    { name: "Topaz (class 2)", xnt: 301, expectedClass: 2 },
    { name: "Emerald (class 3)", xnt: 501, expectedClass: 3 },
    { name: "Aquamarine (class 4)", xnt: 1001, expectedClass: 4 },
    { name: "Sapphire (class 5)", xnt: 2001, expectedClass: 5 },
    { name: "Amethyst (class 6)", xnt: 5001, expectedClass: 6 },
    { name: "Xenturion (class 7)", xnt: 10001, expectedClass: 7 },
  ];

  for (const tc of cases) {
    it(`mints ${tc.name}`, async function () {
      const [configPda] = pda.findProtocolConfig();
      const configBefore = await program.account.protocolConfig.fetch(configPda);
      const nonce = configBefore.totalMinted.toNumber();

      const [assetIdAccount] = pda.findAssetId(nonce);
      const [vowState] = pda.findVowState(assetIdAccount);

      const [reserve] = pda.findReserve();
      const stakeLamports = xntToLamports(tc.xnt);

      await program.methods
        .mintVow(stakeLamports, YieldMode.Compound)
        .accounts({
          config: configPda,
          assetIdAccount,
          vowState,
          reserve,
          owner: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const state = await program.account.vowState.fetch(vowState);
      expect(state.class).to.equal(tc.expectedClass);
      expect(state.owner.toBase58()).to.equal(user.publicKey.toBase58());
      expect(state.principalLamports.toString()).to.equal(stakeLamports.toString());
      expect(state.matured).to.be.false;

      // Lock duration check
      const expectedUnlockAt = state.createdAt.toNumber() + LOCK_DAYS[tc.expectedClass] * 86400;
      expect(state.unlockAt.toNumber()).to.be.closeTo(expectedUnlockAt, 5);

      // Config updated
      const configAfter = await program.account.protocolConfig.fetch(configPda);
      expect(configAfter.totalMinted.toNumber()).to.equal(nonce + 1);
    });
  }

  it("rejects mint below minimum stake", async () => {
    const [configPda] = pda.findProtocolConfig();
    const config = await program.account.protocolConfig.fetch(configPda);
    const nonce = config.totalMinted.toNumber();
    const [assetIdAccount] = pda.findAssetId(nonce);
    const [vowState] = pda.findVowState(assetIdAccount);
    const [reserve] = pda.findReserve();

    try {
      await program.methods
        .mintVow(new BN(100_000_000), YieldMode.Compound) // 0.1 XNT — below minimum
        .accounts({
          config: configPda,
          assetIdAccount,
          vowState,
          reserve,
          owner: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.toString()).to.include("InsufficientStake");
    }
  });
});
