"use client";

import { ChevronRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { SlowBanner } from "@/components/common/slow-banner";
import { StatusBadge } from "@/components/common/status-badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { PlanAvatar } from "@/components/plan/plan-avatar";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectGate } from "@/components/wallet/connect-gate";
import { useCreatorData } from "@/hooks/use-creator-data";
import { formatUsdc, perInterval } from "@/lib/format";

export default function PlansPage() {
  return (
    <ConnectGate title="Your plans" description="Connect the wallet that owns your plans.">
      <Plans />
    </ConnectGate>
  );
}

function Plans() {
  const { loaded, failing, plans, subs } = useCreatorData();
  const newPlan = (
    <Link href="/create" className={buttonVariants()}>
      <PlusIcon /> New plan
    </Link>
  );

  return (
    <>
      <PageHeader title="Plans" description="What you sell and for how much." actions={newPlan} />
      {failing && (
        <div className="mb-6">
          <SlowBanner />
        </div>
      )}
      {!loaded ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : plans.length === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyTitle>No plans yet</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>{newPlan}</EmptyContent>
        </Empty>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {plans.map((p) => {
            const a = p.account;
            const members = subs.filter((s) => s.account.plan.equals(p.publicKey)).length;
            return (
              <li key={p.publicKey.toBase58()}>
                <Link href={`/dashboard/plans/${p.publicKey.toBase58()}`} className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50">
                  <PlanAvatar image={a.image} name={a.name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{a.name}</div>
                    <div className="text-sm text-muted-foreground tabular-nums">
                      {formatUsdc(a.amount)} USDC {perInterval(a.intervalSeconds.toNumber())}
                    </div>
                  </div>
                  <div className="hidden text-right text-sm sm:block">
                    <div className="tabular-nums">{members} members</div>
                    <div className="text-muted-foreground tabular-nums">{formatUsdc(a.totalCollected)} USDC earned</div>
                  </div>
                  {!a.active && <StatusBadge status="closed" />}
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
