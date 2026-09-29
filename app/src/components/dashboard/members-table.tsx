"use client";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common/status-badge";
import { PlanAvatar } from "@/components/plan/plan-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { effectivePrice, memberStatus, type Plan, type Subscription } from "@/lib/chain";
import { formatDate, formatDateTime, formatUsdc, shortAddress, timeUntil } from "@/lib/format";

export function MembersTable({
  subs,
  plans,
  now,
  showPlan = true,
}: {
  subs: Subscription[];
  plans: Plan[];
  now: number;
  showPlan?: boolean;
}) {
  const planByKey = new Map(plans.map((p) => [p.publicKey.toBase58(), p.account]));
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Member</TableHead>
            {showPlan && <TableHead>Plan</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Pays</TableHead>
            <TableHead className="text-right">Payments</TableHead>
            <TableHead>Next payment</TableHead>
            <TableHead className="pr-4">Community</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subs.map((s) => {
            const plan = planByKey.get(s.account.plan.toBase58());
            const status = memberStatus(s.account, now);
            const next = s.account.nextChargeAt.toNumber();
            const wallet = s.account.subscriber.toBase58();
            return (
              <TableRow key={s.publicKey.toBase58()}>
                <TableCell className="pl-4">
                  <button
                    className="group inline-flex items-center gap-1.5 font-mono text-xs"
                    onClick={() => {
                      void navigator.clipboard.writeText(wallet);
                      toast.success("Wallet address copied");
                    }}
                  >
                    {shortAddress(wallet)}
                    <CopyIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                  </button>
                  <div className="text-xs text-muted-foreground">since {formatDate(s.account.createdAt.toNumber())}</div>
                </TableCell>
                {showPlan && (
                  <TableCell>
                    {plan && (
                      <span className="flex items-center gap-2">
                        <PlanAvatar image={plan.image} name={plan.name} className="size-6 text-xs" />
                        <span className="truncate">{plan.name}</span>
                      </span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <StatusBadge status={status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{plan ? formatUsdc(effectivePrice(s.account, plan)) : "–"}</TableCell>
                <TableCell className="text-right tabular-nums">{s.account.periodsPaid.toString()}</TableCell>
                <TableCell title={formatDateTime(next)}>{status === "paused" ? "–" : timeUntil(next, now)}</TableCell>
                <TableCell className="pr-4 text-xs text-muted-foreground">Not linked</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
