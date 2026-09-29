/**
 * Scheduled charge job: collects every due subscription.
 * Usage: FAUCET_KEYPAIR='[1,2,...]' npx tsx scripts/charge.ts
 */
import { Connection, Keypair } from "@solana/web3.js";

import { RPC_URL } from "../src/lib/config";
import { collectDue } from "../src/server/collect";

async function main() {
  const secret = process.env.FAUCET_KEYPAIR;
  if (!secret) throw new Error("FAUCET_KEYPAIR is not set");
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
  const result = await collectDue(new Connection(RPC_URL, "confirmed"), payer, {}, 50);
  console.log(`${result.collected}/${result.due} due payments collected`);
  for (const line of result.skipped) console.log(`skipped ${line}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
