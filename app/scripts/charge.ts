/**
 * Charge job: collects every due subscription. Anyone may run it; the payer only covers fees.
 * Usage: FAUCET_KEYPAIR='[1,2,...]' npx tsx scripts/charge.ts
 */
import { Connection, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";

import { RPC_URL } from "../src/lib/config";
import { chargeIx, fetchAllSubscriptions, fetchPlans, isPaused, readProgram, toTx, type Plan } from "../src/lib/chain";

async function main() {
  const secret = process.env.FAUCET_KEYPAIR;
  if (!secret) throw new Error("FAUCET_KEYPAIR is not set");
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
  const connection = new Connection(RPC_URL, "confirmed");
  const program = readProgram(connection);

  const now = Math.floor(Date.now() / 1000);
  const subs = (await fetchAllSubscriptions(program)).filter(
    (s) => !isPaused(s.account) && s.account.nextChargeAt.toNumber() <= now,
  );
  console.log(`${subs.length} due subscription(s), payer ${payer.publicKey.toBase58()}`);
  if (subs.length === 0) return;

  const planKeys = [...new Map(subs.map((s) => [s.account.plan.toBase58(), s.account.plan])).values()];
  const planAccounts = await fetchPlans(program, planKeys);
  const plans = new Map<string, Plan>();
  planKeys.forEach((key, i) => {
    const account = planAccounts[i];
    if (account) plans.set(key.toBase58(), { publicKey: key, account });
  });

  let ok = 0;
  for (const sub of subs) {
    const plan = plans.get(sub.account.plan.toBase58());
    if (!plan || !plan.account.active) continue;
    try {
      const ix = await chargeIx(program, payer.publicKey, plan, sub);
      const sig = await sendAndConfirmTransaction(connection, toTx([ix], payer.publicKey), [payer], {
        commitment: "confirmed",
      });
      ok++;
      console.log(`charged ${sub.publicKey.toBase58()} ${sig}`);
    } catch (err) {
      // RetryLater (insufficient funds inside grace) and similar are expected; log and move on.
      console.log(`skipped ${sub.publicKey.toBase58()}: ${(err as Error).message.split("\n")[0]}`);
    }
  }
  console.log(`${ok}/${subs.length} charged`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
