"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { FaucetButton } from "@/components/FaucetButton";
import { LockIcon, UsersIcon } from "@/components/icons";
import { PlanCard } from "@/components/PlanCard";
import { Address, Badge, Button, Empty, Progress, ResultNotice, formatDate, timeUntil } from "@/components/ui";
import { formatUsdc, perInterval } from "@/lib/config";
import { usePoll, useProgram, useTx } from "@/lib/hooks";
import {
  type PlanAccount,
  type SubscriptionAccount,
  acceptPriceIx,
  effectivePrice,
  fetchUsdcAccount,
  isPaused,
  mandateRemaining,
  pendingIncrease,
  subscribeIxs,
  subscriptionPda,
} from "@/lib/monthly";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

const LIMITS = [3, 6, 12, 24];

export default function PlanPage() {
  const { plan: planParam } = useParams<{ plan: string }>();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useProgram();

  const planKey = useMemo(() => {
    try {
      return new PublicKey(planParam);
    } catch {
      return null;
    }
  }, [planParam]);
  const [plan, setPlan] = useState<PlanAccount | null | undefined>(undefined);
  const [sub, setSub] = useState<SubscriptionAccount | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [remaining, setRemaining] = useState<bigint>(0n);
  const [periods, setPeriods] = useState(12);
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    if (!planKey) return;
    const p = await program.account.plan.fetchNullable(planKey).catch(() => null);
    setPlan(p);
    setNow(Math.floor(Date.now() / 1000));
    if (!publicKey || !p) return;
    const [s, usdc] = await Promise.all([
      program.account.subscription.fetchNullable(subscriptionPda(planKey, publicKey)).catch(() => null),
      fetchUsdcAccount(connection, publicKey),
    ]);
    setSub(s);
    setBalance(usdc ? usdc.amount : null);
    setRemaining(mandateRemaining(usdc));
  }, [planKey, program, publicKey, connection]);

  usePoll(load, 10_000);
  const { busy, result, run } = useTx(load);

  if (!planKey || plan === null) return <Empty title="Plan not found">Check the link.</Empty>;
  if (plan === undefined) return <p className="py-10 text-center text-sm text-muted">Loading…</p>;

  const amount = BigInt(plan.amount.toString());
  const per = perInterval(plan.intervalSeconds.toNumber());
  const limit = remaining + amount * BigInt(periods);
  const canPay = balance !== null && balance >= amount;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        <PlanCard
          large
          plan={{ name: plan.name, image: plan.image, price: formatUsdc(amount), per }}
          badge={!plan.active ? <Badge tone="off">closed</Badge> : undefined}
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <UsersIcon size={15} /> {plan.subscriberCount.toString()} subscribers
          </span>
          <span className="inline-flex items-center gap-1.5">
            by <Address value={plan.merchant.toBase58()} />
          </span>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-5 rounded-3xl border border-line bg-panel p-6 shadow-sm">
          {!publicKey ? (
            <div className="space-y-4 py-4 text-center">
              <div className="text-lg font-semibold">Connect to subscribe</div>
              <div className="flex justify-center">
                <WalletMultiButton />
              </div>
              <div className="text-xs text-muted">Wallet on devnet</div>
            </div>
          ) : sub ? (
            <Subscribed
              sub={sub}
              plan={plan}
              now={now}
              busy={busy !== null}
              onAccept={() =>
                run(
                  "Accept",
                  async () => [
                    await acceptPriceIx(program, publicKey, planKey, subscriptionPda(planKey, publicKey)),
                  ],
                  "New price accepted.",
                )
              }
            />
          ) : !plan.active ? (
            <div className="py-6 text-center text-sm text-muted">This plan is closed.</div>
          ) : (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Spending limit</span>
                  <span className="text-muted">{formatUsdc(limit)} USDC max</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {LIMITS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriods(p)}
                      className={`rounded-xl border py-2.5 text-sm transition ${
                        periods === p ? "border-accent bg-accent/10 font-semibold text-accent" : "border-line hover:bg-panel-strong"
                      }`}
                    >
                      {p}×
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-2xl bg-panel-strong p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Today</span>
                  <span className="font-semibold">{formatUsdc(amount)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Then</span>
                  <span>
                    {formatUsdc(amount)} USDC {per}
                  </span>
                </div>
              </div>

              {canPay ? (
                <Button size="lg" className="w-full" onClick={() => run("Subscribe", async () => subscribeIxs(program, publicKey, planKey, plan, limit), "You're subscribed.")} disabled={busy !== null}>
                  {busy ? "Confirm in wallet…" : "Subscribe"}
                </Button>
              ) : (
                <div className="space-y-2 text-center">
                  <div className="text-sm text-muted">Not enough test USDC</div>
                  <FaucetButton variant="inline" onFunded={() => void load()} />
                </div>
              )}
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted">
                <LockIcon size={12} /> Cancel anytime · no increase without your OK
              </div>
            </>
          )}
          <ResultNotice result={result} />
        </div>
      </aside>
    </div>
  );
}

function Subscribed({
  sub,
  plan,
  now,
  busy,
  onAccept,
}: {
  sub: SubscriptionAccount;
  plan: PlanAccount;
  now: number;
  busy: boolean;
  onAccept: () => void;
}) {
  const next = sub.nextChargeAt.toNumber();
  const interval = plan.intervalSeconds.toNumber();
  const paused = isPaused(sub);
  const increase = pendingIncrease(sub, plan);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">Subscribed</span>
        <Badge tone={paused ? "warn" : "ok"}>{paused ? "paused" : "active"}</Badge>
      </div>
      <div className="rounded-2xl bg-panel-strong p-4">
        <div className="text-sm text-muted">You pay</div>
        <div className="text-3xl font-semibold">
          {formatUsdc(effectivePrice(sub, plan))} <span className="text-base font-normal text-muted">USDC {perInterval(interval)}</span>
        </div>
      </div>
      {!paused && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Next payment</span>
            <span title={formatDate(next)}>{timeUntil(next, now)}</span>
          </div>
          <Progress value={1 - (next - now) / interval} />
        </div>
      )}
      {increase !== null && (
        <div className="space-y-3 rounded-2xl border border-warn/40 bg-warn/5 p-4 text-sm">
          <div>
            New price: <span className="font-semibold">{formatUsdc(increase)} USDC</span>. You keep paying{" "}
            {formatUsdc(sub.agreedAmount)} until you accept.
          </div>
          <Button size="sm" variant="ghost" onClick={onAccept} disabled={busy}>
            Accept new price
          </Button>
        </div>
      )}
      <Link href="/me" className="block rounded-xl border border-line py-2.5 text-center text-sm hover:bg-panel-strong">
        Manage
      </Link>
    </div>
  );
}
