import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import idl from "../target/idl/vow.json";

const connection = new Connection("https://rpc.mainnet.x1.xyz", "confirmed");
const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8"))));
const provider = new AnchorProvider(connection, new Wallet(kp), {});
const program = new Program(idl as any, provider);

const addrs = [
  "7waA3TSdmRR2t97Ckecqdm6uEy7QtqrVpyVKGnF6PB2r",
  "C1hZ9YYMGoDn9KPbbmBMwjUdsyJ69oYuJnFhDFGNG1xk",
  "FLiwsEPhZEKbiSmeRr6553S4gy8KGjo1WzmQaWLTUbq4",
];

const PREC = BigInt("1000000000000");

async function main() {
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const config = await (program.account as any).protocolConfig.fetch(configPda);
  const currPrice = BigInt((config as any).currentSharePrice.toString());
  console.log(`current_share_price: ${currPrice} (${Number(currPrice) / 1e12})\n`);

  for (const addr of addrs) {
    const s = await (program.account as any).vowState.fetch(new PublicKey(addr));
    const lastPrice = BigInt((s as any).lastSharePrice.toString());
    const shares = BigInt((s as any).shares.toString());
    const accruedGain = BigInt((s as any).accruedGain.toString());
    const pendingDelta = shares * currPrice / PREC - shares * lastPrice / PREC;
    const total = pendingDelta + accruedGain;

    console.log(`${addr}`);
    console.log(`  shares:           ${shares}`);
    console.log(`  last_share_price: ${lastPrice} (${Number(lastPrice) / 1e12})`);
    console.log(`  accrued_gain:     ${accruedGain}`);
    console.log(`  pending_delta:    ${pendingDelta}`);
    console.log(`  TOTAL pending:    ${total} lamports (${Number(total) / 1e9} XNT)`);
    console.log(`  yield_balance:    ${(s as any).yieldBalance}`);
    console.log(`  yield_mode:       ${JSON.stringify((s as any).yieldMode)}`);
    console.log();
  }
}

main().catch(console.error);
