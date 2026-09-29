"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { ConnectPrompt } from "@/components/ConnectPrompt";
import {
  Address,
  Badge,
  Button,
  Card,
  Empty,
  Notice,
  PageHeader,
  Progress,
  ResultNotice,
  Stat,
  formatDate,
  timeUntil,
} from "@/components/ui";
import { formatUsdc, intervalLabel } from "@/lib/config";
import { DEMO_PLAN } from "@/lib/demo";
import { usePoll, useProgram, useTx } from "@/lib/hooks";
import {
  type Keyed,
  type PlanAccount,
  type SubscriptionAccount,
  cancelIx,
  fetchSubscriptionsBySubscriber,
  fetchUsdcAccount,
  isPaused,
  mandateRemaining,
  resumeIx,
  revokeMandateIx,
} from "@/lib/monthly";

type Row = { sub: Keyed<SubscriptionAccount>; plan: Keyed<PlanAccount> | null };

export default function MePage() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useProgram();

  const [loaded, setLoaded] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [remaining, setRemaining] = useState<bigint>(0n);
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    if (!publicKey) return;
    const [subs, usdc] = await Promise.all([
      fetchSubscriptionsBySubscriber(program, publicKey),
      fetchUsdcAccount(connection, publicKey),
    ]);
    const plans = await program.account.plan.fetchMultiple(subs.map((s) => s.account.plan));
    const list = subs.map((sub, i) => ({
      sub,
      plan: plans[i] ? { publicKey: sub.account.plan, account: plans[i]! } : null,
    }));
    list.sort((a, b) => a.sub.account.nextChargeAt.cmp(b.sub.account.nextChargeAt));
    setRows(list);
    setBalance(usdc ? usdc.amount : null);
    setRemaining(mandateRemaining(usdc));
    setNow(Math.floor(Date.now() / 1000));
    setLoaded(true);
  }, [program, publicKey, connection]);

  usePoll(load, 15_000);
  const { busy, result, run } = useTx(load);

  if (!publicKey) {
    return (
      <ConnectPrompt
        title="My subscriptions"
        text="Connect the wallet you subscribed with to see what you pay for, when the next payment is due, and to cancel."
      />
    );
  }

  const monthlyTotal = rows.reduce((sum, r) => {
    if (!r.plan || isPaused(r.sub.account) || !r.plan.account.active) return sum;
    const perSecond = Number(r.plan.account.amount.toString()) / r.plan.account.intervalSeconds.toNumber();
    return sum + perSecond * 30 * 86400;
  }, 0);

  return (
    <div className="space-y-8">
      <PageHeader title="My subscriptions" subtitle="Everything this wallet pays for, and the mandate behind it." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Subscriptions" value={rows.length} hint={`${rows.filter((r) => isPaused(r.sub.account)).length} paused`} />
        <Stat
          label="Mandate left"
          value={formatUsdc(remaining)}
          hint="USDC Monthly may still pull"
        />
        <Stat label="Wallet balance" value={balance === null ? "—" : formatUsdc(balance)} hint="test USDC" />
      </div>

      {rows.length > 0 && remaining === 0n && (
        <Notice tone="info">
          No mandate left: upcoming payments will fail and pause after three days. Open a plan page to approve a new
          ceiling.
        </Notice>
      )}
      <ResultNotice result={result} />

      {!loaded ? (
        <p className="py-10 text-center text-sm text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <Empty title="No subscriptions yet">
          <p>
            Try the{" "}
            <Link className="text-accent underline" href={`/p/${DEMO_PLAN}`}>
              demo plan
            </Link>{" "}
            or open a link a merchant shared with you.
          </p>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(({ sub, plan }) => {
            const next = sub.account.nextChargeAt.toNumber();
            const paused = isPaused(sub.account);
            const closed = plan !== null && !plan.account.active;
            const interval = plan?.account.intervalSeconds.toNumber() ?? 1;
            return (
              <Card key={sub.publicKey.toBase58()} className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/p/${sub.account.plan.toBase58()}`} className="font-semibold hover:underline">
                      {plan?.account.name ?? "Unknown plan"}
                    </Link>
                    {plan && (
                      <div className="text-sm text-muted">
                        {formatUsdc(plan.account.amount.toString())} USDC {intervalLabel(interval)}
                      </div>
                    )}
                  </div>
                  <Badge tone={paused ? "warn" : closed ? "off" : "ok"}>
                    {paused ? "paused" : closed ? "plan closed" : "active"}
                  </Badge>
                </div>

                {!paused && !closed && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Next payment</span>
                      <span title={formatDate(next)}>{timeUntil(next, now)}</span>
                    </div>
                    <Progress value={1 - (next - now) / interval} />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{sub.account.periodsPaid.toString()} paid</span>
                  <span>
                    Merchant <Address value={plan?.account.merchant.toBase58() ?? sub.account.plan.toBase58()} />
                  </span>
                </div>

                <div className="flex gap-2 border-t border-line pt-4">
                  {paused && plan?.account.active && (
                    <Button
                      size="sm"
                      disabled={busy !== null}
                      onClick={() =>
                        run("Resume", async () => [await resumeIx(program, publicKey, plan, sub)], "Resumed and paid.")
                      }
                    >
                      Resume and pay now
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy !== null}
                    onClick={() => {
                      if (!confirm(`Cancel ${plan?.account.name ?? "this subscription"}? No further payments will be taken.`)) return;
                      void run(
                        "Cancel",
                        async () => [await cancelIx(program, publicKey, sub.account.plan, sub.publicKey)],
                        "Subscription cancelled.",
                      );
                    }}
                  >
                    Cancel subscription
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-medium">Mandate</h2>
            <p className="text-sm text-muted">
              One mandate covers all your Monthly subscriptions
              {monthlyTotal > 0 ? `, currently about ${formatUsdc(BigInt(Math.round(monthlyTotal)))} USDC per 30 days` : ""}.
              Revoking it stops every future payment at once.
            </p>
          </div>
          <Button
            variant="danger"
            disabled={remaining === 0n || busy !== null}
            onClick={() => {
              if (!confirm("Revoke the mandate? All future payments will fail until you approve again.")) return;
              void run("Revoke", async () => [revokeMandateIx(publicKey)], "Mandate revoked.");
            }}
          >
            Revoke mandate
          </Button>
        </div>
      </Card>
    </div>
  );
}
