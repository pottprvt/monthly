"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { MoreHorizontalIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";

import { SlowBanner } from "@/components/common/slow-banner";
import { StatusBadge } from "@/components/common/status-badge";
import { PlanAvatar } from "@/components/plan/plan-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectGate } from "@/components/wallet/connect-gate";
import { type Membership, useMemberData } from "@/hooks/use-member-data";
import { useProgram } from "@/hooks/use-program";
import { useTx } from "@/hooks/use-tx";
import {
  acceptPriceIx,
  cancelIx,
  effectivePrice,
  memberStatus,
  pendingIncrease,
  resumeIx,
  revokeSpendingLimitIx,
} from "@/lib/chain";
import { DEMO_PLAN } from "@/lib/config";
import { formatDateTime, formatUsdc, perInterval, timeUntil } from "@/lib/format";

export default function SubscriptionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">My subscriptions</h1>
      <p className="mt-1 text-sm text-muted-foreground">Everything this wallet pays for.</p>
      <div className="mt-8">
        <ConnectGate title="Connect your wallet" description="Use the wallet you subscribed with.">
          <SubscriptionList />
        </ConnectGate>
      </div>
    </div>
  );
}

function SubscriptionList() {
  const { publicKey } = useWallet();
  const program = useProgram();
  const { busy, run } = useTx();
  const { loaded, failing, memberships, balance, limitLeft, now } = useMemberData();

  if (!loaded) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <div className="space-y-6">
      {failing && <SlowBanner />}

      {memberships.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No subscriptions yet</EmptyTitle>
            <EmptyDescription>Open a link a creator shared with you, or try the demo.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={`/p/${DEMO_PLAN}`} className={buttonVariants({ variant: "outline" })}>
              Try the demo plan
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {memberships.map((m) => (
            <MembershipRow
              key={m.sub.publicKey.toBase58()}
              m={m}
              now={now}
              busy={busy !== null}
              onAccept={() =>
                run("accept", async () => [await acceptPriceIx(program, publicKey!, m.plan.publicKey, m.sub.publicKey)], "New price approved")
              }
              onResume={() => run("resume", async () => [await resumeIx(program, publicKey!, m.plan, m.sub)], "Subscription resumed")}
              onCancel={() => {
                if (!confirm(`Cancel ${m.plan.account.name}? No further payments will be taken.`)) return;
                void run("cancel", async () => [await cancelIx(program, publicKey!, m.plan.publicKey, m.sub.publicKey)], "Subscription cancelled");
              }}
            />
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 text-sm">
        <div className="flex items-start gap-3">
          <ShieldIcon className="mt-0.5 size-4 text-muted-foreground" />
          <div>
            <div className="font-medium">Spending limit: {formatUsdc(limitLeft)} USDC left</div>
            <div className="text-muted-foreground">
              Covers all your subscriptions. Wallet balance {balance === null ? "0" : formatUsdc(balance)} USDC.
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={limitLeft === 0n || busy !== null}
          onClick={() => {
            if (!confirm("Revoke your spending limit? All future payments stop until you approve again.")) return;
            void run("revoke", async () => [revokeSpendingLimitIx(publicKey!)], "Spending limit revoked");
          }}
        >
          Revoke
        </Button>
      </div>
    </div>
  );
}

function MembershipRow({
  m,
  now,
  busy,
  onAccept,
  onResume,
  onCancel,
}: {
  m: Membership;
  now: number;
  busy: boolean;
  onAccept: () => void;
  onResume: () => void;
  onCancel: () => void;
}) {
  const plan = m.plan.account;
  const sub = m.sub.account;
  const interval = plan.intervalSeconds.toNumber();
  const next = sub.nextChargeAt.toNumber();
  const status = plan.active ? memberStatus(sub, now) : "closed";
  const increase = plan.active ? pendingIncrease(sub, plan) : null;

  return (
    <li className="space-y-4 p-5">
      <div className="flex items-center gap-4">
        <PlanAvatar image={plan.image} name={plan.name} />
        <div className="min-w-0 flex-1">
          <Link href={`/p/${m.plan.publicKey.toBase58()}`} className="font-medium hover:underline">
            {plan.name}
          </Link>
          <div className="text-sm text-muted-foreground tabular-nums">
            {formatUsdc(effectivePrice(sub, plan))} USDC {perInterval(interval)}
          </div>
        </div>
        <StatusBadge status={status} />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" disabled={busy} />}>
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {status === "paused" && <DropdownMenuItem onClick={onResume}>Resume and pay now</DropdownMenuItem>}
            <DropdownMenuItem variant="destructive" onClick={onCancel}>
              Cancel subscription
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(status === "active" || status === "due") && (
        <div className="space-y-1.5 pl-14">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Next payment</span>
            <span title={formatDateTime(next)}>{timeUntil(next, now)}</span>
          </div>
          <Progress value={Math.min(100, Math.max(0, (1 - (next - now) / interval) * 100))} />
        </div>
      )}

      {increase !== null && (
        <div className="ml-14 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning/10 px-3 py-2 text-sm">
          <span>
            New price {formatUsdc(increase)} USDC. You pay {formatUsdc(sub.agreedAmount)} until you approve.
          </span>
          <Button size="sm" variant="outline" onClick={onAccept} disabled={busy}>
            Approve
          </Button>
        </div>
      )}
      {status === "paused" && (
        <div className="ml-14 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">A payment could not be collected.</span>
          <Button size="sm" onClick={onResume} disabled={busy}>
            Resume
          </Button>
        </div>
      )}
    </li>
  );
}
