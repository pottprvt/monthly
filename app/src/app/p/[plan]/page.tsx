"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { FaucetButton } from "@/components/FaucetButton";
import { Address, Badge, Button, Card, Empty, Progress, ResultNotice, formatDate, timeUntil } from "@/components/ui";
import { formatUsdc, intervalLabel } from "@/lib/config";
import { usePoll, useProgram, useTx } from "@/lib/hooks";
import {
  type PlanAccount,
  type SubscriptionAccount,
  fetchUsdcAccount,
  isPaused,
  mandateRemaining,
  subscribeIxs,
  subscriptionPda,
} from "@/lib/monthly";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

const PERIOD_PRESETS = [3, 6, 12, 24];

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
    const p = await program.account.plan.fetchNullable(planKey);
    setPlan(p);
    setNow(Math.floor(Date.now() / 1000));
    if (!publicKey || !p) return;
    const [s, usdc] = await Promise.all([
      program.account.subscription.fetchNullable(subscriptionPda(planKey, publicKey)),
      fetchUsdcAccount(connection, publicKey),
    ]);
    setSub(s);
    setBalance(usdc ? usdc.amount : null);
    setRemaining(mandateRemaining(usdc));
  }, [planKey, program, publicKey, connection]);

  usePoll(load, 15_000);
  const { busy, result, run } = useTx(load);

  if (!planKey || plan === null) return <Empty title="Plan not found">Check the link you were given.</Empty>;
  if (plan === undefined) return <p className="py-10 text-center text-sm text-muted">Loading plan…</p>;

  const amount = BigInt(plan.amount.toString());
  const interval = plan.intervalSeconds.toNumber();
  const ceiling = remaining + amount * BigInt(periods);
  const canPay = balance !== null && balance >= amount;

  async function subscribe() {
    if (!publicKey || !plan || !planKey) return;
    await run(
      "Subscribe",
      async () => subscribeIxs(program, publicKey, planKey, plan, ceiling),
      "Subscribed. The first period is paid.",
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge tone={plan.active ? "ok" : "off"}>{plan.active ? "open for subscriptions" : "closed"}</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{plan.name}</h1>
          <p className="mt-1 text-lg text-muted">
            <span className="font-medium text-fg">{formatUsdc(amount)} USDC</span> {intervalLabel(interval)}
          </p>
        </div>

        <Card>
          <h2 className="mb-3 font-medium">What you agree to</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-3">
              <span className="text-ok">✓</span>
              <span>
                {formatUsdc(amount)} USDC now, then {formatUsdc(amount)} USDC {intervalLabel(interval)}.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-ok">✓</span>
              <span>Payments stay in your wallet until they are due. Nothing is prepaid.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ok">✓</span>
              <span>The program can never take more than your ceiling, and never more than once per period.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-ok">✓</span>
              <span>Cancel any time here, or revoke the mandate in any Solana wallet.</span>
            </li>
          </ul>
        </Card>

        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-line bg-panel px-4 py-3">
            <dt className="text-xs text-muted">Merchant</dt>
            <dd className="mt-1">
              <Address value={plan.merchant.toBase58()} />
            </dd>
          </div>
          <div className="rounded-xl border border-line bg-panel px-4 py-3">
            <dt className="text-xs text-muted">Subscribers</dt>
            <dd className="mt-1 font-medium">{plan.subscriberCount.toString()}</dd>
          </div>
          <div className="rounded-xl border border-line bg-panel px-4 py-3">
            <dt className="text-xs text-muted">Plan account</dt>
            <dd className="mt-1">
              <Address value={planParam} />
            </dd>
          </div>
        </dl>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="space-y-5 p-6">
          {!publicKey ? (
            <div className="space-y-4 text-center">
              <h2 className="text-lg font-semibold">Subscribe</h2>
              <p className="text-sm text-muted">Connect a devnet wallet to continue.</p>
              <div className="flex justify-center">
                <WalletMultiButton />
              </div>
            </div>
          ) : sub ? (
            <SubscribedPanel sub={sub} interval={interval} now={now} />
          ) : !plan.active ? (
            <p className="text-sm text-muted">This plan no longer accepts subscriptions.</p>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Subscribe</h2>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">1. Spending ceiling</span>
                  <span className="text-muted">{periods} periods</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {PERIOD_PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriods(p)}
                      className={`rounded-lg border px-2 py-2 text-sm transition ${
                        periods === p ? "border-accent bg-accent/10 font-medium text-accent" : "border-line hover:bg-panel-strong"
                      }`}
                    >
                      {p}×
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted">
                  Monthly may pull at most <span className="text-fg">{formatUsdc(ceiling)} USDC</span> in total
                  {remaining > 0n ? `, including ${formatUsdc(remaining)} USDC already approved for your other plans` : ""}.
                  Top it up or revoke it any time.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">2. Approve and pay the first period</div>
                <div className="flex items-center justify-between rounded-lg bg-panel-strong px-3 py-2 text-sm">
                  <span>Due today</span>
                  <span className="font-semibold">{formatUsdc(amount)} USDC</span>
                </div>
                <Button size="lg" className="w-full" onClick={subscribe} disabled={busy !== null || !canPay}>
                  {busy ? "Confirm in your wallet…" : `Approve & pay ${formatUsdc(amount)} USDC`}
                </Button>
                <p className="text-center text-xs text-muted">One signature: mandate and first payment together.</p>
              </div>

              <div className="flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
                <span>Wallet balance: {balance === null ? "no test USDC yet" : `${formatUsdc(balance)} USDC`}</span>
                {!canPay && <FaucetButton variant="inline" onFunded={() => void load()} />}
              </div>
            </>
          )}
          <ResultNotice result={result} />
        </Card>
      </aside>
    </div>
  );
}

function SubscribedPanel({ sub, interval, now }: { sub: SubscriptionAccount; interval: number; now: number }) {
  const next = sub.nextChargeAt.toNumber();
  const paused = isPaused(sub);
  const elapsed = 1 - (next - now) / interval;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">You are subscribed</h2>
        <Badge tone={paused ? "warn" : "ok"}>{paused ? "paused" : "active"}</Badge>
      </div>
      {paused ? (
        <p className="text-sm text-muted">The last payment could not be collected. Resume it under My subscriptions.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Next payment</span>
            <span className="font-medium" title={formatDate(next)}>
              {timeUntil(next, now)}
            </span>
          </div>
          <Progress value={elapsed} />
        </div>
      )}
      <div className="text-sm text-muted">
        {sub.periodsPaid.toString()} period{sub.periodsPaid.eqn(1) ? "" : "s"} paid so far.
      </div>
      <Link
        href="/me"
        className="block rounded-lg border border-line px-4 py-2 text-center text-sm hover:bg-panel-strong"
      >
        Manage in My subscriptions
      </Link>
    </div>
  );
}
