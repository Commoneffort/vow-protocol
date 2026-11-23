import React, { useEffect, useState } from "react";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import VowCard from "./VowCard";
import idl from "../sdk/vow.json";
import * as pda from "../sdk/pda";
import { CLASS_NAMES, LOCK_DAYS } from "../sdk/types";

const GEMS = [
  ["#5A0000", "#C41212"], ["#4B2C66", "#D9B8FF"], ["#7A4A00", "#F4B942"], ["#003B1F", "#11B86A"],
  ["#004E64", "#6BE3FF"], ["#001D6E", "#2E7BFF"], ["#2A003D", "#B24CFF"], ["#050505", "#6b5a24"],
];
const TIERS = ["1+", "101+", "301+", "501+", "1,001+", "2,001+", "5,001+", "10,001+"];

const ACTS = [
  { c: "#6d4bd1", title: "Vow", text: "Lock XNT for 30 days to five years. Your wallet receives one soulbound identity, and its gem shows the size of your promise." },
  { c: "#0d8a5b", title: "Earn", text: "Your stake works in the X1 Foundation pool. Compound it, take it as spendable yield, or split the difference." },
  { c: "#1f62d0", title: "Delegate", text: "Give an app or AI agent a session key with hard limits. It acts without wallet popups and never touches your stake." },
  { c: "#b3263f", title: "Prove", text: "Keep your word and the chain records it. Every cycle adds to a public history that stays with you, even after you exit." },
];

interface Props {
  connected: boolean;
  connecting: boolean;
  connectError: string;
  onConnect: () => void;
  onOpenApp: () => void;
  onOpenDemo: () => void;
  rpc: string;
}

export default function Landing({ connected, connecting, connectError, onConnect, onOpenApp, onOpenDemo, rpc }: Props) {
  const [stats, setStats] = useState<{ minted: string; price: string; staked: string } | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const conn = new Connection(rpc, "confirmed");
      const k = Keypair.generate();
      const reader = { publicKey: k.publicKey, signTransaction: async (t: any) => t, signAllTransactions: async (t: any) => t };
      const program = new Program(idl as any, new AnchorProvider(conn, reader as any, {})) as any;
      const cfg = await program.account.protocolConfig.fetch(pda.findProtocolConfig()[0]);
      const tokens = await conn.getTokenAccountBalance(pda.findReservePoolTokens(cfg.splPoolMint as PublicKey));
      if (live) setStats({
        minted: cfg.totalMinted.toString(),
        price: (Number(cfg.currentSharePrice.toString()) / 1e12).toFixed(4),
        staked: Number(tokens.value.uiAmount ?? 0).toFixed(2),
      });
    })().catch(() => {});
    return () => { live = false; };
  }, [rpc]);

  const maxLock = LOCK_DAYS[LOCK_DAYS.length - 1];

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div>
            <span className="eyebrow">Soulbound identity on X1</span>
            <h1>A promise the <em>chain remembers.</em></h1>
            <p className="hero-lede">
              Vow turns locked XNT into an identity you can't sell, a yield engine you control, and a
              reputation that outlives every position. Commit once, then let the apps you trust act for
              you, strictly within the limits you set.
            </p>
            <div className="hero-cta">
              {connected
                ? <button className="btn btn-gold" onClick={onOpenApp}>Open your Vow</button>
                : <button className="btn btn-gold" onClick={onConnect} disabled={connecting}>{connecting ? "Connecting…" : "Connect X1 Wallet"}</button>}
              <button className="btn btn-ghost" onClick={onOpenDemo}>Try session keys</button>
            </div>
            {connectError && <div className="notice">{connectError}</div>}
          </div>
          <div className="card-fan" aria-hidden="true">
            <div><VowCard classIndex={5} nonce={5} activatedAt={0} maturesAt={0} activeStake size={210} /></div>
            <div><VowCard classIndex={3} nonce={3} activatedAt={0} maturesAt={0} activeStake size={210} /></div>
            <div><VowCard classIndex={7} nonce={7} activatedAt={0} maturesAt={0} activeStake size={230} /></div>
          </div>
        </div>
        <div className="stats-band">
          <div className="stats-inner">
            <div><div className="stat-value">{stats?.minted ?? "—"}</div><div className="stat-label">Identities minted</div></div>
            <div><div className="stat-value">{stats?.staked ?? "—"}</div><div className="stat-label">pXNT staked by the protocol</div></div>
            <div><div className="stat-value">{stats?.price ?? "—"}</div><div className="stat-label">Share price (XNT)</div></div>
            <div><div className="stat-value">8</div><div className="stat-label">Classes, Ruby to Xenturion</div></div>
          </div>
        </div>
      </section>

      <section className="land-section">
        <div className="land-head">
          <span className="eyebrow">How it works</span>
          <h2>One commitment. Four powers.</h2>
          <p>Most on-chain identities cost nothing, so they prove nothing. A Vow is backed by capital and time.</p>
        </div>
        <div className="acts">
          {ACTS.map((a, i) => (
            <article className="act" key={a.title} style={{ ["--c" as any]: a.c }}>
              <span className="act-num">0{i + 1}</span>
              <h3>{a.title}</h3>
              <p>{a.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="land-section">
        <div className="land-head">
          <span className="eyebrow">What makes it different</span>
          <h2>Identity with something at stake.</h2>
        </div>
        <div className="bento">
          <article className="tile wide dark">
            <span className="tile-tag">Session keys</span>
            <h3>Delegate power, not your wallet.</h3>
            <p>Sign once and an app can transact without another popup. Every limit you set is enforced by the program, and you can revoke access in a single transaction.</p>
            <ul className="limit-list">
              <li>Daily spend <b>you set</b></li>
              <li>Lifetime spend <b>you set</b></li>
              <li>Transactions per day <b>you set</b></li>
              <li>Allowed programs <b>you choose</b></li>
              <li>Expiry <b>you choose</b></li>
              <li>Unstake access <b>none</b></li>
            </ul>
          </article>
          <article className="tile wide">
            <span className="tile-tag">Soulbound</span>
            <h3>Yours. Only yours. Permanently.</h3>
            <p>One identity per wallet, with no transfer instruction in the program. Reputation can't be bought on a marketplace, because the credential can never change hands. Unstake and it goes dormant rather than disappearing, ready to be reactivated with its history intact.</p>
          </article>
          <article className="tile">
            <span className="tile-tag">Honest yield</span>
            <h3>Every share is a fair share.</h3>
            <p>Share price tracks what the protocol can actually redeem, net of pool fees and everything it owes. Newcomers pay their own entry costs.</p>
          </article>
          <article className="tile">
            <span className="tile-tag">Your choice</span>
            <h3>Compound, spend, or both.</h3>
            <p>Let gains grow in Compound, send them to a spendable balance in Treasury, or split them evenly with Hybrid. Change mode whenever you like.</p>
          </article>
          <article className="tile">
            <span className="tile-tag">Built for agents</span>
            <h3>Autonomy with a leash.</h3>
            <p>Bots and AI agents can pay through a whitelisted program under a strict budget. If one misbehaves, its damage stops at the limit you set.</p>
          </article>
        </div>
      </section>

      <section className="land-section">
        <div className="land-head">
          <span className="eyebrow">The eight classes</span>
          <h2>The deeper the vow, the rarer the gem.</h2>
          <p>Your class reflects how much you stake and sets how long you commit. Your highest class stays on your record forever.</p>
        </div>
        <div className="ladder">
          {CLASS_NAMES.map((name, i) => {
            const pct = 16 + (LOCK_DAYS[i] / maxLock) * 66;
            return (
              <div className="rung" key={name} style={{ ["--d" as any]: GEMS[i][0], ["--l" as any]: GEMS[i][1], ["--w" as any]: `${Math.max(12, pct * 0.5)}%` }}>
                <div className="rung-bar" style={{ height: `${pct}%` }}>{LOCK_DAYS[i]}d</div>
                <div className="rung-name" title={name}>{name}</div>
                <div className="rung-meta">{TIERS[i]} XNT</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="honest">
        <div className="honest-inner">
          <strong>Know what you're committing to.</strong> Staked XNT cannot be withdrawn before its lock ends,
          and every top-up restarts the lock on your whole position. Yield depends on the X1 stake pool and its
          validators and can change. The program is upgradeable by a single key, and this protocol has not yet
          had an independent audit.
        </div>
      </section>
    </>
  );
}
