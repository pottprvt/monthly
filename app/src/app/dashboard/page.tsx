"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { AlarmClockIcon, CoinsIcon, PauseCircleIcon, PlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

import { SlowBanner } from "@/components/common/slow-banner";
import { MembersTable } from "@/components/dashboard/members-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { StatCard } from "@/components/dashboard/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectGate } from "@/components/wallet/connect-gate";
import { useAutoCollect } from "@/hooks/use-auto-collect";
import { useCreatorData } from "@/hooks/use-creator-data";
import { useNow } from "@/hooks/use-now";
import { memberStatus } from "@/lib/chain";
import { formatUsdc } from "@/lib/format";

export default function OverviewPage() {
  return (
    <ConnectGate title="Your creator dashboard" description="Connect the wallet that should receive payments.">
      <Overview />
    </ConnectGate>
  );
}

function Overview() {
  const { publicKey } = useWallet();
  const { loaded, failing, plans, subs } = useCreatorData();
  const now = useNow();
  const activePlans = new Set(plans.filter((p) => p.account.active).map((p) => p.publicKey.toBase58()));
  const due = subs.filter((s) => activePlans.has(s.account.plan.toBase58()) && memberStatus(s.account, now) === "due");
  useAutoCollect(publicKey ? { merchant: publicKey.toBase58() } : null, due.length > 0);

  if (!loaded) return <Skeleton className="h-96 rounded-xl" />;

  if (activePlans.size === 0 && subs.length === 0) {
    return (
      <>
        <PageHeader title="Overview" />
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyTitle>Create your first plan</EmptyTitle>
            <EmptyDescription>Set a price, connect your group and share the link. Takes two minutes.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/create" className={buttonVariants()}>
              <PlusIcon /> New plan
            </Link>
          </EmptyContent>
        </Empty>
      </>
    );
  }

  const statuses = subs.map((s) => memberStatus(s.account, now));
  const collected = plans.reduce((sum, p) => sum + BigInt(p.account.totalCollected.toString()), 0n);

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" description="Your plans at a glance." />
      {failing && <SlowBanner />}

      {subs.length === 0 && (
        <SetupChecklist
          items={[
            { label: "Create a plan", done: true },
            { label: "Connect your Telegram group", done: false, href: `/dashboard/plans/${plans[0].publicKey.toBase58()}` },
            { label: "Share your link and get your first member", done: false, href: `/dashboard/plans/${plans[0].publicKey.toBase58()}` },
          ]}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active members" value={String(statuses.filter((s) => s !== "paused").length)} icon={UsersIcon} />
        <StatCard label="Collected" value={`${formatUsdc(collected)} USDC`} icon={CoinsIcon} hint="All plans, all time" />
        <StatCard label="Due now" value={String(due.length)} icon={AlarmClockIcon} hint={due.length > 0 ? "Collecting…" : "Collected automatically"} />
        <StatCard label="Paused" value={String(statuses.filter((s) => s === "paused").length)} icon={PauseCircleIcon} hint="Payment failed" />
      </div>

      {subs.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Recent members</h2>
            <Link href="/dashboard/members" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          <MembersTable
            subs={[...subs].sort((a, b) => b.account.createdAt.cmp(a.account.createdAt)).slice(0, 5)}
            plans={plans}
            now={now}
          />
        </section>
      )}
    </div>
  );
}
