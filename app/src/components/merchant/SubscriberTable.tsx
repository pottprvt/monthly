"use client";

import { Address, Badge, Card, Empty, formatDate, timeUntil } from "@/components/ui";
import { formatUsdc } from "@/lib/config";
import { isPaused } from "@/lib/monthly";
import type { MerchantData } from "@/lib/useMerchantData";

export function SubscriberTable({ data }: { data: MerchantData }) {
  const { subs, plans, now } = data;
  if (subs.length === 0) {
    return <Empty title="No subscribers yet">Share a plan link; subscribers show up here.</Empty>;
  }
  const planByKey = new Map(plans.map((p) => [p.publicKey.toBase58(), p.account]));
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-5 py-3 font-medium">Subscriber</th>
            <th className="px-5 py-3 font-medium">Plan</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 text-right font-medium">Paid</th>
            <th className="px-5 py-3 font-medium">Next charge</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s) => {
            const plan = planByKey.get(s.account.plan.toBase58());
            const next = s.account.nextChargeAt.toNumber();
            const paused = isPaused(s.account);
            const due = !paused && next <= now;
            const paid = plan ? BigInt(plan.amount.toString()) * BigInt(s.account.periodsPaid.toString()) : 0n;
            return (
              <tr key={s.publicKey.toBase58()} className="border-b border-line last:border-0">
                <td className="px-5 py-3">
                  <Address value={s.account.subscriber.toBase58()} />
                </td>
                <td className="px-5 py-3">{plan?.name ?? "—"}</td>
                <td className="px-5 py-3">
                  <Badge tone={paused ? "warn" : due ? "accent" : "ok"}>{paused ? "paused" : due ? "due" : "active"}</Badge>
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {formatUsdc(paid)} <span className="text-xs text-muted">({s.account.periodsPaid.toString()}×)</span>
                </td>
                <td className="px-5 py-3" title={formatDate(next)}>
                  {paused ? <span className="text-muted">—</span> : timeUntil(next, now)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
