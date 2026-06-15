import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import idl from "../target/idl/vow.json";

const connection = new Connection("https://rpc.mainnet.x1.xyz", "confirmed");
const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8"))));
const provider = new AnchorProvider(connection, new Wallet(kp), { commitment: "confirmed" });
const program = new Program(idl as any, provider);

async function main() {
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const configData = await (program.account as any).protocolConfig.fetch(config);
  const splPool = (configData as any).splStakePool as PublicKey;
  const oldPrice = (configData as any).currentSharePrice.toString();
  console.log("old current_share_price:", oldPrice, `(${Number(oldPrice) / 1e12})`);

  console.log("Calling update_share_price...");
  const sig = await program.methods.updateSharePrice().accounts({ config, splPool }).rpc();
  console.log("Sig:", sig);

  const updated = await (program.account as any).protocolConfig.fetch(config);
  const newPrice = (updated as any).currentSharePrice.toString();
  console.log("new current_share_price:", newPrice, `(${Number(newPrice) / 1e12})`);

  const diff = Number(newPrice) - Number(oldPrice);
  console.log("price delta:", diff, diff > 0 ? "↑ yield accrued!" : "(no change)");
}

main().catch(console.error);
