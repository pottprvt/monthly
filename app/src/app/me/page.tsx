"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { ConnectPrompt } from "@/components/ConnectPrompt";
import { ArrowDownIcon, CoinsIcon, LockIcon, ShieldIcon, WalletIcon } from "@/components/icons";
import { PlanAvatar } from "@/components/PlanAvatar";
import { Badge, Button, Card, Empty, Progress, ResultNotice, SlowNotice, formatDate, timeUntil } from "@/components/ui";
import { formatUsdc, perInterval } from "@/lib/config";
import { DEMO_PLAN } from "@/lib/demo";
import { usePoll, useProgram, useTx } from "@/lib/hooks";
import {
  type Keyed,
  type PlanAccount,
  type SubscriptionAccount,
  acceptPriceIx,
  cancelIx,
  effectivePrice,
  fetchSubscriptionsBySubscriber,
  fetchUsdcAccount,
  isPaused,
  mandateRemaining,
  pendingIncrease,
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
    const plans = subs.length === 0 ? [] : await program.account.plan.fetchMultiple(subs.map((s) => s.account.plan));
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

  const failing = usePoll(load);
  const { busy, result, run } = useTx(load);

  if (!publicKey) return <ConnectPrompt title="My subscriptions" text="Connect the wallet you subscribed with." />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My subscriptions</h1>
        <div className="flex gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2">
            <WalletIcon size={16} className="text-muted" /> {balance === null ? "—" : formatUsdc(balance)} USDC
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2" title="Spending limit left">
            <ShieldIcon size={16} className="text-muted" /> {formatUsdc(remaining)} USDC limit left
          </span>
        </div>
      </div>

      {failing && <SlowNotice />}
      <ResultNotice result={result} />

      {!loaded ? (
        <p className="py-10 text-center text-sm text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <Empty title="No subscriptions yet">
          <Link className="text-accent underline" href={`/p/${DEMO_PLAN}`}>
            Try the demo plan
          </Link>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ sub, plan }) => {
            if (!plan) return null;
            const a = plan.account;
            const next = sub.account.nextChargeAt.toNumber();
            const interval = a.intervalSeconds.toNumber();
            const paused = isPaused(sub.account);
            const closed = !a.active;
            const increase = pendingIncrease(sub.account, a);
            const pays = effectivePrice(sub.account, a);
            const lowered = pays < BigInt(sub.account.agreedAmount.toString());
            return (
              <Card key={sub.publicKey.toBase58()} className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <Link href={`/p/${plan.publicKey.toBase58()}`} className="flex items-center gap-3">
                    <PlanAvatar image={a.image} name={a.name} size={44} />
                    <div>
                      <div className="font-semibold hover:underline">{a.name}</div>
                      <div className="text-sm text-muted">
                        {formatUsdc(pays)} USDC {perInterval(interval)}
                      </div>
                    </div>
                  </Link>
                  <Badge tone={paused ? "warn" : closed ? "off" : "ok"}>
                    {paused ? "paused" : closed ? "ended" : "active"}
                  </Badge>
                </div>

                {!paused && !closed && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Next payment</span>
                      <span title={formatDate(next)}>{timeUntil(next, now)}</span>
                    </div>
                    <Progress value={1 - (next - now) / interval} />
                  </div>
                )}

                {lowered && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-accent">
                    <ArrowDownIcon size={13} /> Price lowered by the merchant
                  </div>
                )}
                {increase !== null && !closed && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-warn/40 bg-warn/5 px-3 py-2 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <LockIcon size={13} className="text-warn" /> New price {formatUsdc(increase)}
                    </span>
                    <button
                      className="font-medium text-accent hover:underline"
                      disabled={busy !== null}
                      onClick={() =>
                        run("Accept", async () => [await acceptPriceIx(program, publicKey, plan.publicKey, sub.publicKey)], "New price accepted.")
                      }
                    >
                      Accept
                    </button>
                  </div>
                )}

                <div className="mt-auto flex items-center gap-2 border-t border-line pt-4 text-xs text-muted">
                  <CoinsIcon size={14} /> {sub.account.periodsPaid.toString()} paid
                  <span className="ml-auto flex gap-2">
                    {paused && !closed && (
                      <Button
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => run("Resume", async () => [await resumeIx(program, publicKey, plan, sub)], "Resumed.")}
                      >
                        Resume
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy !== null}
                      onClick={() => {
                        if (!confirm(`Cancel ${a.name}?`)) return;
                        void run(
                          "Cancel",
                          async () => [await cancelIx(program, publicKey, plan.publicKey, sub.publicKey)],
                          "Cancelled.",
                        );
                      }}
                    >
                      Cancel
                    </Button>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {remaining > 0n && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-5 py-4 text-sm">
          <span className="inline-flex items-center gap-2 text-muted">
            <ShieldIcon size={16} /> Your spending limit covers all Monthly subscriptions.
          </span>
          <Button
            size="sm"
            variant="danger"
            disabled={busy !== null}
            onClick={() => {
              if (!confirm("Revoke your spending limit? All future payments stop.")) return;
              void run("Revoke", async () => [revokeMandateIx(publicKey)], "Spending limit revoked.");
            }}
          >
            Revoke limit
          </Button>
        </div>
      )}
    </div>
  );
}
