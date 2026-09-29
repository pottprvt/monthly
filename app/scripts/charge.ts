/**
 * Scheduled charge job: collects every due subscription, then reconciles community access.
 * Usage: FAUCET_KEYPAIR='[1,2,...]' npx tsx scripts/charge.ts
 */
import { Connection, Keypair } from "@solana/web3.js";

import { RPC_URL } from "../src/lib/config";
import { syncAllAccess } from "../src/server/access/sync";
import { collectDue } from "../src/server/collect";

async function main() {
  const secret = process.env.FAUCET_KEYPAIR;
  if (!secret) throw new Error("FAUCET_KEYPAIR is not set");
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
  const connection = new Connection(RPC_URL, "confirmed");
  const result = await collectDue(connection, payer, {}, 50);
  console.log(`${result.collected}/${result.due} due payments collected`);
  for (const line of result.skipped) console.log(`skipped ${line}`);
  const access = await syncAllAccess(connection);
  console.log(`community access: ${access.revoked} removed, ${access.restored} restored`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
