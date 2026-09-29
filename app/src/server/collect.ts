/**
 * Collects due payments. `charge` is permissionless on-chain, so any fee payer may run this;
 * the program itself enforces amount, timing and destination.
 * Used by POST /api/collect (while someone has the app open) and by the scheduled charge job.
 * No next/* imports so plain Node scripts can use it.
 */
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";

import {
  chargeIx,
  fetchAllSubscriptions,
  fetchPlans,
  fetchSubscriptionsByPlan,
  fetchSubscriptionsBySubscriber,
  isPaused,
  readProgram,
  toTx,
  type Plan,
} from "@/lib/chain";

export type CollectScope = { plan?: PublicKey; subscriber?: PublicKey; merchant?: PublicKey };
export type CollectResult = { due: number; collected: number; skipped: string[] };

export async function collectDue(
  connection: Connection,
  payer: Keypair,
  scope: CollectScope = {},
  limit = 10,
): Promise<CollectResult> {
  const program = readProgram(connection);
  const now = Math.floor(Date.now() / 1000);

  const candidates = scope.subscriber
    ? await fetchSubscriptionsBySubscriber(program, scope.subscriber)
    : scope.plan
      ? await fetchSubscriptionsByPlan(program, scope.plan)
      : await fetchAllSubscriptions(program);
  const due = candidates.filter(
    (s) =>
      (!scope.plan || s.account.plan.equals(scope.plan)) &&
      !isPaused(s.account) &&
      s.account.nextChargeAt.toNumber() <= now,
  );
  if (due.length === 0) return { due: 0, collected: 0, skipped: [] };

  const planKeys = [...new Map(due.map((s) => [s.account.plan.toBase58(), s.account.plan])).values()];
  const accounts = await fetchPlans(program, planKeys);
  const plans = new Map<string, Plan>();
  planKeys.forEach((key, i) => {
    const account = accounts[i];
    if (account?.active && (!scope.merchant || account.merchant.equals(scope.merchant))) {
      plans.set(key.toBase58(), { publicKey: key, account });
    }
  });

  // One transaction per charge: a blocked subscription (e.g. empty wallet) must not block the others.
  // Only active plans in scope, oldest first, then the limit: stuck subscriptions cannot starve others.
  const collectable = due
    .filter((s) => plans.has(s.account.plan.toBase58()))
    .sort((a, b) => a.account.nextChargeAt.cmp(b.account.nextChargeAt))
    .slice(0, limit);
  const results = await Promise.allSettled(
    collectable.map(async (sub) => {
      const plan = plans.get(sub.account.plan.toBase58())!;
      const tx = toTx([await chargeIx(program, payer.publicKey, plan, sub)], payer.publicKey);
      return sendAndConfirmTransaction(connection, tx, [payer], { commitment: "confirmed" });
    }),
  );

  const skipped = results.flatMap((r, i) =>
    r.status === "rejected"
      ? [`${collectable[i].publicKey.toBase58()}: ${String(r.reason?.message ?? r.reason).split("\n")[0]}`]
      : [],
  );
  return { due: collectable.length, collected: results.length - skipped.length, skipped };
}
