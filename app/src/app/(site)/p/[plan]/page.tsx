"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { UsersIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

import { JoinTelegram } from "@/components/checkout/join-telegram";
import { SubscribeStep } from "@/components/checkout/subscribe-step";
import { SlowBanner } from "@/components/common/slow-banner";
import { StatusBadge } from "@/components/common/status-badge";
import { Step } from "@/components/common/step";
import { PlanCard } from "@/components/plan/plan-card";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useAutoCollect } from "@/hooks/use-auto-collect";
import { useCheckoutData } from "@/hooks/use-checkout-data";
import { useNow } from "@/hooks/use-now";
import { effectivePrice, memberStatus, pendingIncrease } from "@/lib/chain";
import { formatDateTime, formatUsdc, perInterval, shortAddress, timeUntil } from "@/lib/format";

export default function CheckoutPage() {
  const { publicKey } = useWallet();
  // Keyed by wallet so nothing from a previously connected account is shown.
  return <Checkout key={publicKey?.toBase58() ?? "none"} />;
}

function Checkout() {
  const { plan: param } = useParams<{ plan: string }>();
  const planKey = useMemo(() => {
    try {
      return new PublicKey(param);
    } catch {
      return null;
    }
  }, [param]);
  const { publicKey } = useWallet();
  const { plan, sub, balance, sol, limitLeft, failing } = useCheckoutData(planKey);
  const now = useNow();
  const due = !!plan?.active && !!sub && memberStatus(sub, now) === "due";
  useAutoCollect(publicKey && planKey ? { plan: planKey.toBase58(), subscriber: publicKey.toBase58() } : null, due);

  if (!planKey || plan === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-24">
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Plan not found</EmptyTitle>
            <EmptyDescription>It may have been deleted. Check the link you were given.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Back to Monthly
            </Link>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {failing && (
        <div className="mb-6">
          <SlowBanner />
        </div>
      )}
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {plan === undefined ? (
            <Skeleton className="h-72 rounded-2xl" />
          ) : (
            <>
              <PlanCard
                plan={{
                  name: plan.name,
                  image: plan.image,
                  price: formatUsdc(plan.amount),
                  per: perInterval(plan.intervalSeconds.toNumber()),
                  by: shortAddress(plan.merchant.toBase58()),
                }}
              />
              <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
                <UsersIcon className="size-4" /> {plan.subscriberCount.toString()} members
                {!plan.active && <StatusBadge status="closed" className="ml-auto" />}
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-6">
          {plan === undefined ? (
            <Skeleton className="h-64" />
          ) : sub ? (
            <SubscribedPanel
              plan={planKey.toBase58()}
              status={memberStatus(sub, now)}
              pays={formatUsdc(effectivePrice(sub, plan))}
              per={perInterval(plan.intervalSeconds.toNumber())}
              next={sub.nextChargeAt.toNumber()}
              now={now}
              increase={pendingIncrease(sub, plan)}
            />
          ) : !plan.active ? (
            <p className="py-8 text-center text-sm text-muted-foreground">This plan is closed to new members.</p>
          ) : (
            <>
              <Step n={1} title="Connect your wallet" state={publicKey ? "done" : "current"}>
                <WalletButton />
              </Step>
              <Step n={2} title="Approve and pay" state={publicKey ? "current" : "upcoming"}>
                {publicKey && (
                  <SubscribeStep planKey={planKey} plan={plan} subscriber={publicKey} balance={balance} sol={sol} limitLeft={limitLeft} />
                )}
              </Step>
              <Step n={3} title="Join the community" state="upcoming" last />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SubscribedPanel({
  plan,
  status,
  pays,
  per,
  next,
  now,
  increase,
}: {
  plan: string;
  status: ReturnType<typeof memberStatus>;
  pays: string;
  per: string;
  next: number;
  now: number;
  increase: bigint | null;
}) {
  return (
    <div>
      <Step n={1} title="Wallet connected" state="done" />
      <Step n={2} title="Subscribed" state="done" />
      <Step n={3} title="Join the community" state="current" last>
        <JoinTelegram plan={plan} />
      </Step>
      <div className="mt-6 space-y-3 border-t pt-5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">You pay</span>
          <span className="font-medium tabular-nums">
            {pays} USDC {per}
          </span>
        </div>
        {status !== "paused" && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Next payment</span>
            <span title={formatDateTime(next)}>{timeUntil(next, now)}</span>
          </div>
        )}
        {increase !== null && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-warning">
            New price {formatUsdc(increase)} USDC waits for your approval.
          </p>
        )}
        <Link href="/subscriptions" className={buttonVariants({ variant: "outline", className: "w-full" })}>
          Manage subscription
        </Link>
      </div>
    </div>
  );
}
