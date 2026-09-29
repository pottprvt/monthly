"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { SlowBanner } from "@/components/common/slow-banner";
import { StatusBadge } from "@/components/common/status-badge";
import { EditPlanDialog } from "@/components/dashboard/edit-plan-dialog";
import { MembersTable } from "@/components/dashboard/members-table";
import { CommunityConnections } from "@/components/plan/community-connections";
import { PlanAvatar } from "@/components/plan/plan-avatar";
import { ShareLink } from "@/components/plan/share-link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectGate } from "@/components/wallet/connect-gate";
import { useAutoCollect } from "@/hooks/use-auto-collect";
import { useCreatorData } from "@/hooks/use-creator-data";
import { refreshAccess } from "@/hooks/use-telegram";
import { useNow } from "@/hooks/use-now";
import { useProgram } from "@/hooks/use-program";
import { useTx } from "@/hooks/use-tx";
import { closePlanIx, memberStatus } from "@/lib/chain";
import { formatUsdc, perInterval } from "@/lib/format";

export default function PlanDetailPage() {
  return (
    <ConnectGate title="Plan details" description="Connect the wallet that owns this plan.">
      <PlanDetail />
    </ConnectGate>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-medium">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function PlanDetail() {
  const { plan: param } = useParams<{ plan: string }>();
  const { publicKey } = useWallet();
  const program = useProgram();
  const { busy, run } = useTx();
  const { loaded, failing, plans, subs } = useCreatorData();
  const now = useNow();
  const plan = plans.find((p) => p.publicKey.toBase58() === param);
  const due = !!plan?.account.active && subs.some((s) => s.account.plan.toBase58() === param && memberStatus(s.account, now) === "due");
  useAutoCollect(plan ? { plan: param } : null, due);

  if (!loaded) return <Skeleton className="h-96 rounded-xl" />;
  if (!plan) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Plan not found</EmptyTitle>
          <EmptyDescription>It doesn&apos;t exist or belongs to another wallet.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const a = plan.account;
  const members = subs.filter((s) => s.account.plan.equals(plan.publicKey));

  return (
    <div className="space-y-10">
      <div>
        <Link href="/dashboard/plans" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-3.5" /> Plans
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <PlanAvatar image={a.image} name={a.name} className="size-14 text-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
              {a.name} {!a.active && <StatusBadge status="closed" />}
            </h1>
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatUsdc(a.amount)} USDC {perInterval(a.intervalSeconds.toNumber())} · {members.length} members ·{" "}
              {formatUsdc(a.totalCollected)} USDC earned
            </p>
          </div>
          {a.active && (
            <div className="flex gap-2">
              <EditPlanDialog plan={plan} />
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() => {
                  if (!confirm(`Close “${a.name}”? No new members and no further payments.`)) return;
                  void run("close", async () => [await closePlanIx(program, publicKey!, plan.publicKey)], "Plan closed").then(
                    (ok) => ok && refreshAccess({ plan: plan.publicKey.toBase58() }),
                  );
                }}
              >
                Close plan
              </Button>
            </div>
          )}
        </div>
      </div>

      {failing && <SlowBanner />}

      {a.active && (
        <Section title="Checkout link" description="Share it anywhere. Members subscribe and join from here.">
          <ShareLink plan={plan.publicKey.toBase58()} />
        </Section>
      )}

      <Section title="Community" description="Where members get access while they pay.">
        <CommunityConnections plan={plan.publicKey.toBase58()} />
      </Section>

      <Section title="Members">
        {members.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No members yet. Share the checkout link.
          </p>
        ) : (
          <MembersTable subs={members} plans={plans} now={now} showPlan={false} />
        )}
      </Section>
    </div>
  );
}
