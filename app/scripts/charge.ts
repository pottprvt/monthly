/**
 * Charge job: collects every due subscription. Anyone may run it; the payer only covers fees.
 * Usage: FAUCET_KEYPAIR='[1,2,...]' npx tsx scripts/charge.ts
 */
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";

import { RPC_URL } from "../src/lib/config";
import {
  type Keyed,
  type PlanAccount,
  chargeIx,
  fetchAllSubscriptions,
  isPaused,
  readProgram,
  toTx,
} from "../src/lib/monthly";

async function main() {
  const secret = process.env.FAUCET_KEYPAIR;
  if (!secret) throw new Error("FAUCET_KEYPAIR is not set");
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment: "confirmed" });
  const program = readProgram(connection);

  const now = Math.floor(Date.now() / 1000);
  const subs = (await fetchAllSubscriptions(program)).filter(
    (s) => !isPaused(s.account) && s.account.nextChargeAt.toNumber() <= now,
  );
  console.log(`${subs.length} due subscription(s), payer ${payer.publicKey.toBase58()}`);
  if (subs.length === 0) return;

  const planKeys = [...new Set(subs.map((s) => s.account.plan.toBase58()))];
  const planAccounts = await program.account.plan.fetchMultiple(planKeys);
  const plans = new Map<string, Keyed<PlanAccount>>();
  planKeys.forEach((k, i) => {
    const acc = planAccounts[i];
    if (acc) plans.set(k, { publicKey: subs.find((s) => s.account.plan.toBase58() === k)!.account.plan, account: acc });
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
  void provider;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
