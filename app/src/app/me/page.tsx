"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";

import {
  Address,
  Badge,
  Button,
  Card,
  Empty,
  InlineLink,
  Notice,
  TxLink,
  formatDate,
  timeUntil,
} from "@/components/ui";
import { formatUsdc, intervalLabel } from "@/lib/config";
import { usePoll, useProgram } from "@/lib/hooks";
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
  toTx,
} from "@/lib/monthly";

type Row = { sub: Keyed<SubscriptionAccount>; plan: Keyed<PlanAccount> | null };

export default function MePage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const program = useProgram();

  const [rows, setRows] = useState<Row[]>([]);
  const [now, setNow] = useState(0);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [remaining, setRemaining] = useState<bigint>(0n);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);

  const load = useCallback(async () => {
    if (!publicKey) return;
    const [subs, usdc] = await Promise.all([
      fetchSubscriptionsBySubscriber(program, publicKey),
      fetchUsdcAccount(connection, publicKey),
    ]);
    const plans = await program.account.plan.fetchMultiple(subs.map((s) => s.account.plan));
    setRows(
      subs.map((sub, i) => ({
        sub,
        plan: plans[i] ? { publicKey: sub.account.plan, account: plans[i] } : null,
      })),
    );
    setBalance(usdc ? usdc.amount : null);
    setRemaining(mandateRemaining(usdc));
    setNow(Math.floor(Date.now() / 1000));
  }, [program, publicKey, connection]);

  usePoll(load, 15_000);

  async function run(label: string, build: () => Promise<Parameters<typeof toTx>[0]>) {
    if (!publicKey) return;
    setBusy(label);
    setResult(null);
    try {
      const ixs = await build();
      const sig = await sendTransaction(toTx(ixs, publicKey), connection);
      await connection.confirmTransaction(sig, "confirmed");
      setResult({ ok: true, text: `${label} done.`, sig });
      await load();
    } catch (err) {
      setResult({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  if (!publicKey) return <Empty>Connect a wallet to see your subscriptions.</Empty>;

  const activeCount = rows.length;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Mandate</h1>
            <p className="text-sm text-muted">
              {remaining > 0n
                ? `Monthly may still pull up to ${formatUsdc(remaining)} USDC across all your plans.`
                : "No mandate approved. Subscribing to a plan creates one."}
              {balance !== null && ` Wallet balance ${formatUsdc(balance)} USDC.`}
            </p>
          </div>
          <Button
            variant="danger"
            disabled={remaining === 0n || busy !== null}
            onClick={() =>
              run("Revoke mandate", async () => [revokeMandateIx(publicKey)])
            }
            title={activeCount > 0 ? "Charges for your subscriptions will stop until you re-approve" : undefined}
          >
            Revoke mandate
          </Button>
        </div>
        {activeCount > 0 && remaining === 0n && (
          <div className="mt-3">
            <Notice tone="info">
              You have subscriptions but no mandate: the next charge will fail and the subscription
              will pause after the grace period. Re-subscribing is not needed; approve again from the
              plan page of any subscription.
            </Notice>
          </div>
        )}
      </Card>

      {result && (
        <Notice tone={result.ok ? "ok" : "error"}>
          {result.text} {result.sig && <TxLink sig={result.sig} />}
        </Notice>
      )}

      <h2 className="text-lg font-semibold">Subscriptions</h2>
      {rows.length === 0 && <Empty>No subscriptions. Open a plan link to subscribe.</Empty>}
      {rows.map(({ sub, plan }) => {
        const next = sub.account.nextChargeAt.toNumber();
        const paused = isPaused(sub.account);
        const key = sub.publicKey.toBase58();
        return (
          <Card key={key}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{plan?.account.name ?? "Unknown plan"}</h3>
                  <Badge tone={paused ? "warn" : plan && !plan.account.active ? "off" : "ok"}>
                    {paused ? "paused" : plan && !plan.account.active ? "plan closed" : "active"}
                  </Badge>
                </div>
                {plan && (
                  <div className="text-sm text-muted">
                    {formatUsdc(plan.account.amount.toString())} USDC{" "}
                    {intervalLabel(plan.account.intervalSeconds.toNumber())} · paid{" "}
                    {sub.account.periodsPaid.toString()} period
                    {sub.account.periodsPaid.eqn(1) ? "" : "s"} ·{" "}
                    {paused
                      ? "no charges until resumed"
                      : next <= now
                        ? "charge due now"
                        : `next charge ${timeUntil(next)} (${formatDate(next)})`}
                  </div>
                )}
                <div className="mt-1 flex gap-3 text-xs">
                  <Address value={sub.account.plan.toBase58()} />
                  {plan && <InlineLink href={`/p/${sub.account.plan.toBase58()}`}>plan page</InlineLink>}
                </div>
              </div>
              <div className="flex gap-2">
                {paused && plan?.account.active && (
                  <Button
                    disabled={busy !== null}
                    onClick={() =>
                      run("Resume", async () => [await resumeIx(program, publicKey, plan, sub)])
                    }
                  >
                    {busy === "Resume" ? "Resuming…" : "Resume (pay now)"}
                  </Button>
                )}
                <Button
                  variant="danger"
                  disabled={busy !== null}
                  onClick={() =>
                    run("Cancel", async () => [
                      await cancelIx(program, publicKey, sub.account.plan, sub.publicKey),
                    ])
                  }
                >
                  {busy === "Cancel" ? "Cancelling…" : "Cancel"}
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
