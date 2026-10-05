"use client";

import { CopyIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/common/status-badge";
import { PlanAvatar } from "@/components/plan/plan-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { effectivePrice, memberStatus, type Plan, type Subscription } from "@/lib/chain";
import { copyText } from "@/lib/clipboard";
import { formatDate, formatDateTime, formatUsdc, shortAddress, timeUntil } from "@/lib/format";

const ACCESS: Record<string, { label: string; className: string }> = {
  granted: { label: "In group", className: "text-success" },
  pending: { label: "Invited", className: "text-foreground" },
  revoked: { label: "Removed", className: "text-muted-foreground" },
};

/** Telegram access state per subscription for the given plans, refreshed every 10 s (joins and removals happen in Telegram). */
function useAccessStates(planKeys: string[]): Record<string, string> {
  const [states, setStates] = useState<Record<string, string>>({});
  const key = planKeys.join(",");
  useEffect(() => {
    let active = true;
    const load = () =>
      Promise.all(
        key.split(",").filter(Boolean).map((plan) =>
          fetch(`/api/integrations/telegram/members?plan=${plan}`)
            .then((r) => r.json() as Promise<Record<string, string>>)
            .catch(() => ({})),
        ),
      ).then((maps) => active && setStates(Object.assign({}, ...maps)));
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [key]);
  return states;
}

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
  const planKeys = useMemo(() => [...new Set(subs.map((s) => s.account.plan.toBase58()))].sort(), [subs]);
  const access = useAccessStates(planKeys);
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
                    onClick={() => void copyText(wallet, "Wallet address copied")}
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
                <TableCell className={`pr-4 text-xs ${ACCESS[access[s.publicKey.toBase58()]]?.className ?? "text-muted-foreground"}`}>
                  {ACCESS[access[s.publicKey.toBase58()]]?.label ?? "Not linked"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
